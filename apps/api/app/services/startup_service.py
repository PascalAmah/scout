import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ScoutError
from app.core.pagination import page_page
from app.models import (
    EnrichmentJob,
    Founder,
    Job,
    MatchScore,
    Note,
    SavedStartup,
    Startup,
    StartupEmbedding,
    User,
)
from app.schemas.startup import (
    FounderCreate,
    FounderPatch,
    JobCreate,
    JobPatch,
    StartupCreate,
    StartupDetail,
    StartupListItem,
    StartupOut,
    StartupPatch,
)
from app.services import job_queue
from app.services.embedding import embed_query
from app.services.job_relevance import TIER_ORDER, is_relevant, score_relevance


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


def _normalize_url_origin(url: str | None) -> str | None:
    """Extract scheme + host from a URL for cross-path deduplication.

    ``https://job-boards.greenhouse.io/remotecom`` and
    ``https://job-boards.greenhouse.io/remotecom/jobs/123`` both normalise
    to ``https://job-boards.greenhouse.io`` so they match during dedup.
    """
    if not url:
        return None
    try:
        from urllib.parse import urlparse

        p = urlparse(url)
        if p.scheme and p.hostname:
            return f"{p.scheme}://{p.hostname}"
    except Exception:
        pass
    return url.lower()


def _find_existing(db: Session, data: StartupCreate) -> Startup | None:
    """Find an existing startup that matches the incoming data.

    Matches by website origin (scheme + host only, ignoring path) so that
    saves from different pages of the same Greenhouse/Lever board resolve to
    the same startup.  Also matches by exact source_url as a fallback.
    """
    conditions = []
    if data.website:
        incoming_origin = _normalize_url_origin(data.website)
        if incoming_origin:
            # Use ``LIKE 'scheme://host%'`` so both normalised stored values
            # (e.g. "https://job-boards.greenhouse.io") and legacy full-path
            # values (e.g. "https://job-boards.greenhouse.io/remotecom") match.
            conditions.append(
                func.lower(Startup.website).like(f"{incoming_origin.lower()}%")
            )
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
        website=_normalize_url_origin(data.website) or data.website,
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


def create_and_enrich(db: Session, user: User, data: StartupCreate) -> dict:
    """Create a startup, queue enrichment, and return the serialized payload.

    Web save path: keeps enrichment triggering + response serialization out of
    the router, so idempotency-keyed callers store the exact payload returned.
    """
    startup, _saved, _already = create_startup(db, user, data)
    trigger_enrich(db, user, startup.id)
    return StartupOut.model_validate(startup).model_dump(mode="json")


def list_saved(
    db: Session,
    user: User,
    stage: str | None,
    hiring_status: str | None,
    tags: list[str] | None,
    source: str | None,
    q: str | None,
    page: int,
    limit: int,
) -> tuple[list[SavedStartup], int, str | None]:
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
        stmt = stmt.where(Startup.tags.op("&&")(tags))
    if source:
        stmt = stmt.where(Startup.source == source)
    if q:
        stmt = stmt.where(
            or_(Startup.name.ilike(f"%{q}%"), Startup.summary.ilike(f"%{q}%"))
        )
    return page_page(db, stmt, SavedStartup.created_at, SavedStartup.id, page, limit)


def _keyword_score(startup: Startup, tokens: list[str]) -> float:
    """Relevance from exact term hits in name / summary / tags. 0..1."""
    if not tokens:
        return 0.0
    name_l = (startup.name or "").lower()
    summary_l = (startup.summary or "").lower()
    tags_l = " ".join(startup.tags or []).lower()
    hits = 0.0
    for token in tokens:
        if token in name_l:
            hits += 2
        elif token in tags_l:
            hits += 1.5
        elif token in summary_l:
            hits += 1
    return min(1.0, hits / (2 * len(tokens)))


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = sum(x * x for x in a) ** 0.5 or 1.0
    nb = sum(x * x for x in b) ** 0.5 or 1.0
    return dot / (na * nb)


