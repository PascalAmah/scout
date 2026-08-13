# ARCHITECTURE.md

# Scout Architecture

## Purpose
This document defines the technical architecture for Scout, an AI-powered workspace for discovering startup opportunities, enriching company data, matching candidates, generating personalized application assets, and tracking outreach.

## High-Level Architecture

```text
                    ┌─────────────────────┐
                    │  Browser Extension   │
                    │  (Plasmo / MV3)      │
                    └──────────┬───────────┘
                               │ REST (HTTPS)
                    ┌──────────▼───────────┐
                     │   React Web App       │
                     │  (Dashboard, Studio,  │
                     │   CRM, Assistant)     │
                    └──────────┬───────────┘
                               │ REST / SSE
                    ┌──────────▼───────────┐
                    │   FastAPI Gateway     │
                    │  (Auth middleware,    │
                    │   rate limiting)      │
                    └──────────┬───────────┘
        ┌───────────┬──────────┼──────────┬────────────┐
        ▼           ▼          ▼          ▼            ▼
    ┌───────┐  ┌─────────┐ ┌───────┐ ┌────────┐  ┌───────────┐
    │ Auth  │  │ Startup │ │  AI   │ │  CRM   │  │  Search /  │
    │ API   │  │  API    │ │ API   │ │  API   │  │  Match API │
    └───┬───┘  └────┬────┘ └───┬───┘ └───┬────┘  └─────┬─────┘
        └────────────┴──────────┴─────────┴─────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  PostgreSQL 16        │
                    │  + pgvector           │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Redis                │
                    │  (cache/broker/limits)│
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  Celery Workers       │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  OpenAI / Gemini      │
                    │  (LLM + embeddings)   │
                    └────────────────────────┘
```

Supporting infrastructure (not in the request path above): Cloudflare R2 for object storage, a scheduler (APScheduler / Celery Beat) for periodic sync jobs, and an observability stack (structured logs, metrics, error tracking) attached to every service.

## Monorepo

```text
scout/
├── apps/
│   ├── web/            # React app (Vite)
│   ├── extension/       # Plasmo extension
│   ├── api/             # FastAPI service
│   └── worker/          # Celery worker service
├── packages/
│   ├── ui/              # shared shadcn/ui components
│   ├── prompts/         # versioned LLM prompt templates
│   ├── shared/           # shared TS utilities (validation, constants)
│   └── types/            # shared TS + generated OpenAPI types
├── infrastructure/
│   ├── docker/
│   ├── terraform/        # optional IaC for Postgres/Redis/R2
│   └── migrations/       # Alembic migrations (mirrors apps/api/alembic)
├── docs/
└── .github/workflows/     # CI/CD
```

## Components

### Web Application
- React (Vite)
- TypeScript
- TanStack Router (file-based routing, type-safe)
- TanStack Query (server state, caching, background refetch)
- Tailwind CSS
- shadcn/ui
- Zustand (local UI state)

Responsibilities:
- Dashboard
- Resume Studio
- CRM
- Startup Workspace
- AI Assistant (chat-style interface over saved startups)

### Browser Extension
Built with Plasmo (Manifest V3).

Responsibilities:
- Save startup
- Save founder
- Save job
- Detect supported pages (YC, Wellfound, LinkedIn, Product Hunt, generic careers pages)
- Send structured payloads to backend via authenticated API calls (shared JWT with web app via secure storage)

