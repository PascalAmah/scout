import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "worker"))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.models import Notification, User  # noqa: E402


def _register(client: TestClient, email: str = "rem@example.com") -> str:
    r = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "supersecret123"},
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_patch_me_updates_email_reminders(client: TestClient, db_session: Session) -> None:
    token = _register(client)

    r = client.patch(
        "/v1/auth/me", json={"email_reminders_enabled": True}, headers=_auth(token)
    )
    assert r.status_code == 200, r.text
    assert r.json()["email_reminders_enabled"] is True

    r = client.get("/v1/auth/me", headers=_auth(token))
    assert r.json()["email_reminders_enabled"] is True

    user = db_session.query(User).filter(User.email == "rem@example.com").one()
    assert user.email_reminders_enabled is True


def test_send_reminder_emails_sends_and_marks_read(
    client: TestClient, session_factory, monkeypatch
) -> None:
    token = _register(client)
    client.patch(
        "/v1/auth/me", json={"email_reminders_enabled": True}, headers=_auth(token)
    )

    user = session_factory().query(User).filter(User.email == "rem@example.com").one()
    db = session_factory()
    db.add(
        Notification(
            user_id=user.id,
            type="follow_up_due",
            entity_type="application",
            entity_id=uuid.uuid4(),
            title="Follow up with Pulse Labs",
            body="Applied 5 days ago — send a nudge.",
        )
    )
    db.commit()
    db.close()

    from tasks.reminder_email import send_reminder_emails

    sent: list[tuple[str, str, str]] = []

    def fake_send(to: str, subject: str, html: str) -> None:
        sent.append((to, subject, html))

    monkeypatch.setattr("app.services.email.send_email", fake_send)
    monkeypatch.setattr("tasks.reminder_email._session", session_factory)

    result = send_reminder_emails()
    assert result["status"] == "succeeded"
    assert result["sent"] == 1

    to, subject, html = sent[0]
    assert to == "rem@example.com"
    assert "digest" in subject.lower()
    assert "Follow up with Pulse Labs" in html

    db = session_factory()
    notice = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.type == "follow_up_due"
    ).one()
    assert notice.read_at is not None
    db.close()


def test_send_reminder_emails_skips_unopted_users(
    client: TestClient, session_factory, monkeypatch
) -> None:
    _register(client)

    from tasks.reminder_email import send_reminder_emails

    sent: list[tuple[str, str, str]] = []

    def fake_send(to: str, subject: str, html: str) -> None:
        sent.append((to, subject, html))

    monkeypatch.setattr("app.services.email.send_email", fake_send)
    monkeypatch.setattr("tasks.reminder_email._session", session_factory)

    result = send_reminder_emails()
    assert result["status"] == "succeeded"
    assert result["sent"] == 0
    assert sent == []
