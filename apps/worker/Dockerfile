# Build context = repo root (copy paths are relative to the monorepo root).
#
# The worker imports the API package (app.*) at runtime, so this image carries
# BOTH apps — mirrored to the same relative layout the code expects:
#   - celery_app.py inserts ../api into sys.path
#   - tasks/prompts.py resolves packages/ from the repo root
# Dependencies = API deps (uv, from the lockfile) + worker deps (pip).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

RUN pip install --no-cache-dir uv

WORKDIR /app

# API deps first (cached layer), installed into the API venv.
COPY apps/api/pyproject.toml apps/api/uv.lock ./apps/api/
RUN cd apps/api && uv sync --frozen --no-dev

# Worker deps go into the same venv as the API's.
COPY apps/worker/requirements.txt ./apps/worker/requirements.txt
RUN uv pip install --python apps/api/.venv/bin/python -r apps/worker/requirements.txt

# Full source trees + prompt packages (repo-root layout preserved).
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
COPY packages ./packages

WORKDIR /app/apps/worker

# Override CMD for the beat variant (compose `beat` service) or a custom pool.
# Call the venv binary directly so `uv` never re-syncs deps at container start.
CMD ["/app/apps/api/.venv/bin/celery", "-A", "celery_app:celery_app", "worker", "--loglevel=info", "--concurrency=2"]