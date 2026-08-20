import uuid
from datetime import UTC

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ScoutError
from app.core.pagination import cursor_page
from app.models import (
    Application,
    Job,
    Outreach,
    Resume,
    ResumeVersion,
    Startup,
    User,
)
from app.schemas.application import (
    APPLICATION_STATUSES,
    ApplicationCreate,
    ApplicationPatch,
    BulkApplicationRequest,
)

STATE_MACHINE: dict[str, frozenset[str]] = {
    "saved": frozenset({"interested", "applied", "archived"}),
    "interested": frozenset({"applied", "rejected", "archived"}),
    "applied": frozenset({"interview", "offer", "rejected", "archived"}),
    "interview": frozenset({"offer", "rejected", "archived"}),
    "offer": frozenset({"rejected", "archived"}),
    "rejected": frozenset({"archived"}),
    "archived": frozenset(),
}

TRANSITION_NOTIFICATION_TITLES: dict[str, str] = {
    "applied": "Application marked as applied",
    "interview": "Interview scheduled",
    "offer": "Offer received",
    "rejected": "Application rejected",
}


def _get_application(db: Session, user: User, application_id: uuid.UUID) -> Application:
    row = db.scalar(
        select(Application)
        .where(Application.id == application_id, Application.user_id == user.id)
        .options(selectinload(Application.startup), selectinload(Application.job))
    )
    if row is None:
        raise ScoutError(
            "APPLICATION_NOT_FOUND", "No application found with that id.", status_code=404
        )
    return row


def _load_job(db: Session, job_id: uuid.UUID) -> Job:
    row = db.get(Job, job_id)
    if row is None:
        raise ScoutError("JOB_NOT_FOUND", "No job found with that id.", status_code=404)
    return row


def create_application(db: Session, user: User, body: ApplicationCreate) -> Application:
    if body.status not in APPLICATION_STATUSES:
        raise ScoutError("INVALID_STATUS", "Unsupported application status.", status_code=400)
    startup = db.get(Startup, body.startup_id)
    if startup is None:
        raise ScoutError("STARTUP_NOT_FOUND", "No startup found with that id.", status_code=404)
    if body.job_id is not None:
        job = _load_job(db, body.job_id)
        if job.startup_id != body.startup_id:
            raise ScoutError(
                "JOB_STARTUP_MISMATCH", "Job does not belong to that startup.", status_code=400
            )
    row = Application(
        user_id=user.id,
        startup_id=body.startup_id,
        job_id=body.job_id,
        status=body.status,
    )
    if body.status == "applied":
        from datetime import datetime

        row.applied_at = datetime.now(UTC)
    db.add(row)
    db.commit()
    return _get_application(db, user, row.id)


def list_applications(
    db: Session,
    user: User,
    status: str | None,
    cursor: str | None,
    limit: int,
) -> tuple[list[Application], str | None]:
    stmt: Select = (
        select(Application)
        .where(Application.user_id == user.id)
        .options(selectinload(Application.startup), selectinload(Application.job))
    )
    if status:
        stmt = stmt.where(Application.status == status)
    return cursor_page(db, stmt, Application.created_at, Application.id, cursor, limit)


def get_application(db: Session, user: User, application_id: uuid.UUID) -> Application:
    return _get_application(db, user, application_id)


def resume_version_ref(db: Session, resume_version_id: uuid.UUID | None) -> dict | None:
    if resume_version_id is None:
        return None
    rv = db.get(ResumeVersion, resume_version_id)
    if rv is None:
        return None
    # "v{n}" — 1-based position within the resume's version history so the
    # pipeline can surface which iteration was sent for this application.
    seq = (
        db.scalar(
            select(func.count(ResumeVersion.id)).where(
                ResumeVersion.resume_id == rv.resume_id,
                ResumeVersion.created_at <= rv.created_at,
            )
        )
        or 0
    )
    return {
        "id": rv.id,
        "created_at": rv.created_at,
        "reviewed_at": rv.reviewed_at,
        "content": rv.content,
        "label": f"v{seq}",
    }


def last_outreach_ref(db: Session, application_id: uuid.UUID) -> dict | None:
    row = db.scalar(
        select(Outreach)
        .where(Outreach.application_id == application_id)
        .order_by(Outreach.created_at.desc())
        .limit(1)
    )
    if row is None:
        return None
    return {"id": row.id, "channel": row.channel, "status": row.status, "sent_at": row.sent_at}


def outreach_for(db: Session, application_id: uuid.UUID) -> list[Outreach]:
    return list(
        db.scalars(
            select(Outreach)
            .where(Outreach.application_id == application_id)
            .order_by(Outreach.created_at.desc())
        ).all()
    )


