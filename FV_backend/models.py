from pydantic import BaseModel, Field, BeforeValidator
from datetime import datetime
from typing import List, Dict, Optional, Any
from typing_extensions import Annotated

# Helper to handle MongoDB's "_id" field
PyObjectId = Annotated[str, BeforeValidator(str)]

class DatasetModel(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    filename: str
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    row_count: int
    columns: List[Dict[str, str]]
    preview: List[Dict[str, Any]]
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}