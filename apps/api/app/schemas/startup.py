import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StartupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    website: str | None = Field(default=None, max_length=2048)
    source: str | None = Field(default=None, max_length=40)
    source_url: str | None = Field(default=None, max_length=2048)
    tags: list[str] = Field(default_factory=list)


class StartupPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    website: str | None = Field(default=None, max_length=2048)
    stage: str | None = Field(default=None, max_length=40)
    hiring_status: str | None = Field(default=None, max_length=20)
    tags: list[str] | None = None
    summary: str | None = None
    status: str | None = Field(default=None, max_length=20)


class StartupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    website: str | None
    stage: str | None
    hiring_status: str | None
    summary: str | None
    tags: list[str] | None
    tech_stack: list[str] | None
    source: str | None
    source_url: str | None
    last_enriched_at: datetime | None
    created_at: datetime
    updated_at: datetime


class StartupListItem(StartupOut):
    status: str
    saved_via: str
    enrichment_status: str
    created_by: uuid.UUID | None
    open_roles_count: int = 0


class FounderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    title: str | None = Field(default=None, max_length=120)
    linkedin_url: str | None = Field(default=None, max_length=2048)
    twitter_url: str | None = Field(default=None, max_length=2048)
    bio: str | None = None


class FounderPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    title: str | None = Field(default=None, max_length=120)
    linkedin_url: str | None = Field(default=None, max_length=2048)
    twitter_url: str | None = Field(default=None, max_length=2048)
    bio: str | None = None


class FounderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    name: str
    title: str | None
    linkedin_url: str | None
    twitter_url: str | None
    bio: str | None


class JobCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    location: str | None = Field(default=None, max_length=255)
    remote: bool | None = None
    employment_type: str | None = Field(default=None, max_length=30)
    seniority: str | None = Field(default=None, max_length=40)
    salary_min: float | None = None
    salary_max: float | None = None
    url: str | None = Field(default=None, max_length=2048)
    status: str | None = Field(default=None, max_length=20)


class JobPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    location: str | None = Field(default=None, max_length=255)
    remote: bool | None = None
    employment_type: str | None = Field(default=None, max_length=30)
    seniority: str | None = Field(default=None, max_length=40)
    salary_min: float | None = None
    salary_max: float | None = None
    url: str | None = Field(default=None, max_length=2048)
    status: str | None = Field(default=None, max_length=20)


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID
    title: str
    description: str | None
    location: str | None
    remote: bool | None
    employment_type: str | None
    seniority: str | None
    salary_min: float | None
    salary_max: float | None
    url: str | None
    status: str
    created_at: datetime


class NoteCreate(BaseModel):
    body: str = Field(min_length=1)
    founder_id: uuid.UUID | None = None


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    startup_id: uuid.UUID | None
    founder_id: uuid.UUID | None
    body: str
    created_at: datetime
    updated_at: datetime


class StartupDetail(StartupOut):
    status: str
    enrichment_status: str
    founders: list[FounderOut]
    jobs: list[JobOut]
    notes: list[NoteOut]

    model_config = ConfigDict(from_attributes=True)


class EnrichmentJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    job_id: uuid.UUID = Field(validation_alias="id")
    job_type: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None
    error: str | None