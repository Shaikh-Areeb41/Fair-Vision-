from pydantic import BaseModel, Field, BeforeValidator, EmailStr, field_validator
from datetime import datetime
from typing import List, Dict, Optional, Any
from typing_extensions import Annotated
import re

# Helper to handle MongoDB's "_id" field
PyObjectId = Annotated[str, BeforeValidator(str)]
def _is_strong_password(password: str) -> bool:
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[^A-Za-z\d]", password):
        return False
    return True

# --- EXISTING DATASET MODEL ---
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

# --- NEW USER AUTHENTICATION MODELS ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=3, max_length=50)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not re.fullmatch(r"[A-Za-z]+(?:[ '\-][A-Za-z]+)*", cleaned):
            raise ValueError("Full name can only contain letters, spaces, hyphens, and apostrophes")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not _is_strong_password(value):
            raise ValueError("Password must be at least 8 characters and include uppercase, lowercase, number, and special character")
        return value

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    full_name: str
    hashed_password: str
    emailVerified: bool = False
    verificationCode: Optional[str] = None
    verificationExpires: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}