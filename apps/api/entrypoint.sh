#!/bin/sh
# Scout API entrypoint — runs DB migrations then starts uvicorn.
#
# Render (free tier, no shell) can't manually run `alembic upgrade head`, so
# this script migrates-then-serves on every cold start. Alembic is idempotent:
# `upgrade head` is a no-op once the DB is already at head, so re-runs are safe
# and cheap. This keeps a fresh deploy's schema current without a separate
# migrate step.
set -eu

echo "[entrypoint] running migrations..."
/app/apps/api/.venv/bin/alembic upgrade head

echo "[entrypoint] starting uvicorn..."
exec /app/apps/api/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
