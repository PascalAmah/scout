import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.cv import ComputeMatchOut, MatchOut
from app.services import matching_service

router = APIRouter(prefix="/match", tags=["match"])


@router.post("/compute", response_model=ComputeMatchOut)
def force_compute(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ComputeMatchOut:
    """Force a synchronous recompute of Stage 1 match scores for the user.

    The shared middleware rate-limits the API (see API_SPEC: AI-heavy endpoints
    get tight bursts), so a user cannot hammer this into a busy-loop."""
    computed = matching_service.recompute_user(db, user)
    return ComputeMatchOut(status="ok", computed_scores=computed)


@router.get("/{job_id}", response_model=MatchOut)
def get_match(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MatchOut:
    return matching_service.get_match(db, user, job_id)