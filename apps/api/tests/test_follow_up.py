import uuid
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Application, Job, Notification, Startup, User


def _register(client: TestClient, email: str = "fu@example.com") -> str:
    r = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "supersecret123"},
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_due_application(db: Session, client: TestClient, token: str) -> uuid.UUID:
    user = db.query(User).filter(User.email == "fu@example.com").one()
    r = client.post(
        "/v1/startups",
        json={"name": "Pulse Labs", "website": "https://pulse.example.com"},
        headers=_auth(token),
    )
    startup_id = uuid.UUID(r.json()["id"])
    startup = db.get(Startup, startup_id)

    r = client.post(
        f"/v1/startups/{startup_id}/jobs",
        json={"title": "Product Engineer", "description": "React TypeScript"},
        headers=_auth(token),
    )
    job = db.get(Job, uuid.UUID(r.json()["id"]))

    app_row = Application(
        user_id=user.id,
        startup_id=startup.id,
        job_id=job.id,
        status="applied",
        applied_at=datetime.now(UTC) - timedelta(days=10),
    )
    db.add(app_row)
    db.commit()
    db.refresh(app_row)
    return app_row.id


def test_needs_follow_up_lists_due_applications(
    client: TestClient, db_session: Session
) -> None:
    token = _register(client)
    app_id = _seed_due_application(db_session, client, token)

    r = client.get("/v1/applications/needs-follow-up", headers=_auth(token))
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["application_id"] == str(app_id)
    assert rows[0]["startup_name"] == "Pulse Labs"
    assert rows[0]["job_title"] == "Product Engineer"
    assert rows[0]["days_since"] >= 10


def test_follow_up_notice_is_raised_once(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    _seed_due_application(db_session, client, token)

    from app.services import follow_up_service

    user = db_session.query(User).filter(User.email == "fu@example.com").one()
    due = follow_up_service.due_applications(db_session, user.id, 5)
    assert len(due) == 1
    follow_up_service.raise_follow_up_notice(db_session, due[0])
    db_session.commit()

    notice = db_session.query(Notification).filter(
        Notification.user_id == user.id, Notification.type == "follow_up_due"
    ).one()
    assert notice.entity_id == due[0].id

    # Deduped — the same application no longer appears as due.
    assert follow_up_service.due_applications(db_session, user.id, 5) == []

    # Dashboard endpoint reflects the dedupe too.
    r = client.get("/v1/applications/needs-follow-up", headers=_auth(token))
    assert r.json() == []


def test_generate_follow_up_is_accepted(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    app_id = _seed_due_application(db_session, client, token)

    r = client.post(f"/v1/applications/{app_id}/follow-up", headers=_auth(token))
    assert r.status_code == 202, r.text
    assert r.json()["status"] == "queued"
    assert uuid.UUID(r.json()["job_id"])
