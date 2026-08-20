# Build context = repo root (copy paths are relative to the monorepo root).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

RUN pip install --no-cache-dir uv

WORKDIR /app/apps/api

# Dependencies first (cached layer): lockfile + project metadata only.
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN uv sync --frozen --no-dev

# Application source + migrations.
COPY apps/api/app ./app
COPY apps/api/alembic ./alembic
COPY apps/api/alembic.ini ./

EXPOSE 8000

# Migrations run as a separate deploy step (see compose `migrate` service /
# deploy workflow), not on every boot. Call the venv binary directly so `uv`
# never re-syncs deps at container start.
CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]