import logging
import uuid
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.core.errors import ScoutError
from app.models import EnrichmentJob, User
from app.schemas.extension import (
    DetectedJob,
    DetectedStartup,
    DetectResponse,
    QuickSaveRequest,
    QuickSaveResponse,
    QuickSaveStartup,
)
from app.schemas.startup import FounderCreate, JobCreate, StartupCreate
from app.services import job_queue, startup_service

logger = logging.getLogger(__name__)

# source -> compliance tier (see ARCHITECTURE.md: Data Sourcing & Compliance)
SOURCE_TIERS: dict[str, str] = {
    "yc": "direct_api",
    "generic_careers": "permitted_crawl",
    "wellfound": "direct_api",
    "workatastartup": "direct_api",
    "linkedin": "restricted",
    "manual": "user_capture",
}

SUPPORTED_SOURCES = frozenset(SOURCE_TIERS)

GENERIC_PATH_HINTS = (
    "career",
    "jobs",
    "join",
    "team",
    "people",
    "talent",
    "hiring",
    "about",
    "company",
)

YC_COMPANY = "ycombinator.com"


def _title_from_slug(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").strip().title()


def _domain_name(hostname: str) -> str:
    labels = [part for part in hostname.split(".") if part]
    if len(labels) >= 2:
        return labels[-2]
    return labels[0] if labels else hostname


def detect_url(url: str) -> DetectResponse:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    path = parsed.path or ""

    if host == YC_COMPANY or host.endswith(f".{YC_COMPANY}"):
        segments = [seg for seg in path.split("/") if seg]
        slug = segments[1] if len(segments) > 1 and segments[0] == "companies" else None
        is_job = "jobs" in segments or "job" in segments
        return DetectResponse(
            supported=True,
            source="yc",
            compliance_tier=SOURCE_TIERS["yc"],
            entity_type="job" if is_job else "startup",
            startup=DetectedStartup(
                name=_title_from_slug(slug) if slug else None,
                website=parsed.scheme + "://" + parsed.netloc if slug else None,
                company_url=f"{parsed.scheme}://{parsed.netloc}/companies/{slug}" if slug else None,
            ),
            job=DetectedJob(url=url) if is_job else None,
        )

    if host == "linkedin.com" or host.endswith(".linkedin.com"):
        return DetectResponse(
            supported=True,
            source="linkedin",
            compliance_tier=SOURCE_TIERS["linkedin"],
            entity_type="founder" if "/in/" in path else "job",
            message="LinkedIn capture saves what's on the page; enrichment runs later.",
        )

    # YC's Work at a Startup — YC-backed companies, jobs, and founders.
    if host == "www.workatastartup.com":
        segments = [seg for seg in path.split("/") if seg]
        slug = segments[1] if len(segments) > 1 and segments[0] == "companies" else None
        is_job = "jobs" in segments
        return DetectResponse(
            supported=True,
            source="workatastartup",
            compliance_tier=SOURCE_TIERS["workatastartup"],
            entity_type="job" if is_job else "startup",
            startup=DetectedStartup(
                name=_title_from_slug(slug) if slug else None,
                website=f"{parsed.scheme}://{parsed.netloc}",
                company_url=f"{parsed.scheme}://{parsed.netloc}/companies/{slug}" if slug else None,
            ),
            job=DetectedJob(url=url) if is_job else None,
        )
    if host in ("indeed.com", "glassdoor.com") or host.endswith((".indeed.com", ".glassdoor.com")):
        return DetectResponse(
            supported=False,
            source="unknown",
            compliance_tier="restricted",
            entity_type="unknown",
            message="Job board detected — manual save only.",
        )

    path_lower = path.lower()
    is_generic = any(hint in path_lower for hint in GENERIC_PATH_HINTS)
    if is_generic and host:
        is_job = any(hint in path_lower for hint in ("jobs", "job", "careers"))
        segs = [seg for seg in path_lower.split("/") if seg]
        title = _title_from_slug(segs[-1]) if segs and is_job else None
        company_url = f"{parsed.scheme}://{parsed.netloc}"
        return DetectResponse(
            supported=True,
            source="generic_careers",
            compliance_tier=SOURCE_TIERS["generic_careers"],
            entity_type="job" if is_job else "startup",
            startup=DetectedStartup(
                name=_title_from_slug(_domain_name(host)),
                website=company_url,
                company_url=company_url,
            ),
            job=DetectedJob(title=title, url=url) if is_job else None,
        )

    return DetectResponse(
        supported=False,
        source="unknown",
        compliance_tier="unknown",
        entity_type="unknown",
        message="This page doesn't look like a company or job page.",
    )


def _startup_name(data: QuickSaveStartup) -> str:
    if data.name:
        return data.name
    parsed = urlparse(data.company_url or "")
    host = (parsed.hostname or "").lower()
    return _title_from_slug(_domain_name(host)) if host else "Unknown company"


def quick_save(
    db: Session, user: User, payload: QuickSaveRequest
) -> tuple[QuickSaveResponse, bool]:
    """Perform a one-shot save. Returns (response, used_cached)."""
    source = payload.source
    if source not in SUPPORTED_SOURCES:
        raise ScoutError(
            "UNSUPPORTED_SOURCE",
            f"Source '{source}' is not a supported capture source.",
            status_code=422,
        )

    startup_data = QuickSaveStartup.model_validate(payload.startup)
    startup, saved, already = startup_service.create_startup(
        db,
        user,
        StartupCreate(
            name=_startup_name(startup_data),
            website=startup_data.website or startup_data.company_url,
            source=source,
            source_url=payload.source_url,
            tags=startup_data.tags,
        ),
        saved_via="extension",
    )

    job_id: uuid.UUID | None = None
    job_ids: list[uuid.UUID] = []
    # A listing save can carry several roles for the same startup (jobs[]) plus
    # the legacy single-job field (job) — dedupe by URL/title happens in add_job.
    roles = list(payload.jobs or [])
    if payload.job:
        roles.insert(0, payload.job)
    for job_data in roles:
        job = startup_service.add_job(
            db, startup.id, JobCreate(**job_data.model_dump(exclude_none=True))
        )
        job_ids.append(job.id)
    job_id = job_ids[0] if job_ids else None

    founder_ids: list[uuid.UUID] = []
    founders = list(payload.founders or [])
    if payload.founder:
        founders.insert(0, payload.founder)
    for founder_data in founders:
        founder = startup_service.add_founder(
            db, startup.id, FounderCreate(**founder_data.model_dump(exclude_none=True))
        )
        founder_ids.append(founder.id)
    founder_id: uuid.UUID | None = founder_ids[0] if founder_ids else None

    # Auto-enrich only for sources that are not restricted-tier (per compliance).
    # Re-saving an already-saved startup re-queues enrichment when the previous
    # run finished, so a save is also a "refresh this" signal (e.g. after the
    # worker gets a real AI key or the source page changed).
    enrichment_status = "none"
    if SOURCE_TIERS.get(source) != "restricted":
        existing_job: EnrichmentJob | None = startup_service.enrichment_status(db, startup.id)
        if existing_job is None or existing_job.status in ("succeeded", "failed"):
            enr_job = EnrichmentJob(
                user_id=user.id,
                entity_type="startup",
                entity_id=startup.id,
                job_type="enrich_startup",
                status="queued",
            )
            db.add(enr_job)
            db.commit()
            job_queue.enqueue_enrich_startup(startup.id, user.id)
        enrichment_status = "queued"

    response = QuickSaveResponse(
        startup_id=startup.id,
        job_id=job_id,
        job_ids=job_ids,
        founder_id=founder_id,
        founder_ids=founder_ids,
        already_saved=already,
        saved_via="extension",
        enrichment_status=enrichment_status,
    )
    return response, False