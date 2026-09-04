"""Analytics schemas — Insight Layer (Phase 5)."""

from datetime import datetime

from pydantic import BaseModel


class RatePoint(BaseModel):
    """One weekly bucket of the response-rate-over-time series."""

    bucket: str  # ISO date of the week start
    applied: int
    responses: int
    rate: float | None  # responses / applied * 100; null when applied == 0


class AnalyticsSummaryOut(BaseModel):
    period_start: datetime
    period_end: datetime
    applications_sent: int  # reached "applied" within the period
    applications_sent_prev: int
    response_rate: float | None
    response_rate_prev: float | None
    applied_to_interview: float | None
    applied_to_interview_prev: float | None
    offers: int
    offers_prev: int
    by_status: dict[str, int]  # current-status counts (archived excluded)
    response_rate_series: list[RatePoint]


class FunnelStageOut(BaseModel):
    stage: str  # saved | interested | applied | interview | offer
    count: int  # applications that reached at least this stage


class FunnelConversionOut(BaseModel):
    from_stage: str
    to_stage: str
    rate: float | None  # to/from * 100; null when from == 0


class FunnelOut(BaseModel):
    stages: list[FunnelStageOut]
    conversions: list[FunnelConversionOut]


class StageResponseTime(BaseModel):
    """Average days from first outreach to a recorded reply, by company stage
    (mockup "Time to first response" panel)."""

    stage: str
    avg_days: float
    sample: int
