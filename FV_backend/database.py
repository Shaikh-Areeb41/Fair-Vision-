import os
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)

MONGO_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DB_NAME", "fairvision_db")

if not MONGO_URL:
    raise ValueError("No MONGODB_URL found in .env file")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]

datasets_collection = db.get_collection("datasets")
users_collection = db.get_collection("users")
reports_collection = db.get_collection("reports")