import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Get the connection string from .env
MONGODB_URL = os.getenv("MONGODB_URL")
DB_NAME = os.getenv("DB_NAME", "fairvision_db")

if not MONGODB_URL:
    raise ValueError("No MONGODB_URL found in .env file")

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DB_NAME]

# Define our collections
datasets_collection = db.get_collection("datasets")
models_collection = db.get_collection("ml_models")

