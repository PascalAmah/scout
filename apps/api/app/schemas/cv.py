import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CVProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    raw_text: str | None
    structured_data: dict[str, Any] | None
    source_file_key: str | None
    last_embedded_at: datetime | None
    created_at: datetime
    updated_at: datetime


class MatchExplanation(BaseModel):
    """Full (Phase 3.1) explanation shape. In Phase 2 the API returns it as
    ``null`` — see the temporary contract deviation flagged in Scout_Build_Plan."""

    matched_skills: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    summary: str


class ComputeMatchOut(BaseModel):
    status: str
    computed_scores: int


class MatchOut(BaseModel):
    """A ranked job with its cached fit score.

    ``confidence_band`` and ``explanation`` are nullable precisely because Phase 2
    ships embedding-only Stage 1 scores; the Phase 3.1 re-rank fills them in.
    """

    job_id: uuid.UUID
    startup_id: uuid.UUID
    startup_name: str
    title: str
    description: str | None = None
    location: str | None = None
    remote: bool | None = None
    employment_type: str | None = None
    seniority: str | None = None
    url: str | None = None
    status: str | None = None
    score: float
    confidence_band: str | None = None
    explanation: MatchExplanation | None = None