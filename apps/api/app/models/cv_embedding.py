from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector  # type: ignore[import-not-found]
from sqlalchemy import DateTime, ForeignKey, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CVEmbedding(Base):
    __tablename__ = "cv_embeddings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    cv_profile_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("cv_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    embedding: Mapped[list[float]] = mapped_column(Vector(3072), nullable=False)
    model: Mapped[str] = mapped_column(
        String(100), nullable=False, server_default="text-embedding-3-large"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )