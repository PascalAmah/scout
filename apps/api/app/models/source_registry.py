"""source_registry — compliance-tier config per acquisition source.

ARCHITECTURE.md (Data Sourcing & Compliance): every source is classified into
one of four tiers, and only ``direct_api`` / ``permitted_crawl`` sources are
eligible for server-initiated jobs (``sync_company``). The tier is a reviewed
config entry (``source_status``, ``source_terms_checked_at``), not a constant
in adapter code — ``sync_company`` reads this table at dispatch time and
hard-gates on it.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

COMPLIANCE_TIERS = frozenset({"direct_api", "user_capture", "permitted_crawl", "restricted"})
# The only tiers eligible for server-initiated sync (ARCHITECTURE.md).
SYNC_ELIGIBLE_TIERS = frozenset({"direct_api", "permitted_crawl"})


class SourceRegistry(Base):
    __tablename__ = "source_registry"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    source_key: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    compliance_tier: Mapped[str] = mapped_column(String(20), nullable=False)
    source_status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    base_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    source_terms_checked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