def hybrid_search(
    db: Session,
    user: User,
    q: str,
    page: int,
    limit: int,
) -> tuple[list[SavedStartup], int, str | None]:
    """Blend keyword and semantic relevance across the user's saved startups.

    Returns (rows, total, next_page) sorted by combined score (desc), with
    offset-based page pagination. Semantic leg uses the query embedding against
    ``startup_embeddings``; when no embedding exists (not enriched / fallback
    dims mismatch) the row ranks on keyword only. Safe with sqlite in tests
    (no pgvector operator used)."""
    tokens = [t for t in q.lower().split() if t]
    query_vec, _model = embed_query(q)
    embed_map: dict[uuid.UUID, list[float]] = {}
    for row in db.scalars(select(StartupEmbedding)).all():
        embed_map[row.startup_id] = row.embedding

    rows = list(
        db.scalars(
            select(SavedStartup)
            .join(Startup, Startup.id == SavedStartup.startup_id)
            .where(
                SavedStartup.user_id == user.id,
                SavedStartup.status != "archived",
                Startup.deleted_at.is_(None),
            )
            .options(selectinload(SavedStartup.startup))
            .order_by(SavedStartup.created_at.desc())
        ).all()
    )

    scored: list[tuple[float, datetime, SavedStartup]] = []
    for saved in rows:
        startup = saved.startup
        keyword = _keyword_score(startup, tokens)
        vec = embed_map.get(startup.id)
        semantic = _cosine(query_vec, vec) if vec else 0.0
        score = 0.6 * keyword + 0.4 * semantic
        # Keyword hits always surface; pure-semantic ties are ordered by recency.
        if score > 0:
            scored.append((score, saved.created_at, saved))
    scored.sort(key=lambda item: (-item[0], -item[1].timestamp(), str(item[2].id)))

    total = len(scored)
    start = (page - 1) * limit
    page_rows = [item[2] for item in scored[start : start + limit]]
    next_page = page + 1 if start + limit < total else None
    return page_rows, total, next_page


# --- Workspace list ---


def _target_roles(user: User) -> list[str]:
    """The user's onboarding target roles, if they completed the wizard."""
    prefs = user.preferences or {}
    roles = prefs.get("target_roles")
    if not isinstance(roles, list):
        return []
    return [role for role in roles if isinstance(role, str) and role.strip()]


def _annotate_relevance(startup: Startup, user: User) -> list[str]:
    """Set ``job.relevance`` on each of the startup's jobs; returns the tiers.

    Jobs without target roles for the user keep ``relevance=None`` and no
    re-ordering happens.
    """
    target_roles = _target_roles(user)
    if not target_roles:
        return []
    tiers: list[str] = []
    for job in startup.jobs:
        tier = score_relevance(job.title, target_roles)
        job.relevance = tier  # type: ignore[attr-defined]  # transient, like match_score
        tiers.append(tier)
    # Interesting roles first; stable within a tier (enrichment order).
    startup.jobs.sort(key=lambda job: TIER_ORDER.get(getattr(job, "relevance", None) or "none", 3))
    return tiers


def _startup_fields(startup: Startup) -> dict:
    return {
        "id": startup.id,
        "name": startup.name,
        "website": startup.website,
        "stage": startup.stage,
        "hiring_status": startup.hiring_status,
        "summary": startup.summary,
        "tags": startup.tags,
        "tech_stack": startup.tech_stack,
        "source": startup.source,
        "source_url": startup.source_url,
        "last_enriched_at": startup.last_enriched_at,
        "created_at": startup.created_at,
        "updated_at": startup.updated_at,
    }


