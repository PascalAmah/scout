import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ScoutError
from app.core.pagination import cursor_page
from app.models import EnrichmentJob, Founder, Job, Note, SavedStartup, Startup, User
from app.schemas.startup import (
    FounderCreate,
    FounderPatch,
    JobCreate,
    JobPatch,
    StartupCreate,
    StartupPatch,
)
from app.services import job_queue


def _get_startup(db: Session, startup_id: uuid.UUID) -> Startup:
    row = db.scalar(
        select(Startup).where(Startup.id == startup_id, Startup.deleted_at.is_(None))
    )
    if row is None:
        raise ScoutError("STARTUP_NOT_FOUND", "No startup found with that id.", status_code=404)
    return row


def _get_saved(db: Session, user: User, startup_id: uuid.UUID) -> SavedStartup:
    row = db.scalar(
        select(SavedStartup).where(
            SavedStartup.user_id == user.id, SavedStartup.startup_id == startup_id
        )
    )
    if row is None:
        raise ScoutError(
            "STARTUP_NOT_SAVED", "This startup is not in your workspace.", status_code=404
        )
    return row


def _enrichment_status(db: Session, startup: Startup) -> str:
    job = db.scalar(
        select(EnrichmentJob)
        .where(
            EnrichmentJob.entity_type == "startup",
            EnrichmentJob.entity_id == startup.id,
            EnrichmentJob.job_type == "enrich_startup",
        )
        .order_by(EnrichmentJob.created_at.desc(), EnrichmentJob.id.desc())
        .limit(1)
    )
    if job is not None:
        return job.status
    if startup.last_enriched_at is not None:
        return "succeeded"
    return "none"


def _find_existing(db: Session, data: StartupCreate) -> Startup | None:
    conditions = []
    if data.website:
        conditions.append(func.lower(Startup.website) == data.website.lower())
    if data.source_url:
        conditions.append(Startup.source_url == data.source_url)
    if not conditions:
        return None
    return db.scalar(
        select(Startup).where(or_(*conditions), Startup.deleted_at.is_(None)).order_by(Startup.created_at)
    )


def create_startup(
    db: Session,
    user: User,
    data: StartupCreate,
    saved_via: str = "web",
) -> tuple[Startup, SavedStartup, bool]:
    """Create (or reuse) a startup and save it to the user's workspace.

    Returns (startup, saved_row, already_saved).
    """
    existing = _find_existing(db, data)
    if existing is not None:
        already = db.scalar(
            select(SavedStartup).where(
                SavedStartup.user_id == user.id, SavedStartup.startup_id == existing.id
            )
        )
        if already is not None:
            return existing, already, True
        saved = SavedStartup(
            user_id=user.id, startup_id=existing.id, saved_via=saved_via, status="saved"
        )
        db.add(saved)
        db.commit()
        return existing, saved, False

    startup = Startup(
        name=data.name,
        website=data.website,
        source=data.source,
        source_url=data.source_url,
        tags=data.tags or None,
        hiring_status="unknown",
        created_by=user.id,
    )
    db.add(startup)
    db.flush()
    saved = SavedStartup(
        user_id=user.id, startup_id=startup.id, saved_via=saved_via, status="saved"
    )
    db.add(saved)
    db.commit()
    return startup, saved, False


def list_saved(
    db: Session,
    user: User,
    stage: str | None,
    hiring_status: str | None,
    tags: list[str] | None,
    q: str | None,
    cursor: str | None,
    limit: int,
) -> tuple[list[SavedStartup], str | None]:
    stmt: Select = (
        select(SavedStartup)
        .join(Startup, Startup.id == SavedStartup.startup_id)
        .where(
            SavedStartup.user_id == user.id,
            SavedStartup.status != "archived",
            Startup.deleted_at.is_(None),
        )
        .options(selectinload(SavedStartup.startup))
    )
    if stage:
        stmt = stmt.where(Startup.stage == stage)
    if hiring_status:
        stmt = stmt.where(Startup.hiring_status == hiring_status)
    if tags and db.get_bind().dialect.name == "postgresql":
        stmt = stmt.where(Startup.tags.overlap(tags))
    if q:
        stmt = stmt.where(
            or_(Startup.name.ilike(f"%{q}%"), Startup.summary.ilike(f"%{q}%"))
        )
    return cursor_page(db, stmt, SavedStartup.created_at, SavedStartup.id, cursor, limit)


def get_detail(db: Session, user: User, startup_id: uuid.UUID) -> Startup:
    startup = _get_startup(db, startup_id)
    _get_saved(db, user, startup_id)
    return startup


