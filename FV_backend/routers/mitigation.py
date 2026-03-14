from fastapi import APIRouter, Depends, HTTPException

from routers.auth import get_current_user
from services.mitigation_service import run_mitigation

router = APIRouter(prefix="/api/mitigation", tags=["Mitigation"])


def _owner_id_from_user(current_user: dict):
    return current_user["_id"]


@router.post("/{dataset_id}/apply")
async def apply_mitigation(
    dataset_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        return await run_mitigation(dataset_id, _owner_id_from_user(current_user))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