def _open_and_matching_role_counts(
    db: Session, user: User, startup_ids: list[uuid.UUID]
) -> tuple[dict[uuid.UUID, int], dict[uuid.UUID, int]]:
    """Count each startup's open roles and how many match the user's interests."""
    open_roles: dict[uuid.UUID, int] = {}
    matching_roles: dict[uuid.UUID, int] = {}
    if not startup_ids:
        return open_roles, matching_roles
    rows = db.execute(
        select(Job.startup_id, func.count(Job.id))
        .where(
            Job.startup_id.in_(startup_ids),
            Job.deleted_at.is_(None),
            Job.status != "closed",
        )
        .group_by(Job.startup_id)
    ).all()
    open_roles = {startup_id: count for startup_id, count in rows}
    target_roles = _target_roles(user)
    if target_roles:
        title_rows = db.execute(
            select(Job.startup_id, Job.title).where(
                Job.startup_id.in_(startup_ids),
                Job.deleted_at.is_(None),
                Job.status != "closed",
            )
        ).all()
        for startup_id, title in title_rows:
            if is_relevant(score_relevance(title, target_roles)):
                matching_roles[startup_id] = matching_roles.get(startup_id, 0) + 1
    return open_roles, matching_roles


def list_workspace(
    db: Session,
    user: User,
    stage: str | None,
    hiring_status: str | None,
    tags: list[str] | None,
    source: str | None,
    q: str | None,
    page: int,
    limit: int,
) -> tuple[list[StartupListItem], int, str | None]:
    """The user's saved startups, with open + interest-relevant role counts.

    With a query term, uses hybrid (keyword + semantic) ranking; without one,
    falls back to the plain filtered list (recency-ordered) for browsing.
    Returns the ``Page`` payload pieces: (items, total, next_page).
    """
    if q:
        saved_rows, total, next_page = hybrid_search(db, user, q, page, limit)
    else:
        saved_rows, total, next_page = list_saved(
            db, user, stage, hiring_status, tags, source, q, page, limit
        )
    open_roles, matching_roles = _open_and_matching_role_counts(
        db, user, [saved.startup_id for saved in saved_rows]
    )
    data = [
        StartupListItem(
            **_startup_fields(saved.startup),
            status=saved.status,
            saved_via=saved.saved_via,
            enrichment_status=_enrichment_status(db, saved.startup),
            created_by=saved.startup.created_by,
            open_roles_count=open_roles.get(saved.startup.id, 0),
            matching_roles_count=matching_roles.get(saved.startup.id, 0),
        )
        for saved in saved_rows
    ]
    return data, total, next_page


def get_detail(db: Session, user: User, startup_id: uuid.UUID) -> Startup:
    startup = _get_startup(db, startup_id)
    _get_saved(db, user, startup_id)
    return startup


def get_detail_for_user(db: Session, user: User, startup_id: uuid.UUID) -> StartupDetail:
    """The workspace detail view for a saved startup, with jobs annotated.

    Tags each job with its match score and interest-relevance tier, then
    assembles the response payload so the router stays a thin delegate.
    """
    startup = get_detail(db, user, startup_id)
    saved = db.scalar(
        select(SavedStartup).where(
            SavedStartup.user_id == user.id, SavedStartup.startup_id == startup_id
        )
    )
    job_ids = [job.id for job in startup.jobs]
    score_map: dict[uuid.UUID, float] = {}
    if job_ids:
        score_map = {
            row[0]: float(row[1])
            for row in db.execute(
                select(MatchScore.job_id, MatchScore.score).where(
                    MatchScore.user_id == user.id, MatchScore.job_id.in_(job_ids)
                )
            ).all()
        }
    for job in startup.jobs:
        job.match_score = score_map.get(job.id)
    _annotate_relevance(startup, user)
    return StartupDetail(
        **_startup_fields(startup),
        status=saved.status if saved else "saved",
        enrichment_status=_enrichment_status(db, startup),
        founders=startup.founders,
        jobs=startup.jobs,
        notes=list_notes(db, user, startup_id),
    )


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
    # Dedupe by URL when present (roles link to distinct pages); otherwise fall
    # back to title so re-saving a listing never stacks duplicate roles.
    existing = None
    if data.url:
        existing = db.scalar(
            select(Job).where(Job.startup_id == startup_id, Job.url == data.url).limit(1)
        )
    if existing is None and data.title:
        existing = db.scalar(
            select(Job)
            .where(Job.startup_id == startup_id, func.lower(Job.title) == data.title.lower())
            .limit(1)
        )
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