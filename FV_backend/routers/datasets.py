from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from pydantic import BaseModel
from database import datasets_collection
from routers.auth import get_current_user
from bson import ObjectId
import pandas as pd
import io
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])

# --- DATA MODELS ---
class ConfigureDatasetRequest(BaseModel):
    target_column: str
    sensitive_attribute: str
    privileged_group: str
    unprivileged_group: str
    # Make this Optional for Python 3.9+ compatibility
    dataset_name: Optional[str] = None 

# --- HELPER: FIX MONGO IDS ---
def serialize_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if "user_id" in doc and isinstance(doc["user_id"], ObjectId):
        doc["user_id"] = str(doc["user_id"])
    return doc

# 1. UPLOAD ENDPOINT
@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV.")

    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        # Increase preview to 1000 rows
        preview = df.head(1000).to_dict(orient="records")
        columns = df.columns.tolist()
        
        dataset_doc = {
            "user_id": current_user["_id"],
            "filename": file.filename,
            "upload_date": datetime.utcnow(),
            "row_count": len(df),
            "columns": columns,
            "preview": preview, 
            "status": "Uploaded",
            "analysis": None,
            "mitigation": None
        }
        
        result = await datasets_collection.insert_one(dataset_doc)
        
        return {
            "id": str(result.inserted_id),
            "filename": file.filename,
            "columns": columns,
            "message": "Upload successful"
        }

    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process file")

# 2. HISTORY ENDPOINT
@router.get("/history")
async def get_user_history(current_user: dict = Depends(get_current_user)):
    cursor = datasets_collection.find({"user_id": current_user["_id"]}).sort("upload_date", -1)
    datasets = await cursor.to_list(length=100)
    return [serialize_doc(d) for d in datasets]

# 3. GET SINGLE DATASET
@router.get("/{id}")
async def get_dataset_details(id: str):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    dataset = await datasets_collection.find_one({"_id": ObjectId(id)})
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    return serialize_doc(dataset)

# 4. CONFIGURE DATASET (Fixed 422 Error)
@router.post("/{id}/configure")
async def configure_dataset(
    id: str,
    config: ConfigureDatasetRequest,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Update the document with the configuration
    result = await datasets_collection.update_one(
        {"_id": ObjectId(id), "user_id": current_user["_id"]},
        {"$set": {
            "analysis_name": config.dataset_name,
            "target_column": config.target_column,
            "sensitive_attribute": config.sensitive_attribute,
            "privileged_group": config.privileged_group,
            "unprivileged_group": config.unprivileged_group,
            "status": "Configured"
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return {"message": "Configuration saved"}

# 5. DELETE DATASET
@router.delete("/{id}")
async def delete_dataset(id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    result = await datasets_collection.delete_one({
        "_id": ObjectId(id),
        "user_id": current_user["_id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return {"message": "Dataset deleted successfully"}