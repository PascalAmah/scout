import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Resume, ResumeVersion, User


def _register(client: TestClient, email: str = "gen@example.com") -> str:
    r = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "supersecret123"},
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _save_startup_and_job(client: TestClient, token: str) -> uuid.UUID:
    r = client.post(
        "/v1/startups",
        json={"name": "Nova Labs", "website": "https://nova.example.com"},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    startup_id = r.json()["id"]
    r = client.post(
        f"/v1/startups/{startup_id}/jobs",
        json={"title": "Backend Engineer", "description": "Python FastAPI PostgreSQL"},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    return uuid.UUID(r.json()["id"])


def _create_application(client: TestClient, token: str, startup_id: uuid.UUID, job_id: uuid.UUID):
    r = client.post(
        "/v1/applications",
        json={"startup_id": str(startup_id), "job_id": str(job_id), "status": "interested"},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_create_resume_makes_base(client: TestClient) -> None:
    token = _register(client)
    r = client.post("/v1/resumes", json={"title": "Backend Resume"}, headers=_auth(token))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["is_base"] is True

    r = client.get("/v1/resumes", headers=_auth(token))
    assert r.status_code == 200
    assert [r["id"] for r in r.json()] == [body["id"]]


def test_generate_returns_accepted_and_job_row(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    job_id = _save_startup_and_job(client, token)
    startup_id = str(_startup_id_for(client, token))
    app_row = _create_application(client, token, uuid.UUID(startup_id), job_id)

    r = client.post(
        "/v1/resumes",
        json={"title": "Base", "content": {"skills": ["Python"], "experience": []}},
        headers=_auth(token),
    )
    resume_id = r.json()["id"]

    r = client.post(
        f"/v1/resumes/{resume_id}/generate",
        json={"application_id": app_row["id"], "tone": "concise", "emphasize": ["backend"]},
        headers=_auth(token),
    )
    assert r.status_code == 202, r.text
    payload = r.json()
    assert payload["status"] == "queued"
    assert uuid.UUID(payload["job_id"])

    # Worker never runs in tests → no version yet, and a version-less download 404s.
    r = client.get(f"/v1/resumes/{resume_id}/versions", headers=_auth(token))
    assert r.status_code == 200
    assert r.json() == []


def _startup_id_for(client: TestClient, token: str) -> uuid.UUID:
    r = client.get("/v1/startups", headers=_auth(token))
    return uuid.UUID(r.json()["data"][0]["id"])


def test_review_gate_blocks_download_until_reviewed(
    client: TestClient, db_session: Session
) -> None:
    token = _register(client)
    # Make a resume + version directly in the DB (no worker in tests).
    user = db_session.query(User).filter(User.email == "gen@example.com").one()
    resume = Resume(user_id=user.id, title="Base", is_base=True, content={"skills": ["Go"]})
    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)
    version = ResumeVersion(resume_id=resume.id, content={"skills": ["Go"]})
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    # Not reviewed → 409 NOT_REVIEWED on download.
    r = client.get(f"/v1/resume-versions/{version.id}/download", headers=_auth(token))
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "NOT_REVIEWED"

    # Review is a deliberate action; after it, the gate clears.
    r = client.post(f"/v1/resume-versions/{version.id}/review", headers=_auth(token))
    assert r.status_code == 200, r.text
    assert r.json()["reviewed_at"] is not None

    # Reviewed → download renders the PDF on demand and returns its URL.
    r = client.get(f"/v1/resume-versions/{version.id}/download", headers=_auth(token))
    assert r.status_code == 200, r.text
    url = r.json()["url"]
    assert url.startswith("/v1/files/resume-versions/")

    # The rendered file is served to the owner as a PDF.
    r = client.get(url, headers=_auth(token))
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:5] == b"%PDF-"

    # Ownership: a different user cannot fetch the file.
    other = _register(client, email="other@example.com")
    r = client.get(url, headers=_auth(other))
    assert r.status_code == 404


def test_outreach_sent_gate(client: TestClient, db_session: Session) -> None:
    token = _register(client)
    job_id = _save_startup_and_job(client, token)
    startup_id = str(_startup_id_for(client, token))
    app_row = _create_application(client, token, uuid.UUID(startup_id), job_id)

    from app.models import Outreach

    outreach = Outreach(
        application_id=uuid.UUID(app_row["id"]),
        channel="cover_letter",
        content="Draft copy",
        status="draft",
    )
    db_session.add(outreach)
    db_session.commit()
    db_session.refresh(outreach)

    # draft → sent without review → 409 NOT_REVIEWED.
    r = client.patch(
        f"/v1/outreach/{outreach.id}",
        json={"status": "sent"},
        headers=_auth(token),
    )
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "NOT_REVIEWED"

    # Review first, then the transition is allowed and sent_at is stamped.
    r = client.post(f"/v1/outreach/{outreach.id}/review", headers=_auth(token))
    assert r.status_code == 200
    r = client.patch(
        f"/v1/outreach/{outreach.id}",
        json={"status": "sent"},
        headers=_auth(token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "sent"
    assert r.json()["sent_at"] is not None


def test_application_detail_includes_timeline_and_outreach(
    client: TestClient, db_session: Session
) -> None:
    token = _register(client)
    job_id = _save_startup_and_job(client, token)
    startup_id = str(_startup_id_for(client, token))
    app_row = _create_application(client, token, uuid.UUID(startup_id), job_id)

    from app.models import Outreach

    db_session.add(
        Outreach(
            application_id=uuid.UUID(app_row["id"]),
            channel="email",
            content="hello",
            status="draft",
        )
    )
    db_session.commit()

    r = client.get(f"/v1/applications/{app_row['id']}", headers=_auth(token))
    assert r.status_code == 200, r.text
    detail = r.json()
    assert len(detail["outreach"]) == 1
    types = [e["type"] for e in detail["timeline"]]
    assert "created" in types
    assert "status_change" in types
    assert "outreach_created" in types


def test_application_patch_attaches_resume_version(
    client: TestClient, db_session: Session
) -> None:
    token = _register(client)
    job_id = _save_startup_and_job(client, token)
    startup_id = str(_startup_id_for(client, token))
    app_row = _create_application(client, token, uuid.UUID(startup_id), job_id)

    user = db_session.query(User).filter(User.email == "gen@example.com").one()
    resume = Resume(user_id=user.id, title="Base", is_base=True)
    db_session.add(resume)
    db_session.commit()
    db_session.refresh(resume)
    version = ResumeVersion(resume_id=resume.id, content={"skills": ["Go"]})
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    r = client.patch(
        f"/v1/applications/{app_row['id']}",
        json={"resume_version_id": str(version.id)},
        headers=_auth(token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["resume_version"]["id"] == str(version.id)

def test_delete_version_prunes_versions_but_keeps_base(
    client: TestClient, db_session: Session
) -> None:
    token = _register(client)
    r = client.post(
        "/v1/resumes",
        json={"title": "Base", "content": {"skills": ["Python"]}},
        headers=_auth(token),
    )
    resume_id = r.json()["id"]
    user = db_session.query(User).filter(User.email == "gen@example.com").one()
    resume = db_session.get(Resume, uuid.UUID(resume_id))
    version_a = ResumeVersion(resume_id=resume.id, content={"summary": "A"})
    version_b = ResumeVersion(resume_id=resume.id, content={"summary": "B"})
    db_session.add_all([version_a, version_b])
    db_session.commit()
    db_session.refresh(version_a)
    db_session.refresh(version_b)

    r = client.delete(f"/v1/resume-versions/{version_a.id}", headers=_auth(token))
    assert r.status_code == 204, r.text

    remaining = client.get(f"/v1/resumes/{resume_id}/versions", headers=_auth(token)).json()
    assert [v["id"] for v in remaining] == [str(version_b.id)]

    # Base resume survives version pruning.
    r = client.get("/v1/resumes", headers=_auth(token))
    assert r.status_code == 200
    assert [res["id"] for res in r.json()] == [resume_id]

    # Deleting a second time (or someone else's version) 404s.
    r = client.delete(f"/v1/resume-versions/{version_a.id}", headers=_auth(token))
    assert r.status_code == 404


def test_delete_version_rejects_other_users_version(
    client: TestClient, db_session: Session
) -> None:
    token = _register(client, email="gen-a@example.com")
    token2 = _register(client, email="gen-b@example.com")
    r = client.post("/v1/resumes", json={"title": "A"}, headers=_auth(token))
    resume_id = r.json()["id"]
    user = db_session.query(User).filter(User.email == "gen-a@example.com").one()
    resume = db_session.get(Resume, uuid.UUID(resume_id))
    version = ResumeVersion(resume_id=resume.id, content={"summary": "A"})
    db_session.add(version)
    db_session.commit()
    db_session.refresh(version)

    r = client.delete(f"/v1/resume-versions/{version.id}", headers=_auth(token2))
    assert r.status_code == 404

    # Owner still sees it untouched.
    remaining = client.get(f"/v1/resumes/{resume_id}/versions", headers=_auth(token)).json()
    assert [v["id"] for v in remaining] == [str(version.id)]
