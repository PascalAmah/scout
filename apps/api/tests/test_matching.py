import uuid

from fastapi.testclient import TestClient


def _register(client: TestClient) -> str:
    r = client.post(
        "/v1/auth/register", json={"email": "match@example.com", "password": "supersecret123"}
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _save_startup_and_job(
    client: TestClient, token: str, name: str, title: str, description: str
) -> tuple[uuid.UUID, uuid.UUID]:
    r = client.post(
        "/v1/startups",
        json={"name": name, "website": f"https://{name.lower()}.example.com"},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    startup_id = r.json()["id"]
    r = client.post(
        f"/v1/startups/{startup_id}/jobs",
        json={"title": title, "description": description},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    return startup_id, uuid.UUID(r.json()["id"])


def test_match_compute_and_recommended(client: TestClient) -> None:
    token = _register(client)
    _startup1, job_backend = _save_startup_and_job(
        client, token, "Lumina Health", "Backend Engineer", "Python FastAPI PostgreSQL open roles"
    )
    _startup2, job_design = _save_startup_and_job(
        client, token, "Bloom Studio", "Brand Designer", "Figma branding illustrations"
    )

    client.post(
        "/v1/cv",
        data={"text": "Backend engineer Python FastAPI PostgreSQL five years of experience"},
        headers=_auth(token),
    )

    r = client.post("/v1/match/compute", headers=_auth(token))
    assert r.status_code == 200, r.text
    assert r.json() == {"status": "ok", "computed_scores": 2}

    r = client.get("/v1/jobs/recommended", headers=_auth(token))
    assert r.status_code == 200, r.text
    payload = r.json()
    assert len(payload["data"]) == 2

    first, second = payload["data"]
    assert first["job_id"] == str(job_backend)
    assert first["score"] > second["score"]
    # Phase 3.1 restored the full API_SPEC contract: score ships with an
    # explanation + confidence band, and gaps is required (never "perfect fit").
    assert first["confidence_band"] in ("strong", "moderate", "weak")
    assert first["explanation"] is not None
    assert first["explanation"]["matched_skills"]
    assert first["explanation"]["gaps"]
    assert isinstance(first["explanation"]["summary"], str) and first["explanation"]["summary"]
    assert first["startup_name"] == "Lumina Health"


def test_match_detail_after_compute(client: TestClient) -> None:
    token = _register(client)
    _startup, job_id = _save_startup_and_job(
        client, token, "Lumina Health", "Backend Engineer", "Python PostgreSQL Go"
    )
    client.post(
        "/v1/cv",
        data={"text": "Backend engineer Python Go PostgreSQL"},
        headers=_auth(token),
    )
    client.post("/v1/match/compute", headers=_auth(token))

    r = client.get(f"/v1/match/{job_id}", headers=_auth(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["job_id"] == str(job_id)
    assert body["score"] > 0
    assert body["confidence_band"] in ("strong", "moderate", "weak")
    assert body["explanation"] is not None
    assert body["explanation"]["matched_skills"]
    assert body["explanation"]["gaps"]

    # Not in workspace → 404.
    other = uuid.uuid4()
    r = client.get(f"/v1/match/{other}", headers=_auth(token))
    assert r.status_code == 404


def test_recommended_drops_rated_matches(client: TestClient) -> None:
    token = _register(client)
    _startup1, job_backend = _save_startup_and_job(
        client, token, "Lumina Health", "Backend Engineer", "Python FastAPI PostgreSQL open roles"
    )
    _startup2, job_design = _save_startup_and_job(
        client, token, "Bloom Studio", "Brand Designer", "Figma branding illustrations"
    )

    client.post(
        "/v1/cv",
        data={"text": "Backend engineer Python FastAPI PostgreSQL five years of experience"},
        headers=_auth(token),
    )
    client.post("/v1/match/compute", headers=_auth(token))

    r = client.get("/v1/jobs/recommended", headers=_auth(token))
    assert r.status_code == 200, r.text
    assert len(r.json()["data"]) == 2

    # Rate the backend role — it should retire from the recommended queue.
    r = client.post(
        f"/v1/match/{job_backend}/feedback",
        json={"feedback": "good"},
        headers=_auth(token),
    )
    assert r.status_code == 200, r.text

    r = client.get("/v1/jobs/recommended", headers=_auth(token))
    assert r.status_code == 200, r.text
    payload = r.json()
    assert len(payload["data"]) == 1
    assert payload["data"][0]["job_id"] == str(job_design)

    # Rating the last one empties the queue.
    r = client.post(
        f"/v1/match/{job_design}/feedback",
        json={"feedback": "poor"},
        headers=_auth(token),
    )
    assert r.status_code == 200, r.text
    r = client.get("/v1/jobs/recommended", headers=_auth(token))
    assert r.status_code == 200, r.text
    assert r.json()["data"] == []


def test_recommended_empty_before_compute(client: TestClient) -> None:
    token = _register(client)
    _save_startup_and_job(client, token, "Lumina", "Backend Engineer", "Python")
    r = client.get("/v1/jobs/recommended", headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["data"] == []