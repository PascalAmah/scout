# Scout — Step-by-Step Build Plan

This plan turns your existing docs (`Scout_PRD.md`, `ARCHITECTURE.md`, `AI_DESIGN.md`, `API_SPEC.md`, `DATABASE_SCHEMA.md`, `ROADMAP.md`, `UI_UX.md`) into an executable build order. It follows the phases in `ROADMAP.md`, but breaks each one into the actual sequence you'd code in, so you're never building a layer before the layer it depends on.

> **Canonical project structure — read before coding anything:** the target file tree for every phase below lives in `AGENTS.md` at the repo root (loaded into agent context every session). New code goes where that tree dictates — never invent a new top-level shape. Conventions per app (web routing/features layout, api routers/services/models split, extension popup state machine, worker tasks/adapters) are documented there too. When a phase below says "build X screen," place it in the route file the tree names (e.g. `_app.startups.index.tsx`) and colocate its data hooks/components in the matching `features/<feature>/` directory.

**How to use this:** work top to bottom. Don't start a phase's frontend work before that phase's backend + schema work is done — most of the ordering mistakes in a project like this come from building UI against endpoints that don't exist yet, or AI pipelines against tables that aren't there yet.

---

## Phase 0 — Foundations — ✅ DONE (2026-08-11)
**Goal:** empty-but-real skeleton, deployable, with auth working end to end.
**Status: COMPLETE** — all exit criteria met and verified live end to end (see Status Board below).

