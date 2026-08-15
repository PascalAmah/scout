from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

StructuredData = JSON().with_variant(JSONB(), "postgresql")


class CVProfile(Base):
    __tablename__ = "cv_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Multiple profiles per user (Phase 6.2): ``name`` is unique per user, and
    # ``is_default`` marks the profile matches/resume generation anchor to.
    name: Mapped[str] = mapped_column(String(60), nullable=False, default="Default")
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    raw_text: Mapped[str | None] = mapped_column(String, nullable=True)
    structured_data: Mapped[dict[str, Any] | None] = mapped_column(StructuredData, nullable=True)
    source_file_key: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    last_embedded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "name", name="uq_cv_profiles_user_name"),
        # At most one default per user; the partial index enforces it in DB.
        Index(
            "ix_cv_profiles_one_default",
            "user_id",
            unique=True,
            postgresql_where=text("is_default"),
            sqlite_where=text("is_default"),
        ),
    )