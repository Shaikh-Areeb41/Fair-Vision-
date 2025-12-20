from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
from database import datasets_collection
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    # 1. Validate CSV (SRS REQ-1)
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files allowed.")

    try:
        # 2. Read File content
        contents = await file.read()
        
        # 3. Parse with Pandas
        df = pd.read_csv(io.BytesIO(contents))

        # Check Limits (SRS Constraint: 100k rows)
        if len(df) > 100000:
            raise HTTPException(status_code=400, detail="Dataset too large (Limit: 100k rows).")

        # 4. Clean Data for JSON (Handle NaN values)
        df = df.where(pd.notnull(df), None)
        
        # Prepare Metadata
        data_records = df.to_dict(orient="records")
        columns_info = [{"name": col, "type": str(df[col].dtype)} for col in df.columns]
        preview_data = df.head(20).to_dict(orient="records")

        # 5. Create Document
        new_dataset = {
            "filename": file.filename,
            "upload_date": datetime.utcnow(),
            "row_count": len(df),
            "columns": columns_info,
            "preview": preview_data,
            "full_data": data_records # Storing actual data in Cloud DB
        }

        # 6. Insert into Atlas
        result = await datasets_collection.insert_one(new_dataset)

        # 7. Return Response to Frontend
        return {
            "id": str(result.inserted_id),
            "filename": file.filename,
            "total_rows": len(df),
            "columns": columns_info,
            "preview": preview_data,
            "message": "Upload to MongoDB Atlas successful!"
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


# --- ADD THIS NEW ENDPOINT ---
@router.get("/{id}")
async def get_dataset(id: str):
    try:
        # 1. Convert string ID to MongoDB ObjectId
        obj_id = ObjectId(id)
        
        # 2. Find the document
        dataset = await datasets_collection.find_one({"_id": obj_id})
        
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        # 3. Convert ObjectId to string (JSON doesn't support ObjectId)
        dataset["id"] = str(dataset["_id"])
        del dataset["_id"]

        return dataset

    except Exception as e:
        print(f"Error fetching dataset: {e}")
        raise HTTPException(status_code=400, detail="Invalid ID format")


# 1. Define the Schema
class DatasetConfig(BaseModel):
    target_column: str
    sensitive_attribute: str
    privileged_group: str
    unprivileged_group: str

# 2. Add the Configuration Endpoint
@router.post("/{id}/configure")
async def configure_dataset(id: str, config: DatasetConfig):
    try:
        obj_id = ObjectId(id)
        
        # Update the existing document with configuration
        result = await datasets_collection.update_one(
            {"_id": obj_id},
            {"$set": {
                "configuration": config.dict(),
                "status": "Configured"
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Dataset not found")
            
        return {"message": "Configuration saved successfully"}

    except Exception as e:
        print(f"Config Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save configuration")