def timeline_events(db: Session, app: Application, outreach: list[Outreach]) -> list[dict]:
    events: list[dict] = [
        {"type": "created", "title": "Application saved", "at": app.created_at}
    ]
    if app.applied_at is not None:
        events.append({"type": "applied", "title": "Marked as applied", "at": app.applied_at})
    events.append(
        {
            "type": "status_change",
            "title": f"Moved to {app.status}",
            "at": app.updated_at or app.created_at,
        }
    )
    for item in outreach:
        events.append({"type": "outreach_created", "title": f"{item.channel} generated", "at": item.created_at})
        if item.reviewed_at is not None:
            events.append({"type": "reviewed", "title": f"{item.channel} reviewed", "at": item.reviewed_at})
        if item.sent_at is not None:
            events.append({"type": "outreach_sent", "title": f"{item.channel} sent", "at": item.sent_at})
    events.sort(key=lambda e: e["at"])
    return events


def pipeline(db: Session, user: User) -> dict[str, list[Application]]:
    rows = list(
        db.scalars(
            select(Application)
            .where(Application.user_id == user.id)
            .options(selectinload(Application.startup), selectinload(Application.job))
            .order_by(Application.created_at.desc())
        ).all()
    )
    grouped: dict[str, list[Application]] = {
        status: [row for row in rows if row.status == status]
        for status in (
            "saved",
            "interested",
            "applied",
            "interview",
            "offer",
            "rejected",
            "archived",
        )
    }
    return grouped


def update_application(
    db: Session, user: User, application_id: uuid.UUID, body: ApplicationPatch
) -> Application:
    row = _get_application(db, user, application_id)
    if body.status is not None:
        if body.status not in APPLICATION_STATUSES:
            raise ScoutError("INVALID_STATUS", "Unsupported application status.", status_code=400)
        if body.status == "archived":
            pass  # archived is reachable from any state
        elif body.status not in STATE_MACHINE.get(row.status, frozenset()):
            raise ScoutError(
                "INVALID_TRANSITION",
                f"Cannot transition from '{row.status}' to '{body.status}'.",
                status_code=400,
            )
        row.status = body.status
        if body.status == "applied" and row.applied_at is None:
            from datetime import datetime

            row.applied_at = datetime.now(UTC)
        title = TRANSITION_NOTIFICATION_TITLES.get(body.status)
        if title:
            from app.services.notification_service import notify

            db.add(
                notify(
                    db,
                    user.id,
                    "application_status_change",
                    title,
                    entity_type="application",
                    entity_id=row.id,
                )
            )
    if body.tags is not None:
        row.tags = list(dict.fromkeys(tag.strip() for tag in body.tags if tag.strip()))
    if body.resume_version_id is not None:
        rv = db.scalar(
            select(ResumeVersion)
            .join(Resume, Resume.id == ResumeVersion.resume_id)
            .where(ResumeVersion.id == body.resume_version_id, Resume.user_id == user.id)
        )
        if rv is None:
            raise ScoutError(
                "RESUME_VERSION_NOT_FOUND", "No resume version found with that id.", status_code=404
            )
        row.resume_version_id = rv.id
    db.commit()
    return _get_application(db, user, row.id)


def bulk_update(db: Session, user: User, body: BulkApplicationRequest) -> int:
    """Bulk pipeline actions (Phase 6.3): archive a set of applications and/or
    replace their tags. Ownership is enforced per row; every listed id must
    exist and belong to the user."""
    if not body.application_ids:
        raise ScoutError("EMPTY_BULK", "No applications selected.", status_code=422)
    if body.status is not None and body.status != "archived":
        raise ScoutError(
            "INVALID_BULK_STATUS",
            "Bulk status moves are limited to 'archived' (valid from any state).",
            status_code=422,
        )

    ids = list(dict.fromkeys(body.application_ids))
    rows = list(
        db.scalars(
            select(Application).where(
                Application.id.in_(ids), Application.user_id == user.id
            )
        ).all()
    )
    if len(rows) != len(ids):
        raise ScoutError(
            "APPLICATION_NOT_FOUND",
            "One or more applications were not found.",
            status_code=404,
        )

    for row in rows:
        if body.status is not None:
            row.status = body.status
        if body.tags is not None:
            row.tags = list(dict.fromkeys(tag.strip() for tag in body.tags if tag.strip()))
    db.commit()
    return len(rows)


def archive_application(db: Session, user: User, application_id: uuid.UUID) -> Application:
    return update_application(
        db, user, application_id, ApplicationPatch(status="archived")
    )