from fastapi import APIRouter, UploadFile, File, HTTPException
from database import db
from datetime import datetime
from bson.binary import Binary

router = APIRouter(prefix="/api/models", tags=["ML Models"])

# Get the collection reference
models_collection = db.get_collection("ml_models")

@router.post("/upload")
async def upload_model(file: UploadFile = File(...)):
    # 1. Validate File Extension (SRS Supported Formats)
    valid_extensions = ('.pkl', '.joblib', '.h5', '.pt')
    if not file.filename.endswith(valid_extensions):
        raise HTTPException(status_code=400, detail="Invalid model format. Use .pkl, .joblib, .h5, or .pt")

    try:
        # 2. Read file as Binary
        file_content = await file.read()
        
        # 3. Create MongoDB Document
        # We use BSON Binary to store the actual model file efficiently
        model_doc = {
            "filename": file.filename,
            "upload_date": datetime.utcnow(),
            "file_size": len(file_content),
            "data": Binary(file_content)  # Storing the binary blob
        }

        # 4. Insert into MongoDB
        result = await models_collection.insert_one(model_doc)

        return {
            "id": str(result.inserted_id),
            "filename": file.filename,
            "size_kb": round(len(file_content) / 1024, 2),
            "message": "Model uploaded successfully!"
        }

    except Exception as e:
        print(f"Model Upload Error: {e}")
        raise HTTPException(status_code=500, detail=f"Model upload failed: {str(e)}")