def patch_startup(db: Session, user: User, startup_id: uuid.UUID, patch: StartupPatch) -> Startup:
    startup = _get_startup(db, startup_id)
    saved = _get_saved(db, user, startup_id)
    if patch.status is not None:
        if patch.status not in {"saved", "interested", "archived"}:
            raise ScoutError("INVALID_STATUS", "Unsupported workspace status.", status_code=400)
        saved.status = patch.status
    for field in ("name", "website", "stage", "hiring_status", "summary"):
        value = getattr(patch, field)
        if value is not None:
            setattr(startup, field, value)
    if patch.tags is not None:
        startup.tags = patch.tags
    db.commit()
    return startup


def unsave(db: Session, user: User, startup_id: uuid.UUID) -> None:
    saved = _get_saved(db, user, startup_id)
    db.delete(saved)
    db.commit()


def trigger_enrich(db: Session, user: User, startup_id: uuid.UUID) -> EnrichmentJob:
    startup = _get_startup(db, startup_id)
    _get_saved(db, user, startup_id)
    job = EnrichmentJob(
        user_id=user.id,
        entity_type="startup",
        entity_id=startup.id,
        job_type="enrich_startup",
        status="queued",
    )
    db.add(job)
    db.commit()
    job_queue.enqueue_enrich_startup(startup.id, user.id)
    return job


def enrichment_status(db: Session, startup_id: uuid.UUID) -> EnrichmentJob | None:
    return db.scalar(
        select(EnrichmentJob)
        .where(
            EnrichmentJob.entity_type == "startup",
            EnrichmentJob.entity_id == startup_id,
            EnrichmentJob.job_type == "enrich_startup",
        )
        .order_by(EnrichmentJob.created_at.desc(), EnrichmentJob.id.desc())
        .limit(1)
    )


# --- Founders ---


def list_founders(db: Session, startup_id: uuid.UUID) -> list[Founder]:
    _get_startup(db, startup_id)
    return list(
        db.scalars(
            select(Founder).where(Founder.startup_id == startup_id).order_by(Founder.created_at)
        ).all()
    )


def add_founder(db: Session, startup_id: uuid.UUID, data: FounderCreate) -> Founder:
    _get_startup(db, startup_id)
    existing = db.scalar(
        select(Founder).where(
            Founder.startup_id == startup_id, func.lower(Founder.name) == data.name.lower()
        )
    )
    if existing is not None:
        return existing
    founder = Founder(startup_id=startup_id, **data.model_dump())
    db.add(founder)
    db.commit()
    return founder


def get_founder(db: Session, founder_id: uuid.UUID) -> Founder:
    row = db.get(Founder, founder_id)
    if row is None:
        raise ScoutError("FOUNDER_NOT_FOUND", "No founder found with that id.", status_code=404)
    return row


def patch_founder(db: Session, founder_id: uuid.UUID, patch: FounderPatch) -> Founder:
    founder = get_founder(db, founder_id)
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(founder, field, value)
    db.commit()
    return founder


def delete_founder(db: Session, founder_id: uuid.UUID) -> None:
    founder = get_founder(db, founder_id)
    db.delete(founder)
    db.commit()


# --- Jobs ---


def list_jobs(db: Session, startup_id: uuid.UUID) -> list[Job]:
    _get_startup(db, startup_id)
    return list(
        db.scalars(
            select(Job)
            .where(Job.startup_id == startup_id, Job.deleted_at.is_(None))
            .order_by(Job.created_at)
        ).all()
    )


def add_job(db: Session, startup_id: uuid.UUID, data: JobCreate) -> Job:
    _get_startup(db, startup_id)
    existing = db.scalar(
        select(Job).where(Job.startup_id == startup_id, Job.url == data.url).limit(1)
    ) if data.url else None
    if existing is not None:
        return existing
    job = Job(startup_id=startup_id, **data.model_dump(exclude_none=True))
    db.add(job)
    db.commit()
    return job


def get_job(db: Session, job_id: uuid.UUID) -> Job:
    row = db.get(Job, job_id)
    if row is None or row.deleted_at is not None:
        raise ScoutError("JOB_NOT_FOUND", "No job found with that id.", status_code=404)
    return row


def patch_job(db: Session, job_id: uuid.UUID, patch: JobPatch) -> Job:
    job = get_job(db, job_id)
    for field, value in patch.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    return job


def delete_job(db: Session, job_id: uuid.UUID) -> None:
    job = get_job(db, job_id)
    job.deleted_at = datetime.now(UTC)
    db.commit()


# --- Notes ---


def list_notes(db: Session, user: User, startup_id: uuid.UUID) -> list[Note]:
    return list(
        db.scalars(
            select(Note)
            .where(Note.user_id == user.id, Note.startup_id == startup_id)
            .order_by(Note.created_at.desc())
        ).all()
    )


def add_note(db: Session, user: User, startup_id: uuid.UUID, body: str, founder_id: uuid.UUID | None = None) -> Note:
    note = Note(user_id=user.id, startup_id=startup_id, founder_id=founder_id, body=body)
    db.add(note)
    db.commit()
    return note