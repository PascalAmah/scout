import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.db.session import get_db
from app.deps import get_current_user
from app.models import EnrichmentJob, User
from app.schemas.startup import EnrichmentJobOut

router = APIRouter(prefix="/jobs-status", tags=["jobs_status"])


@router.get("/{job_id}", response_model=EnrichmentJobOut)
def get_job_status(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> EnrichmentJobOut:
    job = db.scalar(
        select(EnrichmentJob).where(
            EnrichmentJob.id == job_id,
            (EnrichmentJob.user_id == user.id) | (EnrichmentJob.user_id.is_(None)),
        )
    )
    if job is None:
        raise ScoutError("JOB_NOT_FOUND", "No background job found with that id.", status_code=404)
    return EnrichmentJobOut.model_validate(job)