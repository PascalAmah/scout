import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.outreach import (
    OutreachGenerate,
    OutreachGenerateAccepted,
    OutreachOut,
    OutreachPatch,
)
from app.services import outreach_service

router = APIRouter(prefix="/outreach", tags=["outreach"])


@router.post(
    "/generate",
    response_model=OutreachGenerateAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
def generate(
    body: OutreachGenerate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OutreachGenerateAccepted:
    """Kick off async cover-letter / intro-email generation for an application."""
    job_row = outreach_service.generate(db, user, body)
    return OutreachGenerateAccepted(job_id=job_row.id, status="queued")


@router.get("/{outreach_id}", response_model=OutreachOut)
def get_outreach(
    outreach_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OutreachOut:
    return OutreachOut.model_validate(outreach_service.get(db, user, outreach_id))


@router.patch("/{outreach_id}", response_model=OutreachOut)
def patch_outreach(
    outreach_id: uuid.UUID,
    body: OutreachPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OutreachOut:
    """Update outreach content/status. The ``draft → sent`` transition is blocked
    with 409 NOT_REVIEWED until the copy has been reviewed."""
    return OutreachOut.model_validate(outreach_service.patch(db, user, outreach_id, body))


@router.post("/{outreach_id}/review", response_model=OutreachOut)
def review_outreach(
    outreach_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OutreachOut:
    return OutreachOut.model_validate(outreach_service.review(db, user, outreach_id))