import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.cv import ComputeMatchOut, MatchFeedback, MatchOut
from app.services import job_queue, matching_service

router = APIRouter(prefix="/match", tags=["match"])


@router.post("/compute", response_model=ComputeMatchOut)
def force_compute(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ComputeMatchOut:
    """Force a recompute of cached match scores.

    Runs Stage 1 (embedding) and the deterministic Stage 2 re-rank synchronously
    so explanations are available immediately, then enqueues an async LLM re-rank
    (worker) that upgrades the explanations in place. The shared rate-limiter caps
    how often this AI-heavy path can be hit."""
    computed = matching_service.recompute_user(db, user)
    matching_service.rerank_user(db, user)
    job_queue.enqueue_compute_match(str(user.id))
    return ComputeMatchOut(status="ok", computed_scores=computed)


@router.get("/{job_id}", response_model=MatchOut)
def get_match(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MatchOut:
    return matching_service.get_match(db, user, job_id)


@router.post("/{job_id}/feedback", response_model=MatchOut)
def match_feedback(
    job_id: uuid.UUID,
    body: MatchFeedback,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MatchOut:
    """Capture thumbs up/down feedback on a match ("good" | "poor")."""
    matching_service.set_feedback(db, user, job_id, body.feedback)
    return matching_service.get_match(db, user, job_id)