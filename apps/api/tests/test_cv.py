from fastapi.testclient import TestClient


def _register(client: TestClient) -> str:
    r = client.post(
        "/v1/auth/register", json={"email": "cv@example.com", "password": "supersecret123"}
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_cv_not_found(client: TestClient) -> None:
    token = _register(client)
    r = client.get("/v1/cv", headers=_auth(token))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "CV_NOT_FOUND"


def test_cv_upload_text_and_get(client: TestClient) -> None:
    token = _register(client)
    cv_text = (
        "Senior Backend Engineer with 5 years of experience in Python, FastAPI, "
        "PostgreSQL. BSc in Computer Science."
    )
    r = client.post("/v1/cv", data={"text": cv_text}, headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["raw_text"] == cv_text
    structured = body["structured_data"]
    assert "Python" in structured["skills"]
    assert "Backend Engineer" in structured["roles"]
    assert structured["years_of_experience"] == 5

    r = client.get("/v1/cv", headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["id"] == body["id"]


def test_cv_upload_txt_file(client: TestClient) -> None:
    token = _register(client)
    r = client.post(
        "/v1/cv",
        files={"file": ("resume.txt", b"React, Go, Docker. 3 years of experience.")},
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert r.json()["source_file_key"] == "resume.txt"
    assert "React" in r.json()["structured_data"]["skills"]


def test_cv_replace(client: TestClient) -> None:
    token = _register(client)
    client.post("/v1/cv", data={"text": "Frontend engineer. React, Vue."}, headers=_auth(token))
    r = client.post("/v1/cv", data={"text": "Backend engineer. Go and Rust."}, headers=_auth(token))
    assert r.status_code == 200
    structured = r.json()["structured_data"]
    assert "Go" in structured["skills"]
    assert "React" not in structured["skills"]


def test_cv_requires_content(client: TestClient) -> None:
    token = _register(client)
    r = client.post("/v1/cv", data={}, headers=_auth(token))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "CV_REQUIRED"