from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

ResumeVersionContent = JSON().with_variant(JSONB(), "postgresql")


class ResumeVersion(Base):
    """An immutable, generated, tailored snapshot of a resume.

    ``reviewed_at`` starts ``null`` and is only set by an explicit
    POST .../review from the diff-view UI — the review gate (API_SPEC) blocks
    ``download`` until it's set. It is never set by the generation task itself.
    """

    __tablename__ = "resume_versions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    resume_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    application_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("applications.id", ondelete="SET NULL"), nullable=True, index=True
    )
    content: Mapped[dict[str, Any] | None] = mapped_column(ResumeVersionContent, nullable=True)
    file_key: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    generated_by_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )