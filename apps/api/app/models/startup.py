from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, JSON, Date, DateTime, Index, Numeric, String, Uuid, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.founder import Founder
    from app.models.job import Job
    from app.models.saved_startup import SavedStartup

Tags = ARRAY(String).with_variant(JSON, "sqlite")


class Startup(Base):
    __tablename__ = "startups"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    website: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    stage: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    funding_total_usd: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    last_funding_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    hiring_status: Mapped[str] = mapped_column(String(20), nullable=False, default="unknown", index=True)
    summary: Mapped[str | None] = mapped_column(String, nullable=True)
    tech_stack: Mapped[list[str] | None] = mapped_column(Tags, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(Tags, nullable=True)
    source: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    last_enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    founders: Mapped[list[Founder]] = relationship(back_populates="startup", cascade="all, delete-orphan")
    jobs: Mapped[list[Job]] = relationship(back_populates="startup", cascade="all, delete-orphan")
    saved_entries: Mapped[list[SavedStartup]] = relationship(back_populates="startup", cascade="all, delete-orphan")

    __table_args__ = (
        Index(
            "uq_startups_website",
            "website",
            unique=True,
            sqlite_where=text("website IS NOT NULL"),
            postgresql_where=text("website IS NOT NULL"),
        ),
        Index("ix_startups_tags_gin", "tags", postgresql_using="gin"),
    )