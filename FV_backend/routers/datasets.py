"""Datasets router — thin HTTP layer that delegates to dataset_service."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from typing import Optional

from routers.auth import get_current_user
from services.dataset_service import (
    delete_dataset_for_owner,
    get_dataset_for_owner,
    list_datasets_for_owner,
    save_dataset_configuration,
    serialize_dataset,
    upload_dataset,
)

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])


class ConfigureDatasetRequest(BaseModel):
    target_column: str
    sensitive_attribute: str
    privileged_group: str
    unprivileged_group: str
    dataset_name: Optional[str] = None


# 1. UPLOAD
@router.post("/upload")
async def upload_dataset_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()
    dataset_doc = await upload_dataset(content, file.filename or "", current_user["_id"])
    return {
        "id": str(dataset_doc["_id"]),
        "filename": dataset_doc["filename"],
        "dataset_name": dataset_doc["dataset_name"],
        "columns": dataset_doc["columns"],
        "message": "Upload successful",
    }


# 2. HISTORY
@router.get("/history")
async def get_user_history(current_user: dict = Depends(get_current_user)):
    datasets = await list_datasets_for_owner(current_user["_id"])
    return [serialize_dataset(d) for d in datasets]


# 3. GET SINGLE DATASET
@router.get("/{id}")
async def get_dataset_details(id: str, current_user: dict = Depends(get_current_user)):
    dataset = await get_dataset_for_owner(id, current_user["_id"])
    return serialize_dataset(dataset)


# 4. CONFIGURE DATASET
@router.post("/{id}/configure")
async def configure_dataset(
    id: str,
    config: ConfigureDatasetRequest,
    current_user: dict = Depends(get_current_user),
):
    await save_dataset_configuration(id, current_user["_id"], config.model_dump())
    return {"message": "Configuration saved"}


# 5. DELETE DATASET
@router.delete("/{id}")
async def delete_dataset_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    await delete_dataset_for_owner(id, current_user["_id"])
    return {"message": "Dataset deleted successfully"}
