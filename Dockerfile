# Root-level Dockerfile for deploying the Scout API on Render.
#
# Render builds from the repo root and looks for ./Dockerfile by default. The
# authoritative API build lives in apps/api/Dockerfile (build context = repo
# root, COPY paths relative to the monorepo root). This file is a thin alias so
# Render's Dockerfile Path can be "./Dockerfile" with the repo root as context,
# avoiding Render's subdirectory-context pitfall (where listing apps/api/Dockerfile
# would build with apps/api as the context and break the root-relative COPY paths).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

RUN pip install --no-cache-dir uv

WORKDIR /app

# Sub-build: install the API's pinned deps into a venv at /app/apps/api.
# Kept identical to apps/api/Dockerfile so behavior matches local/compose builds.
COPY apps/api/pyproject.toml apps/api/uv.lock ./apps/api/
RUN cd apps/api && uv sync --frozen --no-dev

# Application source + migrations.
COPY apps/api/app ./apps/api/app
COPY apps/api/alembic ./apps/api/alembic
COPY apps/api/alembic.ini ./apps/api/

WORKDIR /app/apps/api
EXPOSE 8000

# Migrations run as a separate deploy step, not on every boot.
CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
