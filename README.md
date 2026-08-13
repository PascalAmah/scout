# Scout

AI-native startup job-search workspace. Save a startup from the extension, Scout researches it (AI summary, tech stack, hiring signal), then you track it through applications and generate matched resumes + outreach.

**Source of truth for sequencing:** `docs/Scout_Build_Plan.md`

## Monorepo layout

```
apps/
  web/         React (Vite) web app
  extension/   Plasmo browser extension (MV3)
  api/         FastAPI service (all routes under /v1)
  worker/      Celery worker (Phase 1.3)
packages/
  ui/          shared UI components
  prompts/     versioned LLM prompt templates
  shared/      shared TS utilities
  types/       shared TS + generated OpenAPI types
infrastructure/
  docker/      docker-compose (Postgres 16 + pgvector, Redis)
docs/          specs (PRD, ARCHITECTURE, API_SPEC, DATABASE_SCHEMA, UI_UX, build plan) + mockups
```

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Postgres + Redis)
- [Node.js](https://nodejs.org/) + pnpm (`npm i -g pnpm`)
- Python 3.12+ with [uv](https://docs.astral.sh/uv/) (`pip install uv`)
- Chrome (to test the extension)

## 1. Start the servers

### Step 1 — Databases (Postgres + Redis)

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Wait until both are healthy:

```bash
docker ps --format "{{.Names}}: {{.Status}}"
# scout_postgres: Up (healthy)   scout_redis: Up (healthy)
```

### Step 2 — API (FastAPI)

```bash
cd apps/api
python -m uv run uvicorn app.main:app --reload --port 8000
```

Confirm it's up:

```bash
curl http://localhost:8000/healthz        # -> {"status":"ok"}
```

### Step 3 — Web app (Vite)

```bash
cd apps/web
pnpm dev
```

Open **http://localhost:5173** — the dev server proxies `/v1` to the API on `:8000`.

### Step 4 — Extension (Plasmo, optional)

```bash
cd apps/extension
pnpm dev
```

Or load a production build: `pnpm build`, then in `chrome://extensions` enable *Developer mode* → *Load unpacked* → select `apps/extension/build`.

## 2. Test manually

### Via Swagger (API only)

1. Open **http://localhost:8000/docs**
2. Expand `POST /v1/auth/register` → **Try it out** → fill in `email`/`password` (≥8 chars) → **Execute**
3. Copy `access_token` from the response
4. Click **Authorize** (top-right) → paste `Bearer <access_token>` → **Authorize**
5. Now call `GET /v1/auth/me`, `POST /v1/auth/logout`, etc. with auth applied.

### Via the web app (end to end)

1. Go to **http://localhost:5173/register** and create an account
2. You land on the Dashboard → click *Sign in* and log in with the same account
3. Log out / log back in to confirm the session persists
4. Use **http://localhost:5173/password-reset** to request a reset (a real email sends only if `RESEND_API_KEY` is set in `apps/api/.env`; otherwise the endpoint still returns 204)

### Demo account (local)

```
email:    demo@scout.app
password: supersecret123
```

## 3. Run checks

| Command | Where | What it does |
|---|---|---|
| `python -m uv run pytest` | `apps/api` | API tests |
| `python -m uv run ruff check .` | `apps/api` | lint |
| `python -m uv run mypy app` | `apps/api` | type check |
| `pnpm typecheck` | `apps/web` / `apps/extension` | TS type check |
| `pnpm lint` | `apps/web` / `apps/extension` | lint |
| `pnpm build` | `apps/web` / `apps/extension` | production build |

## Key paths

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- API health: `http://localhost:8000/healthz`
- Web app: `http://localhost:5173`
