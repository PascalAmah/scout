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

# Entrypoint runs alembic upgrade head, then starts uvicorn — so a fresh
# deploy auto-migrates. Alembic `upgrade head` is idempotent, so re-runs on
# every boot are safe. Render free tier has no shell to run migrations by hand.
COPY apps/api/entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

EXPOSE 8000

CMD ["./entrypoint.sh"]