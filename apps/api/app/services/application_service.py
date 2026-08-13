import uuid
from datetime import UTC

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ScoutError
from app.core.pagination import cursor_page
from app.models import Application, Job, Startup, User
from app.schemas.application import APPLICATION_STATUSES, ApplicationCreate, ApplicationPatch

STATE_MACHINE: dict[str, frozenset[str]] = {
    "saved": frozenset({"interested", "applied", "archived"}),
    "interested": frozenset({"applied", "archived"}),
    "applied": frozenset({"interview", "archived"}),
    "interview": frozenset({"offer", "rejected", "archived"}),
    "offer": frozenset({"archived"}),
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


def pipeline(db: Session, user: User) -> dict[str, list[Application]]:
    rows = list(
        db.scalars(
            select(Application)
            .where(Application.user_id == user.id, Application.status != "archived")
            .options(selectinload(Application.startup), selectinload(Application.job))
            .order_by(Application.created_at.desc())
        ).all()
    )
    grouped: dict[str, list[Application]] = {
        status: [row for row in rows if row.status == status]
        for status in ("saved", "interested", "applied", "interview", "offer", "rejected")
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
    db.commit()
    return _get_application(db, user, row.id)


def archive_application(db: Session, user: User, application_id: uuid.UUID) -> Application:
    return update_application(
        db, user, application_id, ApplicationPatch(status="archived")
    )