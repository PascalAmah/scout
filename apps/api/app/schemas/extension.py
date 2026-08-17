import uuid

from pydantic import BaseModel, Field


class DetectRequest(BaseModel):
    url: str = Field(min_length=1)


class DetectedStartup(BaseModel):
    name: str | None = None
    website: str | None = None
    company_url: str | None = None


class DetectedJob(BaseModel):
    title: str | None = None
    url: str | None = None


class DetectResponse(BaseModel):
    supported: bool
    source: str
    compliance_tier: str
    entity_type: str
    startup: DetectedStartup | None = None
    job: DetectedJob | None = None
    message: str | None = None


class QuickSaveFounder(BaseModel):
    name: str | None = None
    title: str | None = None
    linkedin_url: str | None = None
    twitter_url: str | None = None
    bio: str | None = None


class QuickSaveJob(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    location: str | None = None
    remote: bool | None = None
    employment_type: str | None = None
    seniority: str | None = None
    url: str | None = None


class QuickSaveStartup(BaseModel):
    name: str | None = None
    website: str | None = None
    company_url: str | None = None
    tags: list[str] = Field(default_factory=list)


class QuickSaveRequest(BaseModel):
    source: str
    source_url: str = Field(min_length=1)
    startup: QuickSaveStartup
    job: QuickSaveJob | None = None
    founder: QuickSaveFounder | None = None
    founders: list[QuickSaveFounder] = Field(default_factory=list)


class QuickSaveResponse(BaseModel):
    startup_id: uuid.UUID
    job_id: uuid.UUID | None = None
    founder_id: uuid.UUID | None = None
    founder_ids: list[uuid.UUID] = Field(default_factory=list)
    already_saved: bool
    saved_via: str
    enrichment_status: str