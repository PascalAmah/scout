# Scout — Deployment Guide

How to take Scout from a local dev environment to production. This covers the
full stack: Postgres + Redis, the FastAPI backend, the Celery worker + beat,
the browser extension, and (optionally) the web app.

> **Production branch is `dev`, not `main`.** The deployable, self-contained code
> lives on `dev`; `main` only holds the Phase 0/1 scaffold. Point Render, the
> extension, and Vercel's production branch at `dev`. CI/CD workflows that fire on
> `main` (e.g. `.github/workflows/deploy.yml`) won't run for real deployable
> code until main is fast-forwarded or the triggers are retargeted.

## What you're deploying

| Service     | Tech                         | Container                                | Env needed                                       |
| ----------- | ---------------------------- | ---------------------------------------- | ------------------------------------------------ |
| `postgres`  | Postgres 16 + pgvector       | `pgvector/pgvector:pg16`                 | credentials                                      |
| `redis`     | Redis 7                      | `redis:7-alpine`                         | —                                                |
| `api`       | FastAPI                      | `apps/api/Dockerfile`                    | `DATABASE_URL`, `REDIS_URL`, AI key, JWT secrets |
| `worker`    | Celery (background jobs)     | `apps/worker/Dockerfile`                 | same as API                                      |
| `beat`      | Celery Beat (scheduled jobs) | `apps/worker/Dockerfile` (different CMD) | same as API                                      |
| `web`       | React + Vite SPA             | build via `pnpm build` → static host     | `VITE_API_URL`                                   |
| `extension` | Plasmo (Manifest V3)         | build via `pnpm build` → zip → store     | `.env.production` + `host_permissions`           |

The **worker image is the special case**: it carries both `apps/api` and
`apps/worker` (and `packages/prompts*`) because worker tasks import the API
package (`app.*`) at runtime and resolve prompts from the repo-root `packages/`
directory. Migrations are a separate deploy step, **not** run on API boot.

---

## Prerequisites

- Docker + Docker Compose (local testing)
- A GitHub repo (the deploy workflow pushes images to GHCR)
- A container host or platform of your choice
  - **Easiest:** a single VPS or any host that runs Docker Compose
  - **Managed:** Fly.io / Render / Railway / ECS / GKE — the images are
    portable; only the runtime deploy step differs
