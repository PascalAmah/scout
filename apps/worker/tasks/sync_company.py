"""sync_company task — server-initiated company sync (Phase 6).

The dispatcher for periodic source sync. Two modes:

- ``sync_company(source, url=...)`` — sync one known company page.
- ``sync_company(source, discovery=True)`` — discover companies via the
  adapter (sitemap / API) and enqueue enrichment for each.

Compliance is enforced at dispatch time: the source's ``compliance_tier`` is
read from ``source_registry`` and must be ``direct_api`` or
``permitted_crawl`` (``sync_gate``), and ``permitted_crawl`` fetches are
gated on the target domain's robots.txt. ``restricted`` (LinkedIn) and
``user_capture``-only (Wellfound) sources are refused loudly.
"""

import logging
import time
import uuid

from celery import shared_task
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Permitted-crawl pacing: one request per item, per ARCHITECTURE.md's
# "rate-limited" requirement for server-initiated crawls.
CRAWL_PACING_SECONDS = 1.0
MAX_DISCOVERY_BATCH = 100


def _session():
    from app.db.session import SessionLocal

    return SessionLocal()


def _blocked(reason: str) -> dict:
    logger.error("sync_company blocked: %s", reason)
    return {"status": "blocked", "reason": reason}


def _upsert_startup(db, source: str, url: str, name: str | None) -> uuid.UUID | None:
    from app.models import Startup

    existing = db.scalar(
        select(Startup).where(Startup.source == source, Startup.source_url == url).limit(1)
    )
    if existing is not None:
        return existing.id
    row = Startup(
        name=name or url.rstrip("/").rsplit("/", 1)[-1].replace("-", " ").title() or "Unknown",
        source=source,
        source_url=url,
        website=url,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row.id


def _enqueue_enrich(startup_id: uuid.UUID, job_type: str = "enrich_startup") -> None:
    from app.services.job_queue import enqueue_enrich_startup

    # No user context for server-initiated sync — notifications only fire for
    # user-initiated enrichments.
    enqueue_enrich_startup(startup_id, None)


def _sync_one(db, source: str, adapter, url: str) -> dict:
    from tasks.robots import robots_allows

    if getattr(adapter, "compliance_tier", None) == "permitted_crawl" and not robots_allows(url):
        return _blocked(f"robots.txt disallows {url}")

    content = adapter.fetch(url)
    if not content.raw_text.strip():
        return {"status": "failed", "error": f"empty content fetched from {url}"}

    startup_id = _upsert_startup(db, source, url, content.title)
    _enqueue_enrich(startup_id)
    return {"status": "enqueued", "startup_id": str(startup_id)}


def _run_discovery(db, source: str, adapter) -> dict:
    from tasks.robots import robots_allows

    try:
        items = adapter.discover()
    except Exception as exc:
        logger.exception("discovery failed for %s", source)
        return {"status": "failed", "error": str(exc)[:500]}

    enqueued = 0
    for item in items[:MAX_DISCOVERY_BATCH]:
        url = item.get("url")
        if not url:
            continue
        if getattr(adapter, "compliance_tier", None) == "permitted_crawl":
            if not robots_allows(url):
                logger.warning("robots.txt disallows %s — skipping", url)
                continue
            time.sleep(CRAWL_PACING_SECONDS)
        try:
            startup_id = _upsert_startup(db, source, url, item.get("name"))
            _enqueue_enrich(startup_id)
            enqueued += 1
        except Exception:
            logger.exception("failed to enqueue %s from %s", url, source)
    return {"status": "succeeded", "discovered": len(items[:MAX_DISCOVERY_BATCH]), "enqueued": enqueued}


@shared_task(name="sync_company", bind=True, max_retries=2, default_retry_delay=300)
def sync_company(self, source: str, url: str | None = None, discovery: bool = False) -> dict:
    from adapters import get_adapter
    from tasks.sync_gate import block_reason, load_source_config

    db = _session()
    try:
        config = load_source_config(db, source)
        reason = block_reason(source, config)
        if reason:
            return _blocked(reason)

        adapter = get_adapter(source)
        if adapter is None:
            return _blocked(f"no adapter registered for source '{source}'")

        if discovery:
            return _run_discovery(db, source, adapter)
        if not url:
            return {"status": "failed", "error": "url is required for single-company sync"}
        return _sync_one(db, source, adapter, url)
    except Exception as exc:
        logger.exception("sync_company failed for source %s", source)
        try:
            self.retry(exc=exc)
        except Exception:
            return {"status": "failed", "error": str(exc)[:500]}
    finally:
        db.close()
    return {"status": "failed"}
