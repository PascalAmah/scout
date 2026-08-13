"""Seed the local demo account (idempotent).

Usage:
    python -m uv run python scripts/seed_demo.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.errors import ScoutError
from app.db.session import SessionLocal
from app.services import auth_service

DEMO_EMAIL = "demo@scout.app"
DEMO_PASSWORD = "supersecret123"
DEMO_NAME = "Demo User"


def main() -> None:
    db = SessionLocal()
    try:
        try:
            auth_service.register(db, DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME)
            print(f"seeded demo user: {DEMO_EMAIL}")
        except ScoutError as exc:
            if exc.code == "EMAIL_TAKEN":
                print(f"demo user already exists: {DEMO_EMAIL}")
            else:
                raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