- A production database (see [Step 1](#step-1--database--redis))

---

## Step 0 — Configuration (one `.env`)

Copy `.env.example` → `.env` in the repo root and fill in **production values**:

```bash
cp .env.example .env
```

The critical variables:

```dotenv
# environment
ENVIRONMENT=production

# CORS — your real web origin
CORS_ORIGINS=["https://scout.yourdomain.com"]

# database + redis (hostnames must match your infra — see Step 1)
DATABASE_URL=postgresql+psycopg://scout:<db-password>@<db-host>:5432/scout
REDIS_URL=redis://<redis-host>:6379/0

# auth — generate strong secrets!
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>

# email (optional, for reminders/follow-ups)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=Scout <hello@yourdomain.com>
WEB_APP_URL=https://scout.yourdomain.com

# ai — the only one required for real enrichment/matching
AI_PROVIDER=gemini
AI_API_KEY=your-real-key
```

> **Never commit `.env`.** It's gitignored.

---

## Step 1 — Database + Redis

You have two options.

### Option A — Docker Compose (single host)

The `docker-compose.yml` at the repo root defines Postgres, Redis, migrate,
api, worker, and beat. On any Docker host:

```bash
docker compose up -d
```

This builds both images, runs `alembic upgrade head` once (the `migrate`
service), then starts API + worker + beat. This is the fastest path for a
single-VPS deploy.

### Option B — Managed services (recommended for real prod)

Use a managed Postgres (e.g. Neon, Supabase, RDS) and managed Redis (Upstash,
ElastiCache). Set `DATABASE_URL` / `REDIS_URL` in `.env` accordingly and run
**only** the app containers:

```bash
docker compose up -d api worker beat
```

> Hostname gotcha: if Postgres/Redis are on the same host as Docker but not in
> the compose network, use `host.docker.internal` instead of `localhost`.

---

## Step 2 — Migrations (run once, before deploying the API)

Migrations run as an explicit deploy step, never on API boot:

```bash
docker compose run --rm migrate
```

or, against the built API image:

```bash
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  ghcr.io/<org>/scout-api:latest \
  .venv/bin/alembic upgrade head
```

This is wired into the GitHub deploy workflow and gated behind an approval in
prod.

---

## Step 3 — Build & publish images

The `.github/workflows/deploy.yml` workflow does this automatically on every
push to `main`: it builds `scout-api` and `scout-worker` and pushes them to
GitHub Container Registry (GHCR).

To build manually (for testing):

```bash
# both Dockerfiles use the repo root as build context
docker build -t scout-api -f apps/api/Dockerfile .
docker build -t scout-worker -f apps/worker/Dockerfile .
```

Smoke-test the images locally:

```bash
# API responds on /healthz
docker run --rm -p 8000:8000 -e DATABASE_URL="$DATABASE_URL" -e REDIS_URL="$REDIS_URL" scout-api
curl http://localhost:8000/healthz   # -> {"status":"ok"}

# worker boots, connects to redis, registers tasks
docker run --rm -e DATABASE_URL="$DATABASE_URL" -e REDIS_URL="$REDIS_URL" \
  scout-worker /app/apps/api/.venv/bin/celery -A celery_app:celery_app worker --loglevel=info --pool=solo
```

---

## Step 4 — Deploy the API + worker + beat

### Via the repo-root compose file

```bash
docker compose pull
docker compose up -d
docker compose ps
```

### The two worker processes (important)

The `worker` image serves **two** roles, started with different commands:

- **worker** — consumes the `enrichment`, `generation`, and `scheduled` queues
  ```bash
  celery -A celery_app:celery_app worker --loglevel=info --concurrency=2
  ```
- **beat** — the scheduler that fires daily follow-up scans, reminder emails,
  and source syncs (`beat_schedule.py`). **Exactly one instance**, never scale it.
  ```bash
  celery -A celery_app:celery_app beat --loglevel=info
  ```

If you scale the worker, keep beat at a single replica. Both read the schedule
from the same `celery_app` app.

### Worker env note

The worker loads `.env` from the repo root and `apps/worker/`. In the
container, pass everything as environment variables (`DATABASE_URL`,
`REDIS_URL`, `AI_API_KEY`, `RESEND_API_KEY`, …). No config file is needed.

---

## Step 5 — Web app (optional)

The web app is a static SPA. Build and host it on any static host (Vercel,
Cloudflare Pages, S3, or nginx on the same VPS):

```bash
cd apps/web
VITE_API_URL=https://api.scout.yourdomain.com pnpm build
# host apps/web/dist
```

Point the API's `CORS_ORIGINS` at the web origin and serve the API behind TLS
(e.g. Caddy / nginx reverse proxy to `:8000`).

---

## Step 6 — Extension (browser)

The extension is a Plasmo (Manifest V3) package — there is no container or
server for it. It's a static build you zip up and distribute (Chrome Web Store
/ Edge Add-ons, or sideload internally). Two things must point at **your**
production URLs before building.

### 1. Set the production URLs in `apps/extension/.env.production`

Edit `apps/extension/.env.production`:

```dotenv
PLASMO_PUBLIC_API_BASE=https://api.scout.yourdomain.com/v1
PLASMO_PUBLIC_WEB_BASE=https://scout.yourdomain.com
```

These are compiled into the build (`background/auth-sync.ts` reads them; the
popup uses `WEB_BASE` for the "Create an account" / "Open in Scout →" links).
A production build that's missing them falls back to `localhost` and logs an
error — **always set both**.

### 2. Update the manifest permissions in `apps/extension/package.json`

The extension's `manifest` block hardcodes the dev API/web origins. It must
match what you set in `.env.production` or the extension can't reach your API:

```json
"host_permissions": [
  "https://api.scout.yourdomain.com/*"
],
"externally_connectable": {
  "matches": [
    "https://scout.yourdomain.com/*"
  ]
}
```

> `host_permissions` and `.env.production` must agree — a mismatch gives
> confusing CORS/fetch failures in the popup.

### 3. Build

```bash
cd apps/extension
pnpm build
# output: apps/extension/build/
```

`plasmo build` reads `.env.production` automatically (NODE_ENV=production).

### 4. Distribute

- **Chrome Web Store** — zip `apps/extension/build/` and upload to the
  [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole):
  ```bash
  cd apps/extension && zip -r scout-extension.zip build/
  ```
- **Edge Add-ons** — same zip, submit to the Microsoft Edge Add-ons portal.
- **Internal/sideload** — `chrome://extensions` → _Developer mode_ → _Load
  unpacked_ → select `apps/extension/build/`.

For store submission you'll also need: a privacy policy (the extension stores
auth tokens and sends page data to the Scout API), store icons, and screenshots
— these are submitted in the dashboard, not in the code.