### 0.1 Repo & tooling
1. Create the monorepo structure from `ARCHITECTURE.md`: `apps/{web,extension,api,worker}`, `packages/{ui,prompts,shared,types}`, `infrastructure/{docker,terraform,migrations}`. `apps/worker` is scaffolded empty here and stood up for real in Phase 1.3.
2. Set up `docker-compose.yml` for local dev: Postgres 16 (with pgvector), Redis.
3. Set up GitHub Actions skeleton: lint, type-check, build (tests come later, but wire the pipeline now so it's never skipped).

### 0.2 Database
4. Install SQLAlchemy 2.0 + Alembic in `apps/api`.
5. Write the first Alembic migration: `users` table only (per `DATABASE_SCHEMA.md`).
6. Enable the `vector` extension in a migration (`CREATE EXTENSION IF NOT EXISTS vector;`) even though nothing uses it yet — cheaper to do it now than retrofit.

### 0.3 Auth (backend)
7. Build `apps/api` FastAPI skeleton with the router-per-domain structure (`auth`, `startups`, `jobs`, `founders`, `ai`, `crm`, `resumes`) — stub the non-auth routers as empty files now so the shape exists.
8. Implement the full auth surface per `API_SPEC.md`: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, plus `POST /auth/password/reset-request` and `POST /auth/password/reset` (the mockups already include a Password Reset screen, so this is a contract obligation, not an add-on). Argon2 for password hashing, JWT access + rotating refresh tokens per `ARCHITECTURE.md`.
9. Add the standard error envelope and rate-limiting middleware (Redis token bucket) now — every future endpoint inherits it for free.

### 0.4 Auth (frontend) + extension skeleton
10. React (Vite) app — matching the stack fixed in `ARCHITECTURE.md` (static host, **no SSR — deliberately not Next.js**): login/register/reset pages, TanStack Router (file-based routing), TanStack Query client, an authenticated fetch wrapper, and `packages/types` generated from `/openapi.json` to keep the frontend from drifting from the API contract.
11. Plasmo extension skeleton: manifest, popup shell, shared-JWT auth flow (tokens in `chrome.storage.local`, per `ARCHITECTURE.md` — **not** `localStorage`). No save logic yet — just prove login works from the popup.

### 0.5 Email (Resend)
12. Stand up Resend: sending domain with SPF/DKIM records, API key in env (never committed), and a shared `send_email` worker task (on the `default` queue) that every future email call routes through — one choke point for delivery, retries, and logging.
13. Wire the two transactional emails that ship now:
    - **Password reset** — `POST /auth/password/reset-request` actually sends the reset link via `send_email` (not a stub; the endpoint is contract in `API_SPEC.md`).
    - **Welcome email** — sent on register, and it's Scout's *activation* lever: link to the workspace + install the extension + save your first company. Keep it transactional, not a marketing cadence.
14. Add React Email templates in `packages/ui` (welcome, password reset) so copy is versioned and reviewable like prompts, not buried in the worker code.

**Exit criteria:** a user can register, log in on the web app, receive the welcome email, complete a password reset via email link, and the extension popup shows "logged in" using the same account.

---

## Phase 1 — Core Loop (Save → Enrich → View) — ✅ DONE (2026-08-12)
**Goal:** the actual product loop works for one source (YC + generic careers pages), no AI matching or generation yet.
**Status: COMPLETE** — all exit criteria met and verified end to end headlessly (see Status Board below).

### 1.1 Schema
1. Migrations for `startups`, `founders`, `jobs`, `saved_startups`, `notes`, `applications`, `notifications`, `enrichment_jobs` (per `DATABASE_SCHEMA.md`, with `notifications` as the one table beyond that schema: `user_id`, `type` (`enrichment_complete` \| `follow_up_due` \| `application_status_change`), `entity_type`/`entity_id`, `title`/`body`, `read_at`, `created_at`, cleaned up by a scheduled job after ~30 days). Add the indexes listed there now, not later — cheap now, painful as a retrofit on a populated table. **`applications` is created here, not in Phase 3**: application tracking is an MVP requirement per `ROADMAP.md`, and the `unique (user_id, job_id)` constraint + `(user_id, status)` index belong on the table from day one. (Outreach/resumes/resume_versions still ship in Phase 3.)

### 1.2 Extension capture
2. Build page-detection logic for YC company pages + a generic careers-page heuristic (per `UI_UX.md` extension states: unsupported / detected / saving / saved).
3. Implement `POST /extension/detect` and `POST /extension/quick-save` (per `API_SPEC.md`) — this is the *only* path for `restricted`-tier sources later, so build the compliance-tier field into the response now even though only `direct_api`/`user_capture`/`permitted_crawl` are used in Phase 1. Accept the `Idempotency-Key` header on `quick-save` (per `API_SPEC.md`) so retried saves can't create duplicate rows.
4. Wire the popup save flow end to end per `UI_UX.md`: detect → pre-filled card → save → "Saved to Scout" confirmation link.

### 1.3 Enrichment pipeline (backend + worker)
5. Stand up Celery + Redis broker, with the queue split from `ARCHITECTURE.md` (`default`, `enrichment`, `generation`, `scheduled`) even though only `enrichment` is used this phase.
6. Build the source-adapter interface (`adapters/yc.py`, `adapters/generic_careers_page.py`) behind a shared interface, per `ARCHITECTURE.md`'s Data Sourcing & Compliance section.
7. Implement the `enrich_startup` task: fetch → chunk/clean → LLM extraction call (structured output per the schema in `AI_DESIGN.md`) → persist to `startups`/`founders`/`jobs` → write `enrichment_jobs` status row → insert a `notifications` row (`type = enrichment_complete`) on success, so the feed has something to pull the user back with.
8. Implement content-hash caching on the source text now (per `AI_DESIGN.md` cost controls) — re-enrichment should already refuse to re-run on unchanged content before you ever have real cost pressure.
9. Implement `POST /startups/{id}/enrich` and `GET /startups/{id}/enrichment-status` for manual re-trigger + polling.

### 1.4 Startup CRUD + workspace UI
10. Implement `GET/POST /startups`, `GET/PATCH/DELETE /startups/{id}`, plus founders/jobs sub-routes per `API_SPEC.md`. `POST /startups` accepts the `Idempotency-Key` header (duplicate key within 24h returns the original response, per `API_SPEC.md`). Use the **cursor-based pagination** convention (`?cursor=&limit=` → `data` + `next_cursor`) on `GET /startups` now — don't retrofit it onto a populated list later.
11. Build the Dashboard shell and Startup Workspace list + Startup Detail screens per `UI_UX.md` (Overview/Founders/Jobs/Notes tabs, enrichment status indicator, `last_enriched_at` shown, not hidden).

### 1.5 Application tracking (MVP "Track")
12. Implement `POST /applications`, `PATCH /applications/{id}`, `GET /applications`, `DELETE /applications/{id}` (archive) with the server-validated state machine (`saved → interested → applied → interview → offer|rejected`, `archived` from any state) per `API_SPEC.md`. Status transitions insert a `notifications` row (`type = application_status_change`). All list endpoints use the cursor-based pagination convention.
13. Build the basic CRM screen — company, role, applied date, status dropdown per card (per `UI_UX.md`; drag-and-drop kanban is v2).

### 1.6 Notifications (in-app feed)
14. Build the notifications feed: bell/badge in the app shell showing unread count (`WHERE read_at IS NULL`), list of recent rows, click → mark `read_at` + route to the startup/application detail page. Keep it minimal — this is the retention pull behind the MVP's 7-day-retention metric (`ROADMAP.md:71`), not a notification center.

**Exit criteria (Phase 1 = the ROADMAP MVP):** save a real YC company from the extension → see it appear in the workspace within ~2 min with an AI summary, tech stack guess, and hiring signal → see an in-app notification land when enrichment completes → mark it Saved/Interested/Applied and move it through statuses with timestamps — all without leaving Scout.

---

## Phase 2 — Personalization (CV + Matching v1)
**Goal:** opportunities are ranked against the user's actual CV. No LLM explanations yet — embedding similarity only, per MVP scope in `ROADMAP.md`.

1. Migrations: `cv_profiles`, `cv_embeddings`, `startup_embeddings`, `job_embeddings`, `match_scores`.
2. Implement `POST /cv` (upload/replace) and `GET /cv` — parse into `structured_data` (skills/roles/years), store raw text.
3. Add the embedding step to the enrichment pipeline (`company_summary`, job descriptions → `startup_embeddings`/`job_embeddings`) per `AI_DESIGN.md` step 6.
4. Add `refresh_embeddings` as its own idempotent job (separate from extraction — partial-failure handling per `AI_DESIGN.md`: if extraction succeeds but embedding fails, retry only embedding).
5. Implement Stage 1 retrieval only: cosine similarity query (pgvector `<=>`, `hnsw` index) against `job_embeddings`, per the query shape in `DATABASE_SCHEMA.md`. No re-rank yet.
6. Implement `GET /jobs/recommended` and the CV update → recompute trigger table from `AI_DESIGN.md`. **Temporary contract deviation, flagged:** `API_SPEC.md` mandates `explanation` + `confidence_band` always present on this endpoint (no lightweight score-only shape — an overconfident score with no gaps is treated as a prompt bug). Phase 2 ships embedding-only scores, so mark this endpoint internal-only (e.g. `explanation` returned as `null`) until Phase 3.1 restores the full contract — don't let the Phase 2 shape silently become the API's default.
7. Build the CV upload screen (Settings → Profile/CV) and a first pass at the Matches screen (score, no "why" expand yet).

**Exit criteria:** upload a CV, see saved jobs sorted by fit score, and the score updates automatically after a CV re-upload or a new save.

---

## Phase 3 — Generation (Resume Studio) + Match Explanations — ✅ DONE (2026-08-14)
**Goal:** this is `ROADMAP.md`'s MVP finish line + immediately following v1.1 gap-fill, combined — build them together since the review-gate logic is shared infrastructure either way.

### 3.1 Stage 2 re-rank (match explanations)
1. Implement the LLM re-rank step from `AI_DESIGN.md`: top-N candidates → structured `{score, matched_skills, gaps, summary}` output.
2. Update `GET /jobs/recommended` and add `GET /match/{job_id}` to return score + explanation together (per `API_SPEC.md` — deliberately no lightweight score-only endpoint).
3. Add `confidence_band` derivation and enforce `explanation.gaps` as required (a response with no gaps is a bug, not a "perfect fit," per `API_SPEC.md`).
4. Finish the Matches screen: matched-skill chips, gap callout, "why this score?" expand reading the stored `explanation` (not regenerated per view), thumbs up/down feedback capture.

### 3.2 Generation pipeline
5. Migrations: `resumes`, `resume_versions`, `outreach` (`applications` already shipped in Phase 1.1).
6. Implement `generate_resume` and `generate_cover_letter` worker tasks on the `generation` queue — grounding source = base CV + enrichment data + match explanation, no-fabrication constraint in the prompt, per `AI_DESIGN.md`.
7. Implement `POST /resumes`, `POST /resumes/{id}/generate` (async, returns job id), `GET /resumes/{id}/versions`, `GET /resume-versions/{id}`.
8. **Build the review gate now, not as an afterthought:** `reviewed_at` starts null on every `resume_versions`/`outreach` row; `GET /resume-versions/{id}/download` and the `sent` status transition both return `409 NOT_REVIEWED` until `POST .../review` is called explicitly from the diff-view UI. This is a deliberate user action, never auto-set by the generation job.
9. Implement `POST /outreach/generate` (cover letter / intro email — LinkedIn DM can wait per MVP scope) and `PATCH /outreach/{id}`.
10. Build Resume Studio UI: base resume (editable, source of truth) + generated versions list + diff view + generate flow (job/application picker → tone/emphasis → async generate with progress → review/approve).

### 3.3 CRM — application detail (basic tracking already shipped in Phase 1.5)
11. Implement `GET /applications/{id}` (application detail — includes outreach and the resume version used) and `GET /applications/pipeline` (grouped by status) per `API_SPEC.md`.
12. Build the Application Detail screen per `UI_UX.md`: full timeline (saved → applied → interview → …), attached outreach, notes, and the resume version used (wired to `applications.resume_version_id`).
13. Upgrade the Phase 1.5 CRM cards with the richer fields (resume version used, last outreach sent). Drag-and-drop kanban stays v2.

**Exit criteria (this is your actual MVP done):** save a company → get an AI summary → upload a CV → see it ranked with an explanation → generate a resume + cover letter → review and approve them → attach the materials to an application and move it through statuses (Applied → Interview → Offer/Rejected) with tracked timestamps, without leaving Scout.

---

## Phase 4 — Retention Loop — ✅ DONE (2026-08-15)
**Goal:** the product starts working *for* the user between sessions, not just when they're actively in it.

1. Add `resume PDF rendering` (R2 + a template/rendering service) — wire `file_key` on `resume_versions`.
2. Add LinkedIn DM generation (`outreach.channel = linkedin_dm`).
3. Build follow-up suggestion logic (time-since-`applied_at` threshold → suggested follow-up copy, user-triggered generation, not auto-sent) and insert `notifications` rows (`type = follow_up_due`) when the threshold trips — the in-app pull for the retention loop.
4. Add **opt-in** reminder email: the `send_email` task from Phase 0.5 formats `notifications` rows (enrichment complete, follow-up due) into emails, gated on a per-user toggle in Settings → Account (opt-in, default off — this is the marketing-ish email; keep it optional until the loop is proven).
5. Surface "Applications needing follow-up" on the Dashboard per `UI_UX.md`.

---

## Phase 5 — Insight Layer
**Goal:** answer "is this working."

1. Implement `GET /analytics/summary` and `GET /analytics/funnel` per `API_SPEC.md`.
2. Build the Analytics screen: funnel chart (saved → applied → interview → offer with conversion %), response rate over time, filters by date range/source.
3. Add the quick-stats strip to the Dashboard (saved/applied/interviews/offers this month).

---

## Phase 6 — Expansion
**Goal:** more sources, less manual work, and the assistant.

1. Add `sync_company` scheduled jobs (Celery Beat) for Wellfound/Techstars/Product Hunt — **only** for sources classified `direct_api` or `permitted_crawl` in the compliance tier table; this must be hard-gated in the job dispatcher, not left to convention, per `ARCHITECTURE.md`.
2. Add multiple CV/resume profiles (e.g. "backend" vs "product" positioning).
3. Build the CRM kanban drag-and-drop view; add bulk actions (bulk tag/archive).
4. Extend the extension to save directly from LinkedIn job posts/founder profiles — this stays `user_capture`-only, no server crawler, ever, per the compliance tiering.
5. Build hybrid (keyword + semantic) search across saved startups.
6. Build the AI Assistant (v3): tool-use agent per `AI_DESIGN.md`'s RAG architecture — typed SQL query tools for structured questions, pgvector semantic search for fuzzy ones, read-only in this scope (no write actions), strict per-user scoping enforced server-side on every tool call.
7. Consider the microservice split (AI/Search/Notification/Analytics services) only if load actually demands it — this is explicitly a "later, if needed" item in `ARCHITECTURE.md`, not a default.

---

## Cross-Cutting (do continuously, not as a phase)
- **Cost control:** token usage per user/job tracked from Phase 1 onward; per-user soft caps before Phase 6's added sources multiply spend.
- **Reliability:** retry/backoff + dead-letter queue for failed jobs — add this once Phase 1's enrichment pipeline exists, don't wait for Phase 4.
- **Prompt versioning:** every prompt lives in `packages/prompts`, versioned, with a regression set run in CI — start this at the very first LLM call in Phase 1, not after prompts have already drifted.
- **Observability:** structured logs with correlation IDs, `/healthz` per service, Sentry — wire into the Phase 0 skeleton so every later phase inherits it.
- **Testing:** wire unit/integration tests into the CI pipeline from Phase 1 (adapter unit tests, auth integration tests); add the prompt-regression set from `AI_DESIGN.md` the moment the first LLM call ships in Phase 1.3.

## Quick Reference — What Unlocks What
| If you're stuck on... | You're probably missing... |
|---|---|
| Extension can't save | Phase 0 auth flow, or Phase 1 `/extension/detect` + `/extension/quick-save` |
| Enrichment never finishes | Worker queue wiring (Phase 0.2/1.3) or a missing adapter for the source |
| Matches screen is empty | No CV uploaded (Phase 2.2), or embeddings never generated (Phase 2.3) |
| Resume generation 409s | Working as intended — review gate requires explicit `POST .../review` first |
| Welcome/reset email never arrives | Resend domain/keys or the `send_email` task missing (Phase 0.5) |
| Notification bell is empty | Nothing writing rows — enrichment (`1.3`) / status transitions (`1.5`) must insert `notifications` rows |
| New source won't auto-sync | Check its compliance tier — `restricted` sources are extension-only by design |

---

## Status Board & Reference

### Phase status
| Phase | Status | Frontend deliverables |
|---|---|---|
| Phase 0 — Foundations | ✅ **DONE** (2026-08-11) | Landing (`/`), Login + Register, Password reset (request/confirm), Dashboard shell, Extension popup auth |
| Phase 1 — Core Loop (Save → Enrich → View) | ✅ **DONE** (2026-08-12) | Workspace list + filters, Startup detail (Overview/Founders/Jobs/Notes tabs), CRM pipeline + application detail, Notifications feed (bell + unread badge), Extension save flow (detect → prefilled → saved) |
| Phase 2 — Personalization (CV + Matching v1) | ✅ **DONE** (2026-08-14) | CV upload (Settings → Profile/CV), Matches screen (score only, no "why") |
| Phase 3 — Generation (Resume Studio) + Match Explanations | ✅ **DONE** (2026-08-14) | Resume Studio (base CV, versions list, diff view, generate flow), Application detail (timeline + attached materials), richer CRM cards, Matches "why this score" |
| Phase 4 — Retention Loop | ✅ **DONE** (2026-08-15) | Dashboard "needs follow-up" section, Settings → Account digest toggle |
| Phase 5 — Insight Layer | pending | Analytics screen (funnel + response-rate), Dashboard quick-stats strip |
| Phase 6 — Expansion | pending | CRM kanban drag-and-drop + bulk actions, Assistant chat UI (tool traces), Matches feedback thumbs |

### Verified (2026-08-12) — Phase 1
- API: 7 pytest pass; ruff + mypy clean (59 files). Worker: 6 pytest pass; ruff clean.
- Web: typecheck, oxlint, `npm run build` clean (workspace, startup detail tabs, CRM pipeline, notifications feed).
- Extension: typecheck, oxlint, `plasmo build` clean; content scripts for yc + generic careers in the built manifest.
- **Live end-to-end (headless, local HTTP source):** 27/27 checks passed — register → `quick-save` (auto-enrich queued) → `enrich_startup` succeeded (summary, tech stack `[AWS, FastAPI, PostgreSQL, Python]`, stage `series_a`, hiring `hiring`, tags merged, jobs persisted) → `enrichment_complete` notification + unread count → application `saved→interested→applied(applied_at)→interview→offer`, invalid transition rejected with `400`, 3 `application_status_change` notifications, pipeline grouped correctly → re-enrich on unchanged content **skipped** via content-hash cache.
- Bug fixed during verification: `EnrichmentCache.last_hash` compared `bytes` (from redis) to `str`, so the content-hash skip never fired — now decodes to `str`, with 2 regression tests.
- Not yet verified headlessly (manual, human): loading the extension in Chrome and saving a real Y Combinator URL (network-restricted sandbox; the yc adapter uses the same pipeline as the verified generic path).

### Verified (2026-08-14) — Phase 2
- API: 15 pytest pass (CV upload/get + matching added); ruff + mypy clean (66 files). Worker: 10 pytest pass.
- Web: typecheck, oxlint, `pnpm build` clean (Matches screen, Settings Profile/CV/Account/Integrations, `Ring` component, nav links).
- **Live end-to-end (headless, real Postgres):** 22/22 checks passed — register → `POST /cv` (pdf/text) → structured parse (roles, skills, `years_of_experience`, education) → `refresh_embeddings` → `last_embedded_at` set → job embed → `compute_match` → `GET /jobs/recommended` sorted by score (top = the matching backend role) → `explanation`/`confidence_band` `null` (Phase 2 deviation): → match detail + force recompute → CV + job embeddings confirmed at **1536 dims**.
- Embeddings run at 1536 dims (pgvector hnsw caps at 2000); migration `0002_cv_match_embeddings` applied to live `scout_postgres` (head = `0002`).
- Bug fixed during verification: bare "N years." (no "of experience") wasn't parsed for `years_of_experience` — added a trailing fallback pattern to `YEAR_PATTERNS`.
- **Frontend fidelity note:** Settings Profile/CV follows `scout_settings.html` closely; Matches is a simplified card grid (ring + meta + description) — mockup's checkbox/bulk bar/filter pills/action buttons/skill chips/why-this-score/feedback are deferred to Phase 3.1 (they need `explanation` + `confidence_band`, which Phase 2 returns as `null`). Account/Integrations are read-only stubs pending their owning phases.

### Verified (2026-08-15) — Phase 4
- API: 27 pytest pass (follow-up scan/notice dedupe + follow-up generation accept + email reminder task); ruff clean.
- Worker: 14 pytest pass (AI config + extraction + embeddings fallbacks); ruff clean.
- Web: typecheck + oxlint clean (Dashboard "needs follow-up" section, Settings → Account digest toggle, Application detail outreach UI).
- Follow-up loop verified headlessly: `GET /applications/needs-follow-up` lists only due applications (time-since-`applied_at` ≥ threshold), the notice is raised exactly once (deduped by `follow_up_due` notification), `POST /applications/{id}/follow-up` queues `generate_follow_up` and returns `202` (heuristic fallback stored as `draft` outreach — never auto-sent).
- Digest email verified headlessly: PATCH `/auth/me` toggles `email_reminders_enabled` (persisted, reflected in `/auth/me`); `send_reminder_emails` emails opted-in users one digest of unread notifications and marks them read; un-opted users are skipped. Send itself is a no-op log without `RESEND_API_KEY` (dev-safe).
- Migration `0004_email_reminders` added (`users.email_reminders_enabled`, default `false`). Not yet applied to live DB.

## Frontend Implementation Map

Every screen the canonical tree (`AGENTS.md`) names, mapped to the phase that builds it, its mockup in `docs/mockups/`, and current status. Route files are the target locations from the tree; screen-level details come from the referenced mockup + `UI_UX.md`.

| Screen (route file per AGENTS.md) | Phase | Mockup | Status |
|---|---|---|---|
| `/` — Landing | 0 | `scout_landing_main.html` | pending — `/` is currently a redirect only; build the page from `scout_landing_main.html` |
| `_auth.login`, `_auth.register` | 0 | `scout_auth.html` | done |
| `password-reset.index`, `password-reset.confirm` | 0 | `scout_auth.html` ("Reset your password" / "Check your email") | done |
| `_app` shell — sidebar, topbar, notification bell/badge | 1 | `scout_dashboard.html` (topbar) | done |
| `_app.dashboard` | 0 (shell), 4/5 (follow-up + stats) | `scout_dashboard.html` | done (P4 follow-up section added; P5 stats pending) |
| `_app.startups.index` — Workspace list + filters | 1 | `scout_workspace.html` | done |
| `_app.startups.$startupId` (+ `index`, `founders`, `jobs`, `notes` tabs) | 1 | `scout_startup_detail.html` | done |
| `_app.matches` | 2 (score) → 3 (why/feedback) | `scout_matches.html` | done (P2 score-only card grid; P3 adds why/feedback/actions) |
| `_app.resume-studio.index`, `_app.resume-studio.$versionId` | 3 | `scout_resume_studio.html` | done |
| `_app.crm.index` — Pipeline | 1 (board w/ buttons) → 6 (drag-drop) | `scout_crm.html` | done (P6 upgrade pending) |
| `_app.crm.applications.$applicationId` | 3 (full timeline + materials) | `scout_application_detail.html` | done (timeline + attached materials + outreach UI) |
| `_app.analytics` | 5 | `scout_analytics.html` | pending |
| `_app.assistant` | 6 | `scout_assistant.html` | pending |
| `_app.settings.route` + `profile`, `account`, `integrations` | 0 (shell) → 2 (CV upload) | `scout_settings.html` | done (Profile/CV full; Account/Integrations read-only stubs) |
| Extension popup (Detected / Saving / Saved / Unsupported / ManualFallback / AuthExpired / login) | 0 (auth) → 1 (save flow) | `scout_extension.html` | done |
| Email templates (welcome, password reset) | 0 | `scout_email_welcome.html`, `scout_email_reset_password.html` | done (React Email) |

> **What "done" means in this map:** the screen's route + feature wiring exist, build cleanly (typecheck/lint/build), and talk to real endpoints. The Phase 0/1 screens were built first-pass against the design system tokens, so they follow the mockups' **language** (palette, typography, component shapes) but are **not pixel-perfect replicas** — treat the mockup as the fidelity target and the built screen as the working baseline. Anything marked "pending" is not built.
>
> **Rule of thumb:** don't start a screen before its phase's backend endpoints exist (see phase ordering note at the top), and place new code only in the route/feature files the tree names.

### Runbook (Phase 0 state)
- **Full step-by-step start/test guide:** see `README.md` at the repo root.
- **Databases:** `docker compose -f infrastructure/docker/docker-compose.yml up -d` → Postgres 16 + pgvector on `:5432`, Redis on `:6379`.
- **API:** from `apps/api` → `python -m uv run uvicorn app.main:app --reload --port 8000`. Health: `GET /healthz`. Swagger UI: http://localhost:8000/docs. All routes live under `/v1/`.
- **Web app:** from `apps/web` → `pnpm dev` → http://localhost:5173 (Vite proxies `/v1` → `:8000`).
- **Extension:** from `apps/extension` → `pnpm dev` (Plasmo), or load `apps/extension/build` unpacked via `chrome://extensions`.
- **Demo account (local):** `demo@scout.app` / `supersecret123`.

### Verified (2026-08-11)
- Docker: `scout_postgres` + `scout_redis` healthy; migration `0001` applied (`users` + `vector` extension).
- API: 7 pytest pass; ruff + mypy clean. Live round-trip green — register 201, `me` 200, bad token 401, duplicate email 409, wrong password 401, refresh 200, logout 204, refresh-after-logout 401, reset-request no-account-leak 204/204.
- Web: typecheck, lint, `pnpm build` clean (routes: index, login, register, reset-password, dashboard).
- Extension: typecheck, lint, `plasmo build` clean (target chrome-mv3).

### Remaining before Phase 1
- Manual (human): load the extension in Chrome and confirm popup login against the API — the one exit-criteria item that can't be verified headlessly.
- Manual (human): initial `git init` + commit of the monorepo (no remote yet).
