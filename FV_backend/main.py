from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime
from pymongo import ASCENDING

from routers import datasets
from routers import analysis
from routers import auth 
from routers import mitigation
from routers import audit_intelligence
from routers import reports
from routers import admin
from database import users_collection, reports_collection, datasets_collection
from security import get_password_hash

# Admin seed credentials MUST be supplied via environment variables.
# The application will skip admin bootstrap if any variable is missing.
TEST_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
TEST_ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
TEST_ADMIN_FULL_NAME = os.getenv("ADMIN_FULL_NAME", "FairVision Admin")

app = FastAPI(title="FairVision API")

def get_allowed_origins() -> list[str]:
    default_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://fairvision.live",
        "https://www.fairvision.live",
        "https://fairvision.vercel.app",
        "https://fairvision.vercel.app/",
    ]

    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        default_origins.append(frontend_url.rstrip("/"))

    return default_origins


async def bootstrap_admin_user() -> None:
    if not TEST_ADMIN_EMAIL or not TEST_ADMIN_PASSWORD:
        return

    existing_admin = await users_collection.find_one({"email": TEST_ADMIN_EMAIL}, {"_id": 1})
    if existing_admin:
        await users_collection.update_one(
            {"_id": existing_admin["_id"]},
            {
                "$set": {
                    "is_admin": True,
                    "emailVerified": True,
                    "verificationCode": None,
                    "verificationExpires": None,
                }
            },
        )
        return

    await users_collection.insert_one(
        {
            "email": TEST_ADMIN_EMAIL,
            "full_name": TEST_ADMIN_FULL_NAME,
            "hashed_password": get_password_hash(TEST_ADMIN_PASSWORD),
            "emailVerified": True,
            "verificationCode": None,
            "verificationExpires": None,
            "is_admin": True,
            "created_at": datetime.utcnow(),
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- 2. REGISTER AUTH ROUTER ---
app.include_router(auth.router)

# Register existing routers
app.include_router(datasets.router)
app.include_router(analysis.router)
app.include_router(mitigation.router)
app.include_router(audit_intelligence.router)
app.include_router(reports.router)
app.include_router(admin.router)


@app.on_event("startup")
async def startup_indexes():
    await users_collection.create_index([("email", ASCENDING)], unique=True)
    await reports_collection.create_index([("report_id", ASCENDING)], unique=True)
    await reports_collection.create_index([("user_id", ASCENDING), ("generated_at", ASCENDING)])
    await datasets_collection.create_index(
        [("user_id", ASCENDING), ("dataset_name_key", ASCENDING)],
        unique=True,
        partialFilterExpression={"dataset_name_key": {"$exists": True, "$type": "string"}}
    )

    await bootstrap_admin_user()

@app.get("/")
def read_root():
    return {"status": "FairVision Backend (MongoDB) is Live"}