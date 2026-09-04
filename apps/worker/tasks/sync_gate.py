"""sync_gate — the hard compliance gate for server-initiated sync jobs.

ARCHITECTURE.md (Data Sourcing & Compliance): ``sync_company`` is hard-gated
to ``direct_api`` and ``permitted_crawl`` sources — enforced in the job
dispatcher from the ``source_registry`` table (the reviewed config entry),
never left to adapter conventions. ``restricted`` sources (LinkedIn) and
``user_capture``-only sources (Wellfound, manual) are refused with a loud
error; flipping a source's tier or status in the registry is all it takes to
stop or start its sync.
"""

import logging
from typing import Any

from app.models.source_registry import SYNC_ELIGIBLE_TIERS, SourceRegistry
from sqlalchemy import select
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class SyncBlockedError(Exception):
    """Raised when a source is not eligible for server-initiated sync."""


def load_source_config(db: Session, source: str) -> SourceRegistry | None:
    return db.scalar(
        select(SourceRegistry).where(SourceRegistry.source_key == source)
    )


def assert_sync_allowed(source: str, tier: str, status: str = "active") -> None:
    """Raise :class:`SyncBlockedError` when the source may not be synced."""
    if status != "active":
        raise SyncBlockedError(
            f"sync blocked for source '{source}': source_status is '{status}', not 'active'"
        )
    if tier not in SYNC_ELIGIBLE_TIERS:
        raise SyncBlockedError(
            f"sync blocked for source '{source}': compliance_tier '{tier}' is not "
            f"sync-eligible ({sorted(SYNC_ELIGIBLE_TIERS)})"
        )


def block_reason(source: str, config: Any | None) -> str:
    """Human-readable reason a source can't be synced, or \"\" if it can."""
    if config is None:
        return f"source '{source}' has no source_registry entry"
    try:
        assert_sync_allowed(source, config.compliance_tier, config.source_status)
    except SyncBlockedError as exc:
        return str(exc)
    return ""
