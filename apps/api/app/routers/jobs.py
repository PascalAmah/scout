import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.db.session import get_db
from app.deps import get_current_user
from app.models import SavedStartup, User
from app.schemas.common import Page
from app.schemas.cv import MatchOut
from app.schemas.startup import JobOut, JobPatch
from app.services import matching_service, startup_service

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/recommended", response_model=Page[MatchOut])
def recommended_jobs(
    cursor: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """Ranked jobs for the current user — embedding-only Stage 1 scores in Phase 2.

    Temporary contract deviation (flagged in Scout_Build_Plan Phase 2): the full
    API_SPEC response mandates ``explanation`` + ``confidence_band``, which the
    Phase 3.1 re-rank restores. Until then this endpoint returns both as ``null``
    and is treated as internal-only / not shipped to external consumers."""
    rows, next_cursor = matching_service.recommended(db, user, cursor, limit)
    return {"data": rows, "next_cursor": next_cursor}


def _ensure_workspace(db: Session, user: User, startup_id: uuid.UUID) -> None:
    row = db.scalar(
        select(SavedStartup).where(
            SavedStartup.user_id == user.id, SavedStartup.startup_id == startup_id
        )
    )
    if row is None:
        raise ScoutError(
            "STARTUP_NOT_SAVED", "This startup is not in your workspace.", status_code=404
        )


def _owned_job(db: Session, user: User, job_id: uuid.UUID):
    job = startup_service.get_job(db, job_id)
    _ensure_workspace(db, user, job.startup_id)
    return job


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobOut:
    return JobOut.model_validate(_owned_job(db, user, job_id))


@router.patch("/{job_id}", response_model=JobOut)
def patch_job(
    job_id: uuid.UUID,
    body: JobPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> JobOut:
    _owned_job(db, user, job_id)
    return JobOut.model_validate(startup_service.patch_job(db, job_id, body))


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    _owned_job(db, user, job_id)
    startup_service.delete_job(db, job_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)