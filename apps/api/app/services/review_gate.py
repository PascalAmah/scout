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
from typing import Protocol, cast

from sqlalchemy.orm import Session

from app.core.errors import ScoutError


class _HasReviewedAt(Protocol):
    """Runtime shape of a review-gated row.

    ``Outreach.reviewed_at`` and ``ResumeVersion.reviewed_at`` are declared as
    ``Mapped[datetime | None]`` columns but hold a plain ``datetime | None`` at
    runtime. Casting to this value-typed protocol lets mypy accept both reading
    and writing the timestamp without binding the generic type parameter to a
    ``Mapped``-typed protocol (which mypy can't structurally-solve for ORM
    models).
    """

    reviewed_at: datetime | None


def require_reviewed(obj: object) -> None:
    """Raise 409 NOT_REVIEWED if ``obj`` has no ``reviewed_at``."""
    if obj is None or getattr(obj, "reviewed_at", None) is None:
        raise ScoutError(
            "NOT_REVIEWED",
            "This generated content must be reviewed before it can be downloaded or sent.",
            status_code=409,
        )


def mark_reviewed[T](db: Session, obj: T) -> T:
    """Explicitly mark a generated row as reviewed (idempotent).

    ``T`` is inferred from the caller's concrete model (``Outreach`` or
    ``ResumeVersion``) so the original type is preserved on the way out.
    """
    row = cast(_HasReviewedAt, obj)
    now = datetime.now(UTC)
    if row.reviewed_at is None:
        row.reviewed_at = now
        db.add(obj)
        db.commit()
        db.refresh(obj)
    return obj