> Store note: updates ship by uploading a **new version** and bumping the
> extension version (e.g. `0.1.0` → `0.1.1` in `package.json`). Web Store
> review adds a delay before the update goes live.

---

## Step 7 — Verify the deploy

```bash
# API health
curl https://api.scout.yourdomain.com/healthz          # {"status":"ok"}
curl https://api.scout.yourdomain.com/redoc             # API docs

# Swagger UI (end-to-end auth test)
open https://api.scout.yourdomain.com/docs
# register a user via POST /v1/auth/register, then call /v1/auth/me

# worker health: watch its logs for
#   "[tasks]" list (9 tasks) + "celery@... ready."
```

### Check the worker is actually processing

Save a startup (via the extension or `POST /v1/startups`), then look at the
worker logs for the `enrich_startup` task executing. Beat logs will show the
daily scheduled tasks firing.

### Check the extension end to end

1. Install the unpacked build (or the store zip) in Chrome.
2. In the popup, sign in with a user from `POST /v1/auth/register`.
3. Visit a startup page (YC, Wellfound, a generic careers page) and click
   _Save to Scout_.
4. Confirm the startup appears in the web app at `/startups` and the worker
   log shows `enrich_startup` running.

---

## Step 8 — Backup & recovery (production hygiene)

- **Postgres:** enable automated backups at your provider, or run
  `pg_dump` on a cron. Scout's data is all in Postgres (users, startups,
  applications, resumes, embeddings).
- **Redis:** restart-safe (task broker + cache only). If Redis is lost, queued
  jobs are lost but nothing persistent is.
- **Files:** `FILE_STORE_DIR` (default `data/files`) holds uploaded CVs / PDFs.
  In production this should be an external volume or object storage (the
  schema already supports an R2 `file_key`).

---

## Rolling updates

Because migrations run as a separate step **before** the new API image starts,
the safe sequence on every release is:

1. `docker compose run --rm migrate`
2. `docker compose pull`
3. `docker compose up -d` (api + worker restart; beat restarts once)
4. Smoke-test `/healthz` and worker logs

This is exactly what the GitHub deploy workflow automates (migrations gated
behind an environment approval).

---

## Troubleshooting

| Symptom                                                    | Likely cause                             | Fix                                                                                                                  |
| ---------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| API starts but `/healthz` hangs                            | DB unreachable                           | Check `DATABASE_URL` host from inside the container (`host.docker.internal` vs `localhost`)                          |
| Enrichment never runs                                      | Worker not started, or wrong `REDIS_URL` | Check worker logs; confirm it says `celery@... ready.`                                                               |
| Worker connects but tasks queue forever                    | Worker consuming a different queue       | Worker uses `enrichment`/`generation`/`scheduled` queues — keep defaults                                             |
| `ModuleNotFoundError: No module named 'fastapi'` in worker | Using the wrong image/venv               | Always use the worker image's own venv (`/app/apps/api/.venv/bin/celery`); never install worker deps separately      |
| Beat jobs fire twice                                       | More than one beat instance              | Scale beat to exactly one replica                                                                                    |
| `consumer: Cannot connect to redis... Connection refused`  | Redis down or wrong URL                  | Check `REDIS_URL`; run `redis-cli ping` from the host                                                                |
| Extension popup fetch fails in production                  | `host_permissions` ≠ `.env.production`   | Update both `PLASMO_PUBLIC_API_BASE` and the `manifest.host_permissions` to the same prod origin, rebuild, reinstall |
| Extension still calls `localhost:8000` after deploy        | Stale build or dev mode                  | Rebuild with `pnpm build` (uses `.env.production`); reinstall the new zip                                            |

now the workspace page have somethings that were not added.. look at the mockup some things are skipped..
c:\Users\Chisax\Desktop\Scout\docs\mockups\scout_workspace.html

like the filter bar just have stage and hiring status, no tags, source.

on the top of the card list right under the filters, the layout view picker (grid or list) is missing.

on the mockup the list is paginated, check the bottom with the text ontop showing 9 of 18 startups, please implement it
