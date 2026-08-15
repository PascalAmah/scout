import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Application, Startup, User


def _register(client: TestClient, email: str = "an@example.com") -> str:
    r = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "supersecret123"},
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_startup(db: Session, user_id: uuid.UUID, source: str = "yc") -> Startup:
    row = Startup(
        name=f"Acme {source}",
        website=f"https://{source}.example.com",
        source=source,
        created_by=user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _seed_application(
    db: Session,
    user_id: uuid.UUID,
    startup_id: uuid.UUID,
    status: str,
    created_days_ago: int,
    applied_days_ago: int | None = None,
) -> None:
    row = Application(
        user_id=user_id,
        startup_id=startup_id,
        status=status,
        created_at=datetime.now(UTC) - timedelta(days=created_days_ago),
        applied_at=(
            datetime.now(UTC) - timedelta(days=applied_days_ago)
            if applied_days_ago is not None
            else None
        ),
    )
    db.add(row)
    db.commit()


def _window(days: int = 28) -> str:
    # ``+00:00`` would be decoded as a space in the query string; use Z.
    return (datetime.now(UTC) - timedelta(days=days)).isoformat().replace("+00:00", "Z")


def test_summary_counts_and_rates(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    user = db_session.query(User).filter(User.email == "an@example.com").one()
    startup = _seed_startup(db_session, user.id)
    # One application created before the window — must be excluded.
    _seed_application(db_session, user.id, startup.id, "saved", created_days_ago=30)
    _seed_application(db_session, user.id, startup.id, "applied", 25, applied_days_ago=24)
    _seed_application(db_session, user.id, startup.id, "interview", 20, applied_days_ago=19)
    _seed_application(db_session, user.id, startup.id, "offer", 15, applied_days_ago=14)
    _seed_application(db_session, user.id, startup.id, "rejected", 10, applied_days_ago=9)

    r = client.get(f"/v1/analytics/summary?from={_window()}", headers=_auth(token))
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["applications_sent"] == 4  # applied + interview + offer + rejected
    assert body["applications_sent_prev"] == 0
    assert body["response_rate"] == 75.0  # 3 responses (interview/offer/rejected) / 4 applied
    assert body["applied_to_interview"] == 75.0
    assert body["offers"] == 1
    assert body["by_status"] == {
        "saved": 0,
        "interested": 0,
        "applied": 1,
        "interview": 1,
        "offer": 1,
        "rejected": 1,
    }
    assert len(body["response_rate_series"]) >= 4


def test_summary_previous_period(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    user = db_session.query(User).filter(User.email == "an@example.com").one()
    startup = _seed_startup(db_session, user.id)
    # 50 days ago lands inside the previous window [now-56d, now-28d).
    _seed_application(db_session, user.id, startup.id, "applied", created_days_ago=50, applied_days_ago=49)
    _seed_application(db_session, user.id, startup.id, "applied", created_days_ago=10, applied_days_ago=9)

    r = client.get(f"/v1/analytics/summary?from={_window()}", headers=_auth(token))
    body = r.json()
    assert body["applications_sent"] == 1
    assert body["applications_sent_prev"] == 1


def test_summary_excludes_archived(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    user = db_session.query(User).filter(User.email == "an@example.com").one()
    startup = _seed_startup(db_session, user.id)
    _seed_application(db_session, user.id, startup.id, "applied", created_days_ago=10, applied_days_ago=9)
    _seed_application(db_session, user.id, startup.id, "archived", created_days_ago=5, applied_days_ago=4)

    r = client.get(f"/v1/analytics/summary?from={_window()}", headers=_auth(token))
    body = r.json()
    assert body["applications_sent"] == 1
    assert body["by_status"] == {
        "saved": 0,
        "interested": 0,
        "applied": 1,
        "interview": 0,
        "offer": 0,
        "rejected": 0,
    }


def test_funnel_is_cumulative(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    user = db_session.query(User).filter(User.email == "an@example.com").one()
    startup = _seed_startup(db_session, user.id)
    _seed_application(db_session, user.id, startup.id, "saved", 10)
    _seed_application(db_session, user.id, startup.id, "saved", 9)
    _seed_application(db_session, user.id, startup.id, "applied", 8, applied_days_ago=7)
    _seed_application(db_session, user.id, startup.id, "interview", 7, applied_days_ago=6)

    r = client.get(f"/v1/analytics/funnel?from={_window()}", headers=_auth(token))
    assert r.status_code == 200, r.text
    stages = {s["stage"]: s["count"] for s in r.json()["stages"]}
    assert stages == {"saved": 4, "interested": 2, "applied": 2, "interview": 1, "offer": 0}

    conv = {f"{c['from_stage']}->{c['to_stage']}": c["rate"] for c in r.json()["conversions"]}
    assert conv["saved->interested"] == 50.0
    assert conv["interested->applied"] == 100.0
    assert conv["applied->interview"] == 50.0
    assert conv["interview->offer"] == 0.0


def test_funnel_rejected_reaches_interview(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    user = db_session.query(User).filter(User.email == "an@example.com").one()
    startup = _seed_startup(db_session, user.id)
    _seed_application(db_session, user.id, startup.id, "rejected", 10, applied_days_ago=9)

    r = client.get(f"/v1/analytics/funnel?from={_window()}", headers=_auth(token))
    stages = {s["stage"]: s["count"] for s in r.json()["stages"]}
    # Rejected is only reachable from interview (state machine), so it counts as reaching it.
    assert stages == {"saved": 1, "interested": 1, "applied": 1, "interview": 1, "offer": 0}


def test_source_filter(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    user = db_session.query(User).filter(User.email == "an@example.com").one()
    yc = _seed_startup(db_session, user.id, source="yc")
    manual = _seed_startup(db_session, user.id, source="manual")
    _seed_application(db_session, user.id, yc.id, "applied", 10, applied_days_ago=9)
    _seed_application(db_session, user.id, manual.id, "applied", 10, applied_days_ago=9)

    r = client.get(
        f"/v1/analytics/summary?from={_window()}&source=yc",
        headers=_auth(token),
    )
    body = r.json()
    assert body["applications_sent"] == 1
    assert body["by_status"] == {
        "saved": 0,
        "interested": 0,
        "applied": 1,
        "interview": 0,
        "offer": 0,
        "rejected": 0,
    }


def test_empty_analytics(client: TestClient, db_session: Session) -> None:
    token = _register(client)

    r = client.get(f"/v1/analytics/summary?from={_window()}", headers=_auth(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["applications_sent"] == 0
    assert body["response_rate"] is None
    assert body["offers"] == 0
    assert body["by_status"] == {
        "saved": 0,
        "interested": 0,
        "applied": 0,
        "interview": 0,
        "offer": 0,
        "rejected": 0,
    }
    # Weekly buckets are emitted even when empty; all must be zero-valued.
    assert len(body["response_rate_series"]) >= 4
    assert all(
        point["applied"] == 0 and point["responses"] == 0 and point["rate"] is None
        for point in body["response_rate_series"]
    )

    r = client.get(f"/v1/analytics/funnel?from={_window()}", headers=_auth(token))
    stages = {s["stage"]: s["count"] for s in r.json()["stages"]}
    assert stages == {"saved": 0, "interested": 0, "applied": 0, "interview": 0, "offer": 0}
    assert all(c["rate"] is None for c in r.json()["conversions"])
