from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from database import datasets_collection, reports_collection, users_collection
from routers.auth import get_current_user


router = APIRouter(prefix="/api/admin", tags=["Admin Testing"])


def _ensure_test_admin(current_user: dict) -> None:
    if not bool(current_user.get("is_admin", False)):
        raise HTTPException(status_code=403, detail="Admin access denied")


def _parse_object_id(value: str, detail: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=detail)
    return ObjectId(value)


def _serialize_user_row(user_doc: dict, dataset_count: int) -> dict:
    return {
        "id": str(user_doc.get("_id")),
        "email": user_doc.get("email", ""),
        "full_name": user_doc.get("full_name", ""),
        "dataset_count": dataset_count,
    }


@router.get("/users")
async def list_users(current_user: dict = Depends(get_current_user)):
    _ensure_test_admin(current_user)

    users = []
    cursor = users_collection.find({}, {"email": 1, "full_name": 1}).sort("_id", -1)
    async for user_doc in cursor:
        user_id = user_doc.get("_id")
        dataset_count = await datasets_collection.count_documents({"user_id": user_id})
        users.append(_serialize_user_row(user_doc, dataset_count))

    return {"users": users}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    _ensure_test_admin(current_user)

    target_user_id = _parse_object_id(user_id, "Invalid user id")
    if target_user_id == current_user.get("_id"):
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")

    target_user = await users_collection.find_one({"_id": target_user_id}, {"email": 1})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    dataset_delete_result = await datasets_collection.delete_many({"user_id": target_user_id})
    report_delete_result = await reports_collection.delete_many({"user_id": target_user_id})
    await users_collection.delete_one({"_id": target_user_id})

    return {
        "message": "User and related data deleted",
        "deleted_user_email": target_user.get("email", ""),
        "deleted_datasets": dataset_delete_result.deleted_count,
        "deleted_reports": report_delete_result.deleted_count,
    }
