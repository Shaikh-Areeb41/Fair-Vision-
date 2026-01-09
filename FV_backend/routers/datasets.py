from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
from database import datasets_collection
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional, List # <--- Added Imports

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

# --- 1. NEW ENDPOINT: Get All Datasets (For History Page) ---
@router.get("/")
async def get_all_datasets():
    try:
        # Fetch only necessary fields to keep it fast
        cursor = datasets_collection.find({}, {
            "filename": 1, 
            "dataset_name": 1, 
            "upload_date": 1, 
            "status": 1, 
            "analysis": 1
        }).sort("upload_date", -1)
        
        datasets = []
        async for doc in cursor:
            # Determine "Bias Status" for the badge
            bias_status = "Pending"
            if doc.get("status") == "Analyzed" and doc.get("analysis"):
                # Simple logic: If DPD > 0.1, it's Biased
                dpd = doc["analysis"].get("dpd", 0)
                bias_status = "Biased" if dpd > 0.1 else "Fair"

            datasets.append({
                "id": str(doc["_id"]),
                "filename": doc.get("filename"),
                # Use custom name if exists, else fallback to filename
                "name": doc.get("dataset_name") or doc.get("filename"), 
                "date": doc.get("upload_date"),
                "status": doc.get("status", "Uploaded"),
                "bias_status": bias_status
            })
        return datasets
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    # 1. Validate CSV
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed.")

    try:
        # 2. Read File content
        contents = await file.read()
        
        # 3. Parse with Pandas
        df = pd.read_csv(io.BytesIO(contents))

        # Check Limits
        if len(df) > 100000:
            raise HTTPException(status_code=400, detail="Dataset too large (Limit: 100k rows).")

        # 4. Clean Data for JSON
        df = df.where(pd.notnull(df), None)
        
        # Prepare Metadata
        data_records = df.to_dict(orient="records")
        columns_info = [{"name": col, "type": str(df[col].dtype)} for col in df.columns]
        preview_data = df.head(20).to_dict(orient="records")

        # 5. Create Document
        new_dataset = {
            "filename": file.filename,
            "upload_date": datetime.utcnow(),
            "status": "Uploaded", # <--- Added initial status
            "row_count": len(df),
            "columns": columns_info,
            "preview": preview_data,
            "full_data": data_records 
        }

        # 6. Insert into Atlas
        result = await datasets_collection.insert_one(new_dataset)

        # 7. Return Response
        return {
            "id": str(result.inserted_id),
            "filename": file.filename,
            "total_rows": len(df),
            "columns": columns_info,
            "preview": preview_data,
            "message": "Upload successful!"
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/{id}")
async def get_dataset(id: str):
    try:
        obj_id = ObjectId(id)
        dataset = await datasets_collection.find_one({"_id": obj_id})
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        dataset["id"] = str(dataset["_id"])
        del dataset["_id"]
        return dataset

    except Exception as e:
        print(f"Error fetching dataset: {e}")
        raise HTTPException(status_code=400, detail="Invalid ID format")


# --- 2. UPDATED SCHEMA: Add optional dataset_name ---
class DatasetConfig(BaseModel):
    target_column: str
    sensitive_attribute: str
    privileged_group: str
    unprivileged_group: str
    dataset_name: Optional[str] = None # <--- NEW FIELD

@router.post("/{id}/configure")
async def configure_dataset(id: str, config: DatasetConfig):
    try:
        obj_id = ObjectId(id)
        
        # Prepare update data
        update_data = {
            "configuration": config.dict(),
            "status": "Configured"
        }
        
        # If user provided a name, save it at the root level for easy access
        if config.dataset_name:
            update_data["dataset_name"] = config.dataset_name

        result = await datasets_collection.update_one(
            {"_id": obj_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Dataset not found")
            
        return {"message": "Configuration saved successfully"}

    except Exception as e:
        print(f"Config Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save configuration")