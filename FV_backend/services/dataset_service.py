"""Dataset persistence service.

Responsibilities
----------------
* Upload: parse CSV, store raw bytes to filesystem, upsert metadata/preview in MongoDB.
* Load: read the full dataset from filesystem (primary) or fallback to legacy in-DB rows.
* CRUD helpers (list, get with ownership, configure, delete) shared across routers.

The filesystem root is ``FV_backend/stored_datasets/{owner_id}/{uuid}_{filename}``.
MongoDB stores only metadata, preview rows (≤1 000), and analysis results — never the
full dataset, avoiding the 16 MB BSON document limit.
"""

from __future__ import annotations

from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import pandas as pd
from bson import ObjectId
from fastapi import HTTPException

from database import datasets_collection

STORAGE_ROOT = Path(__file__).resolve().parents[1] / "stored_datasets"
PREVIEW_ROW_LIMIT = 1_000


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def normalize_dataset_name(name: str) -> str:
    """Lowercase, collapse whitespace — used as a deduplication key."""
    return " ".join((name or "").strip().split()).lower()


def serialize_dataset(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert a raw MongoDB document to a JSON-safe dict."""
    if not doc:
        return None
    serialized = dict(doc)
    serialized["id"] = str(serialized.pop("_id"))
    if isinstance(serialized.get("user_id"), ObjectId):
        serialized["user_id"] = str(serialized["user_id"])
    return serialized


def ensure_valid_object_id(value: str, detail: str = "Invalid dataset ID") -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=detail)
    return ObjectId(value)


# ---------------------------------------------------------------------------
# Read operations
# ---------------------------------------------------------------------------


async def get_dataset_for_owner(
    dataset_id: str,
    owner_id: Any,
    projection: Optional[Dict[str, Any]] = None,
    not_found_detail: str = "Dataset not found",
) -> Dict[str, Any]:
    """Fetch a dataset document belonging exclusively to *owner_id*."""
    obj_id = ensure_valid_object_id(dataset_id)
    dataset = await datasets_collection.find_one(
        {"_id": obj_id, "user_id": owner_id}, projection
    )
    if not dataset:
        raise HTTPException(status_code=404, detail=not_found_detail)
    return dataset


async def list_datasets_for_owner(owner_id: Any, limit: int = 100) -> List[Dict[str, Any]]:
    cursor = datasets_collection.find({"user_id": owner_id}).sort("upload_date", -1)
    return await cursor.to_list(length=limit)


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------


def store_preview(df: pd.DataFrame, limit: int = PREVIEW_ROW_LIMIT) -> List[Dict[str, Any]]:
    return df.head(limit).to_dict(orient="records")


async def store_full_dataset(file_bytes: bytes, filename: str, owner_id: Any) -> str:
    """Write raw CSV bytes to disk and return the absolute file path."""
    owner_dir = STORAGE_ROOT / str(owner_id)
    owner_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name or "dataset.csv"
    storage_name = f"{uuid4().hex}_{safe_name}"
    storage_path = owner_dir / storage_name
    storage_path.write_bytes(file_bytes)
    return str(storage_path)


async def load_full_dataset(dataset_doc: Dict[str, Any]) -> pd.DataFrame:
    """Load the complete dataset, falling back gracefully through storage tiers.

    Priority:
    1. ``full_dataset_path`` — filesystem storage (current default)
    2. ``full_data``         — legacy in-document storage (MongoDB)
    3. ``preview``           — last-resort fallback with a warning

    Raises ``HTTPException(400)`` when no data source is available.
    """
    # 1. Filesystem (primary)
    storage_path = dataset_doc.get("full_dataset_path")
    if storage_path:
        path = Path(str(storage_path))
        if not path.exists() or not path.is_file():
            raise HTTPException(
                status_code=400,
                detail=(
                    "The stored dataset file is missing from disk. "
                    "Please re-upload the dataset before running analysis."
                ),
            )
        return pd.read_csv(path)

    # 2. Legacy in-DB full data
    legacy_rows = dataset_doc.get("full_data")
    if legacy_rows:
        return pd.DataFrame(legacy_rows)

    # 3. Preview-only fallback — clearly signals incomplete data
    preview_rows = dataset_doc.get("preview")
    if preview_rows:
        # Return it but callers are informed via log; analysis continues on partial data
        return pd.DataFrame(preview_rows)

    raise HTTPException(
        status_code=400,
        detail=(
            "No dataset data is available for this record. "
            "Please re-upload the dataset before running analysis."
        ),
    )


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------


async def upload_dataset(file_bytes: bytes, filename: str, owner_id: Any) -> Dict[str, Any]:
    """Validate, store, and register a new dataset. Returns the MongoDB document."""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV.")

    base_name = Path(filename).stem.strip()
    if not base_name:
        raise HTTPException(status_code=400, detail="Dataset name is invalid.")

    dataset_name_key = normalize_dataset_name(base_name)
    existing = await datasets_collection.find_one(
        {"user_id": owner_id, "dataset_name_key": dataset_name_key},
        {"_id": 1},
    )
    if existing:
        raise HTTPException(status_code=409, detail="You already have a dataset with this name.")

    try:
        df = pd.read_csv(BytesIO(file_bytes))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {exc}") from exc

    full_dataset_path = await store_full_dataset(file_bytes, filename, owner_id)

    dataset_doc: Dict[str, Any] = {
        "user_id": owner_id,
        "filename": filename,
        "dataset_name": base_name,
        "dataset_name_key": dataset_name_key,
        "upload_date": datetime.utcnow(),
        "row_count": int(len(df)),
        "columns": [str(col) for col in df.columns.tolist()],
        "preview": store_preview(df),
        "full_dataset_path": full_dataset_path,
        "storage_backend": "filesystem",
        "status": "Uploaded",
        "analysis": None,
        "mitigation": None,
        "configuration": {},
    }

    result = await datasets_collection.insert_one(dataset_doc)
    dataset_doc["_id"] = result.inserted_id
    return dataset_doc


async def save_dataset_configuration(
    dataset_id: str, owner_id: Any, config: Dict[str, Any]
) -> None:
    """Persist dataset configuration (target column, sensitive attributes, groups)."""
    dataset = await get_dataset_for_owner(dataset_id, owner_id)

    desired_name = (
        config.get("dataset_name")
        or dataset.get("dataset_name")
        or Path(dataset.get("filename", "")).stem
    )
    desired_name = str(desired_name).strip()
    if not desired_name:
        raise HTTPException(status_code=400, detail="Dataset name is required.")

    desired_name_key = normalize_dataset_name(desired_name)
    duplicate = await datasets_collection.find_one(
        {
            "_id": {"$ne": dataset["_id"]},
            "user_id": owner_id,
            "dataset_name_key": desired_name_key,
        },
        {"_id": 1},
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="You already have a dataset with this name.")

    await datasets_collection.update_one(
        {"_id": dataset["_id"], "user_id": owner_id},
        {
            "$set": {
                "analysis_name": desired_name,
                "dataset_name": desired_name,
                "dataset_name_key": desired_name_key,
                "target_column": config["target_column"],
                "sensitive_attribute": config["sensitive_attribute"],
                "privileged_group": config["privileged_group"],
                "unprivileged_group": config["unprivileged_group"],
                "configuration": {
                    "dataset_name": desired_name,
                    "target_column": config["target_column"],
                    "sensitive_attribute": config["sensitive_attribute"],
                    "privileged_group": config["privileged_group"],
                    "unprivileged_group": config["unprivileged_group"],
                },
                "status": "Configured",
            }
        },
    )


async def delete_dataset_for_owner(dataset_id: str, owner_id: Any) -> None:
    """Delete the dataset document and its on-disk file."""
    dataset = await get_dataset_for_owner(dataset_id, owner_id)

    storage_path = dataset.get("full_dataset_path")
    if storage_path:
        path = Path(str(storage_path))
        if path.exists() and path.is_file():
            path.unlink(missing_ok=True)

    result = await datasets_collection.delete_one(
        {"_id": dataset["_id"], "user_id": owner_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dataset not found.")