For restricted sources like LinkedIn, the extension is the *only* acquisition path — see [Data Sourcing & Compliance](#data-sourcing--compliance) below. There is no server-side LinkedIn crawler; the extension only structures what's already rendered in the user's own authenticated session, on explicit user action.

### Backend API
FastAPI provides:
- Authentication
- Startup CRUD
- Search
- Resume generation
- Matching
- AI orchestration
- CRM endpoints

Structured as routers per domain (`auth`, `startups`, `jobs`, `founders`, `ai`, `crm`, `resumes`), each with a thin controller layer delegating to a service layer, keeping business logic out of route handlers.

### Worker Service
Celery workers execute:
- Startup enrichment
- Embedding generation
- Resume generation
- Scheduled synchronization
- Email processing

Workers are split into queues by workload profile so a slow LLM job never blocks a fast DB-bound job:
- `default` — light CRUD-adjacent tasks
- `enrichment` — scraping + LLM extraction (longer running, rate-limited)
- `generation` — resume/cover-letter/outreach generation (LLM-heavy)
- `scheduled` — periodic sync jobs via Celery Beat

## Data Layer

### PostgreSQL
Stores:
- Users
- Startups
- Founders
- Jobs
- Applications
- Outreach
- Notes

See `DATABASE_SCHEMA.md` for full table definitions, indexes, and ERD.

### pgvector
Stores embeddings for:
- User CV
- Startup descriptions
- Jobs
- Projects

Used for semantic similarity (candidate-to-opportunity matching, semantic search across saved startups).

### Redis
- Cache (hot startup/job reads, session-adjacent data)
- Celery broker + result backend
- Rate limiting (token bucket per user/IP)
- Session cache (short-lived auth state, not source of truth)

## AI Pipeline

1. Startup saved
2. Queue enrichment task (`enrich_startup`)
3. Extract metadata (careers page, tech stack, funding, founders)
4. Generate embeddings (company description, job descriptions)
5. Store vectors in pgvector
6. Compute match score against the user's CV embedding
7. Generate recommendations (resume bullets, outreach angles)

Full prompt design, retrieval strategy, and matching math are detailed in `AI_DESIGN.md`.

## Background Jobs

| Job | Queue | Trigger |
|---|---|---|
| `enrich_startup` | enrichment | On save, or manual refresh |
| `sync_company` | scheduled | Periodic (daily/weekly) |
| `generate_resume` | generation | User-initiated |
| `generate_cover_letter` | generation | User-initiated |
| `compute_match` | default | After enrichment completes, or CV update |
| `refresh_embeddings` | enrichment | On source content change |

All jobs are idempotent and safe to retry; each job writes a status row (see `DATABASE_SCHEMA.md: enrichment_jobs`) so the frontend can poll or subscribe to progress.

### Refresh Tiering (Data Staleness)
`sync_company` and `enrich_startup` don't treat all fields as equally volatile — refresh cadence is tiered by how fast a signal actually changes, so the knowledge base stays trustworthy without re-scraping everything on every run:

| Signal | Cadence | Rationale |
|---|---|---|
| `hiring_status`, open `jobs` | Weekly | Postings open/close frequently |
| `funding_total_usd`, `stage` | Monthly | Slower-moving, but material when it changes |
| `company_summary`, `tech_stack` | Monthly | Rarely changes, but cheap to refresh alongside stage |
| Founder `bio`/background | Quarterly | Low volatility |

`last_enriched_at` (per entity) is stored and surfaced in the UI (`UI_UX.md: Startup Detail`) rather than hidden — a visibly-timestamped "enriched 34 days ago" is more trustworthy than a badge that's silently wrong.

## Data Sourcing & Compliance

Scraping is not one uniform technical problem — reliability, ToS compliance, and legal exposure vary significantly by source. Every enrichment source is classified into one of four tiers, and only certain tiers are eligible for *server-initiated* jobs (`sync_company`, `enrich_startup` running against a scheduled trigger rather than a user action):

| Tier | Examples | Server-side jobs allowed? |
|---|---|---|
| `direct_api` | Product Hunt API, Greenhouse/Lever/Ashby public job-board JSON, YC's public directory | Yes — preferred wherever available; removes both the reliability and legal question |
| `user_capture` | Any page the user is actively viewing via the extension | Yes, but only as a direct result of explicit user action — never a background crawl |
| `permitted_crawl` | Company websites/careers pages with no explicit anti-scraping terms | Yes, gated on a `robots.txt`/ToS check per domain, rate-limited, identified with a real User-Agent |
| `restricted` | LinkedIn | **No.** No server-side crawler is built against restricted sources; acquisition is `user_capture`-only via the extension |

Each source has a config entry (`source_status`, `source_terms_checked_at`) reviewed periodically, since ToS and anti-bot posture change over time. `sync_company` is hard-gated to only enqueue `direct_api` and `permitted_crawl` sources — this is enforced in the job dispatcher, not left to convention.

Because page structure varies widely even within a tier, enrichment uses source-specific adapters behind a shared interface (`adapters/yc.py`, `adapters/greenhouse.py`, `adapters/generic_careers_page.py`, ...) rather than one universal parser. The generic adapter leans on the LLM extraction step (`AI_DESIGN.md`) as a fallback for arbitrary structures, since that tolerates structural variance far better than brittle CSS selectors.

This is an architectural constraint, not just a legal footnote — it directly shapes which jobs are schedulable vs. extension-only, and it's the reason `user_capture` is a first-class acquisition path rather than a fallback.

## Authentication

JWT-based authentication with short-lived access tokens and rotating refresh tokens.
Passwords hashed using Argon2.
Extension and web app share the same auth flow; extension stores tokens in `chrome.storage.local` (not `localStorage`).

## Storage

Cloudflare R2
- Resume PDFs
- Uploaded CVs
- Assets (logos, screenshots captured by the extension)

Objects are referenced by key in Postgres; R2 is never treated as source of truth for metadata.

## API Contracts

All API contracts (request/response schemas, status codes, auth requirements) are defined in `API_SPEC.md` and kept in sync with FastAPI's auto-generated OpenAPI schema. The frontend's `packages/types` is generated from this OpenAPI schema to avoid drift.

## Security

- HTTPS everywhere
- Input validation via Pydantic models at the API boundary
- RBAC (owner-only access to personal data; no cross-user data leakage by default)
- SQL injection protection via SQLAlchemy parameterized queries (no raw string interpolation)
- Rate limiting (per-user and per-IP, enforced in Redis)
- Secrets via environment variables, never committed; distinct secrets per environment
- Least-privilege API keys for OpenAI/Gemini, rotated periodically

## Deployment

Frontend:
- Vercel / Cloudflare Pages / Netlify (any static host — no SSR required)

Backend:
- Railway / Render / Fly.io

Workers:
- Railway or Render Background Workers

Database:
- PostgreSQL (managed, e.g. Railway/Neon/RDS)

Cache:
- Redis (managed)

Storage:
- Cloudflare R2

### Environments
- `dev` — local Docker Compose (Postgres, Redis, API, worker)
- `staging` — mirrors prod, used for QA and prompt regression checks
- `prod` — production traffic

### CI/CD
- GitHub Actions: lint, type-check, test, build on every PR
- Alembic migrations run as a deploy step, gated behind a manual approval in prod
- Preview deployments per PR for the web app (Vercel / Cloudflare Pages)

## Observability

- Structured logging (JSON logs, correlation/request IDs threaded through API → worker)
- Health checks (`/healthz` per service, checked by the platform's deploy health gate)
- Metrics (request latency, job duration, LLM token usage/cost per job type)
- Error tracking (e.g. Sentry) across web, API, and worker
- LLM-specific observability: prompt/response logging (redacted of PII) for prompt regression debugging, token cost tracking per user/job

### Cost Controls
LLM and embedding spend scales with saves, so cost is treated as a first-class constraint rather than an afterthought:
- **Content-hash caching**: enrichment results are cached keyed on a hash of the source content (`AI_DESIGN.md`); re-enrichment only runs when the hash changes, not on every scheduled tick
- **Per-user soft caps**: daily limits on enrichment/generation calls per user, with graceful queuing rather than hard failure when hit
- **Tiered model selection**: cheaper models for extraction-only tasks, stronger/costlier models reserved for match explanation and generation where reasoning quality matters most
- **Cost-per-user as a tracked metric from day one**, so limits and pricing are set from data rather than guessed

## Scalability

Future microservice split:
- AI Service
- Search Service
- Notification Service
- Analytics Service

Near-term scaling levers before a microservice split is warranted:
- Horizontal scaling of stateless FastAPI instances behind the platform's load balancer
- Independent scaling of worker queues (e.g. more `generation` workers during peak usage, since LLM calls dominate latency there)
- Read replicas for Postgres if dashboard/analytics read load grows
- Caching layer in front of expensive match-score computations

## Guiding Principles

- AI-first architecture
- Event-driven background processing
- Stateless API
- Modular services
- Clear separation of concerns
- Production-ready by default
