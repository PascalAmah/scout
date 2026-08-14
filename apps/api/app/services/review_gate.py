"""review_gate — the server-side gate that blocks export/send of AI-generated
content until the user explicitly reviews it.

Generated rows (``resume_versions``, ``outreach``) carry a ``reviewed_at`` that
starts ``null``. Any action that exports or sends that content — the resume PDF
download, the outreach ``sent`` transition — is refused with a ``409
NOT_REVIEWED`` until the user calls ``POST .../review`` from the diff-view UI.
This is a deliberate human-in-the-loop action; the generation job itself never
sets it (AI_DESIGN: human in the loop for anything that touches real apps).
"""

from datetime import UTC, datetime
from typing import Protocol, TypeVar

from sqlalchemy.orm import Session

from app.core.errors import ScoutError


class Reviewable(Protocol):
    reviewed_at: datetime | None


T = TypeVar("T", bound=Reviewable)  # noqa: UP047  # venv runs 3.10; PEP 695 would break it


def require_reviewed(obj) -> None:
    """Raise 409 NOT_REVIEWED if ``obj`` has no ``reviewed_at``."""
    if obj is None or getattr(obj, "reviewed_at", None) is None:
        raise ScoutError(
            "NOT_REVIEWED",
            "This generated content must be reviewed before it can be downloaded or sent.",
            status_code=409,
        )


def mark_reviewed(db: Session, obj: T) -> T:  # noqa: UP047  # PEP 695 would break the 3.10 venv
    """Explicitly mark a generated row as reviewed (idempotent)."""
    now = datetime.now(UTC)
    if obj.reviewed_at is None:
        obj.reviewed_at = now
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj