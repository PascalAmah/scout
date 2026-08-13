from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.startup import Startup


class SavedStartup(Base):
    __tablename__ = "saved_startups"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    startup_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("startups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="saved")
    saved_via: Mapped[str] = mapped_column(String(20), nullable=False, default="web")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    startup: Mapped[Startup] = relationship(back_populates="saved_entries")

    __table_args__ = (UniqueConstraint("user_id", "startup_id", name="uq_saved_startups_user_startup"),)