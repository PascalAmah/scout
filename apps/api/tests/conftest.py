import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("RATE_LIMIT_DISABLED", "1")
os.environ.setdefault("FILE_STORE_DIR", str(Path(tempfile.gettempdir()) / "scout_test_files"))
# Keep API tests offline and deterministic: even if a real AI key exists in the
# root .env, tests must never hit the live provider (match re-rank, assistant,
# query embedding all degrade to their deterministic fallbacks without a key).
# These are set before `app.config` loads the root .env, and load_dotenv never
# overrides already-set variables.
for _var in ("AI_API_KEY", "AI_EMBEDDING_API_KEY", "AI_MODEL", "AI_BASE_URL", "OPENAI_API_KEY"):
    os.environ.setdefault(_var, "")

from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def engine():
    eng = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=eng)
    return eng


@pytest.fixture()
def session_factory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def db_session(session_factory):
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(engine, session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()