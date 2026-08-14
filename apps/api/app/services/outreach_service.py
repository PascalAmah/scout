"""outreach_service — cover letter / intro email generation and lifecycle.

Generation is async (worker ``generate_cover_letter`` on the ``generation``
queue). The review gate blocks the ``draft → sent`` transition until the user
explicitly reviews the generated copy (API_SPEC review gate).
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.models import Application, EnrichmentJob, Outreach, User
from app.schemas.outreach import (
    OUTREACH_CHANNELS,
    OUTREACH_STATUSES,
    OutreachGenerate,
    OutreachPatch,
)
from app.services import job_queue, review_gate


def _owned_outreach(db: Session, user: User, outreach_id: uuid.UUID) -> Outreach:
    row = db.scalar(
        select(Outreach)
        .join(Application, Application.id == Outreach.application_id)
        .where(Outreach.id == outreach_id, Application.user_id == user.id)
    )
    if row is None:
        raise ScoutError("OUTREACH_NOT_FOUND", "No outreach found with that id.", status_code=404)
    return row


def list_for_application(db: Session, user: User, application_id: uuid.UUID) -> list[Outreach]:
    app = db.scalar(
        select(Application).where(
            Application.id == application_id, Application.user_id == user.id
        )
    )
    if app is None:
        raise ScoutError(
            "APPLICATION_NOT_FOUND", "No application found with that id.", status_code=404
        )
    return list(
        db.scalars(
            select(Outreach)
            .where(Outreach.application_id == application_id)
            .order_by(Outreach.created_at.desc())
        ).all()
    )


def generate(db: Session, user: User, body: OutreachGenerate) -> EnrichmentJob:
    if body.channel not in OUTREACH_CHANNELS:
        raise ScoutError("INVALID_CHANNEL", "Unsupported outreach channel.", status_code=400)
    app = db.scalar(
        select(Application).where(
            Application.id == body.application_id, Application.user_id == user.id
        )
    )
    if app is None:
        raise ScoutError(
            "APPLICATION_NOT_FOUND", "No application found with that id.", status_code=404
        )

    job_row = EnrichmentJob(
        user_id=user.id,
        entity_type="application",
        entity_id=app.id,
        job_type="generate_cover_letter",
        status="queued",
    )
    db.add(job_row)
    db.commit()
    db.refresh(job_row)

    job_queue.enqueue_generate_cover_letter(
        application_id=str(app.id),
        channel=body.channel,
        user_id=str(user.id),
        job_row_id=str(job_row.id),
    )
    return job_row


def get(db: Session, user: User, outreach_id: uuid.UUID) -> Outreach:
    return _owned_outreach(db, user, outreach_id)


def patch(db: Session, user: User, outreach_id: uuid.UUID, body: OutreachPatch) -> Outreach:
    row = _owned_outreach(db, user, outreach_id)
    if body.content is not None:
        row.content = body.content
    if body.status is not None:
        if body.status not in OUTREACH_STATUSES:
            raise ScoutError("INVALID_STATUS", "Unsupported outreach status.", status_code=400)
        if body.status == "sent":
            from app.services.review_gate import require_reviewed

            require_reviewed(row)
            from datetime import UTC, datetime

            row.sent_at = datetime.now(UTC)
        row.status = body.status
    db.add(row)
    db.commit()
    return _owned_outreach(db, user, row.id)


def review(db: Session, user: User, outreach_id: uuid.UUID) -> Outreach:
    row = _owned_outreach(db, user, outreach_id)
    return review_gate.mark_reviewed(db, row)