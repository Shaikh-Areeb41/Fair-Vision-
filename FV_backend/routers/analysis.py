from fastapi import APIRouter, Depends, HTTPException

from routers.auth import get_current_user
from services.analysis_service import run_analysis

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


def _owner_id_from_user(current_user: dict):
    return current_user["_id"]


@router.post("/{dataset_id}/train")
async def train_and_analyze(
    dataset_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        return await run_analysis(dataset_id, _owner_id_from_user(current_user))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc
