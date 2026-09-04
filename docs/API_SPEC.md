# API_SPEC.md

# Scout API Specification

## Overview
The Scout API is a FastAPI service exposing REST endpoints consumed by the React web app and the browser extension. This document is the human-readable contract; the source of truth at runtime is FastAPI's generated OpenAPI schema at `/openapi.json`, from which `packages/types` is generated for the frontend.

- Base URL: `https://api.scout.app/v1`
- Format: JSON (`application/json`)
- Auth: Bearer JWT (`Authorization: Bearer <access_token>`), except where noted public
- Errors: consistent envelope (see below)
- Pagination: cursor-based on list endpoints

## Conventions

### Error Envelope
```json
{
  "error": {
    "code": "STARTUP_NOT_FOUND",
    "message": "No startup found with that id.",
    "details": {}
  }
}
```
Standard HTTP status codes are used (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`). `422` is reserved for Pydantic validation errors and returns FastAPI's default validation error shape under `error.details`.

### Pagination
List endpoints accept `?cursor=<opaque>&limit=<n, default 25, max 100>` and return:
```json
{
  "data": [ ... ],
  "next_cursor": "opaque-string-or-null"
}
```

### Idempotency
Mutating endpoints that may be retried by the extension (e.g. `POST /startups`) accept an optional `Idempotency-Key` header; duplicate keys within 24h return the original response instead of creating a duplicate row.

## Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create account | Public |
| POST | `/auth/login` | Email/password login → access + refresh token | Public |
| POST | `/auth/refresh` | Exchange refresh token for new access token | Public (refresh token) |
| POST | `/auth/logout` | Revoke refresh token | User |
| GET | `/auth/me` | Current user profile (includes `onboarding_completed_at`, `preferences`) | User |
| POST | `/auth/onboarding/complete` | Save wizard answers + stamp onboarding completion | User |
| POST | `/auth/password/reset-request` | Send reset email | Public |
| POST | `/auth/password/reset` | Complete reset with token | Public |

`POST /auth/login` request/response:
```json
// Request
{ "email": "jane@example.com", "password": "..." }

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": { "id": "uuid", "email": "jane@example.com", "full_name": "Jane Doe" }
}
```

## Startups

| Method | Path | Description |
|---|---|---|
| GET | `/startups` | List/search startups (filters: `stage`, `tags`, `hiring_status`, `q`) |
| POST | `/startups` | Create/save a startup (from extension or manual entry) |
| GET | `/startups/{id}` | Get startup detail (includes founders, jobs, notes) |
| PATCH | `/startups/{id}` | Update fields (notes, tags, status) |
| DELETE | `/startups/{id}` | Soft-delete (unsave) |
| POST | `/startups/{id}/enrich` | Trigger/re-trigger enrichment job |
| GET | `/startups/{id}/enrichment-status` | Poll enrichment job status |

`POST /startups` request:
```json
{
  "name": "Lumina Health",
  "website": "https://lumina.example.com",
  "source": "yc",
  "source_url": "https://ycombinator.com/companies/lumina",
  "tags": ["robotics", "hardware"]
}
```
Response `201`:
```json
{
  "id": "uuid",
  "name": "Lumina Health",
  "stage": null,
  "hiring_status": "unknown",
  "enrichment_status": "queued",
  "created_at": "2026-07-31T12:00:00Z"
}
```

## Founders

| Method | Path | Description |
|---|---|---|
| GET | `/startups/{id}/founders` | List founders for a startup |
| POST | `/startups/{id}/founders` | Add a founder (manual or extension save) |
| PATCH | `/founders/{id}` | Update founder fields |
| DELETE | `/founders/{id}` | Remove founder |

## Jobs

| Method | Path | Description |
|---|---|---|
| GET | `/startups/{id}/jobs` | List jobs for a startup |
| POST | `/startups/{id}/jobs` | Save a job posting |
| GET | `/jobs/{id}` | Job detail |
| PATCH | `/jobs/{id}` | Update job fields |
| DELETE | `/jobs/{id}` | Remove job |
| GET | `/jobs/recommended` | Ranked jobs for the current user (matching pipeline) |

`GET /jobs/recommended` response:
```json
{
  "data": [
    {
      "job_id": "uuid",
      "startup_id": "uuid",
      "title": "Backend Engineer",
      "score": 87.5,
      "confidence_band": "strong",
      "explanation": {
        "matched_skills": ["Python", "FastAPI", "PostgreSQL"],
        "gaps": ["Kubernetes"],
        "summary": "Strong overlap with recent backend + API work."
      }
    }
  ],
  "next_cursor": null
}
```
`score` and `explanation` are returned together by design — there is no lighter-weight endpoint that returns a bare score. An overconfident or wrong fit score can actively mislead a user into over- or under-investing in an application, so `confidence_band` (`strong`/`moderate`/`weak`, derived in `AI_DESIGN.md`'s scoring stage) is always present alongside the numeric score, and `explanation.gaps` is a required field, not optional — a response with matches but no gaps is treated as a scoring-prompt bug, not a valid "perfect fit" result.

## CV / Matching

| Method | Path | Description |
|---|---|---|
| POST | `/cv` | Upload/replace CV (multipart file or raw text) |
| GET | `/cv` | Get current parsed CV profile |
| POST | `/match/compute` | Force recompute match scores (rate-limited) |
| GET | `/match/{job_id}` | Get match score + explanation for a specific job |

## Resume Studio

| Method | Path | Description |
|---|---|---|
| GET | `/resumes` | List resumes |
| POST | `/resumes` | Create a base resume |
| GET | `/resumes/{id}/versions` | List generated versions |
| POST | `/resumes/{id}/generate` | Generate a tailored version for a job/application |
| GET | `/resume-versions/{id}` | Get a specific generated version |
| POST | `/resume-versions/{id}/review` | Mark a generated version reviewed (required before download/send) |
| GET | `/resume-versions/{id}/download` | Signed URL for the rendered PDF — `409` if not yet reviewed |
| POST | `/outreach/generate` | Generate cover letter / intro email / LinkedIn DM |
| POST | `/outreach/{id}/review` | Mark generated outreach reviewed (required before marking sent) |
| PATCH | `/outreach/{id}` | Update outreach fields/status (e.g. `draft` → `sent`) |

### Review Gate
Generated content is grounded in the base CV (`AI_DESIGN.md`'s no-fabrication constraint), but grounding reduces hallucination risk, it doesn't eliminate it. So every `resume_versions` and `outreach` row carries a `reviewed_at` field that starts `null`, and any action that exports or sends generated content is blocked server-side until it's set:
- `GET /resume-versions/{id}/download` → `409 { "error": { "code": "NOT_REVIEWED" } }` if `reviewed_at` is null
- `PATCH /outreach/{id}` transitioning `status` to `sent` returns the same `409` if `reviewed_at` is null on that outreach row
- `POST .../review` is a deliberate, explicit user action from the diff view (`UI_UX.md: Resume Studio`) — it is never set automatically by the generation job itself

`POST /resumes/{id}/generate` request:
```json
{
  "application_id": "uuid",
  "job_id": "uuid",
  "tone": "concise",
  "emphasize": ["backend", "leadership"]
}
```
Response `202` (async — generation runs as a background job):
```json
{ "job_id": "uuid", "status": "queued" }
```

`POST /outreach/generate` request:
```json
{
  "application_id": "uuid",
  "channel": "linkedin_dm"
}
```

## CRM / Applications

| Method | Path | Description |
|---|---|---|
| GET | `/applications` | List applications (filter by `status`) |
| POST | `/applications` | Create application record |
| GET | `/applications/{id}` | Application detail (includes outreach, resume version used) |
| PATCH | `/applications/{id}` | Update status/notes |
| DELETE | `/applications/{id}` | Archive |
| GET | `/applications/pipeline` | Kanban-style grouped view by status |

Status transitions are validated server-side against the allowed state machine: `saved → interested → applied → interview → offer|rejected`, with `archived` reachable from any state.

## Analytics

| Method | Path | Description |
|---|---|---|
| GET | `/analytics/summary` | Applications, response rate, interviews, offers over a date range |
| GET | `/analytics/funnel` | Conversion funnel across CRM statuses |

## Extension-Specific

| Method | Path | Description |
|---|---|---|
| POST | `/extension/detect` | Given a URL, return whether it's a supported source and what entity type it looks like |
| POST | `/extension/quick-save` | One-shot save (startup + job + founder in a single payload from a scraped page) |

Both endpoints are the *only* server-side entry point for `restricted`-tier sources like LinkedIn (see `ARCHITECTURE.md: Data Sourcing & Compliance`) — the payload is accepted because it results from explicit user action on a page already open in their browser, not from a server-initiated fetch. `/extension/detect` response includes the source's compliance tier so the extension UI can reflect capture-only vs. auto-enrichable sources correctly.

## Jobs / Background Status

| Method | Path | Description |
|---|---|---|
| GET | `/jobs-status/{job_id}` | Poll status of any async job (enrichment, generation, matching) |

Response:
```json
{
  "job_id": "uuid",
  "job_type": "generate_resume",
  "status": "running",
  "started_at": "2026-07-31T12:00:00Z",
  "finished_at": null,
  "error": null
}
```

For clients that prefer push over polling, `/ws/jobs` (WebSocket) or SSE at `/jobs-status/stream` may be added post-MVP — see `ROADMAP.md`.

## Rate Limits
- Default: 100 requests/min per user (Redis token bucket)
- AI-heavy endpoints (`/match/compute`, `/resumes/{id}/generate`, `/outreach/generate`): 10 requests/min per user
- `429` responses include `Retry-After` header

## Versioning
- URL-prefixed (`/v1`); breaking changes ship as `/v2` with a deprecation window on `/v1`
- Additive, backward-compatible changes (new optional fields) do not bump the version
