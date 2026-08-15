from fastapi.testclient import TestClient


def _register(client: TestClient, email: str = "cv@example.com") -> str:
    r = client.post(
        "/v1/auth/register", json={"email": email, "password": "supersecret123"}
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


def test_default_profile_is_created_as_default(client: TestClient) -> None:
    token = _register(client)
    r = client.post("/v1/cv", data={"text": "Backend engineer. Python."}, headers=_auth(token))
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Default"
    assert body["is_default"] is True


def test_create_named_profile(client: TestClient) -> None:
    token = _register(client)
    client.post("/v1/cv", data={"text": "Backend engineer. Python."}, headers=_auth(token))
    r = client.post(
        "/v1/cv/profiles",
        data={"name": "Product"},
        files={"file": ("product.txt", b"Product manager. Figma, roadmaps.")},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["name"] == "Product"
    assert body["is_default"] is False  # the default already exists
    assert "Figma" in body["structured_data"]["skills"]

    r = client.get("/v1/cv/profiles", headers=_auth(token))
    assert r.status_code == 200
    names = [(p["name"], p["is_default"]) for p in r.json()]
    assert ("Default", True) in names
    assert ("Product", False) in names


def test_first_profile_becomes_default(client: TestClient) -> None:
    token = _register(client)
    r = client.post(
        "/v1/cv/profiles",
        data={"name": "Backend", "text": "Backend engineer. Go."},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    assert r.json()["is_default"] is True


def test_duplicate_profile_name_rejected(client: TestClient) -> None:
    token = _register(client)
    r = client.post("/v1/cv", data={"text": "Backend engineer. Python."}, headers=_auth(token))
    assert r.status_code == 200
    r = client.post(
        "/v1/cv/profiles",
        data={"name": "Default", "text": "Frontend engineer. React."},
        headers=_auth(token),
    )
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "CV_PROFILE_NAME_TAKEN"


def test_patch_promotes_default_and_clears_others(client: TestClient) -> None:
    token = _register(client)
    client.post("/v1/cv", data={"text": "Backend engineer. Python."}, headers=_auth(token))
    r = client.post(
        "/v1/cv/profiles",
        data={"name": "Product", "text": "Product manager. Figma."},
        headers=_auth(token),
    )
    product_id = r.json()["id"]

    r = client.patch(
        f"/v1/cv/profiles/{product_id}",
        json={"is_default": True},
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert r.json()["is_default"] is True

    # Exactly one default remains.
    profiles = client.get("/v1/cv/profiles", headers=_auth(token)).json()
    defaults = [p["name"] for p in profiles if p["is_default"]]
    assert defaults == ["Product"]

    # GET /cv (matches anchor) follows the new default.
    r = client.get("/v1/cv", headers=_auth(token))
    assert r.json()["name"] == "Product"


def test_patch_rename_profile(client: TestClient) -> None:
    token = _register(client)
    r = client.post(
        "/v1/cv/profiles",
        data={"name": "Backend", "text": "Backend engineer. Go."},
        headers=_auth(token),
    )
    pid = r.json()["id"]
    r = client.patch(f"/v1/cv/profiles/{pid}", json={"name": "Backend v2"}, headers=_auth(token))
    assert r.status_code == 200
    assert r.json()["name"] == "Backend v2"


def test_delete_default_promotes_oldest(client: TestClient) -> None:
    token = _register(client)
    client.post("/v1/cv", data={"text": "Backend engineer. Python."}, headers=_auth(token))
    default_id = client.get("/v1/cv", headers=_auth(token)).json()["id"]
    r = client.post(
        "/v1/cv/profiles",
        data={"name": "Product", "text": "Product manager. Figma."},
        headers=_auth(token),
    )
    product_id = r.json()["id"]

    r = client.delete(f"/v1/cv/profiles/{default_id}", headers=_auth(token))
    assert r.status_code == 204

    profiles = client.get("/v1/cv/profiles", headers=_auth(token)).json()
    assert len(profiles) == 1
    assert profiles[0]["id"] == product_id
    assert profiles[0]["is_default"] is True


def test_delete_all_profiles_leaves_no_cv(client: TestClient) -> None:
    token = _register(client)
    r = client.post("/v1/cv", data={"text": "Backend engineer. Python."}, headers=_auth(token))
    default_id = r.json()["id"]
    client.delete(f"/v1/cv/profiles/{default_id}", headers=_auth(token))

    r = client.get("/v1/cv", headers=_auth(token))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "CV_NOT_FOUND"


def test_profile_requires_owned_id(client: TestClient) -> None:
    token_a = _register(client, email="cva@example.com")
    token_b = _register(client, email="cvb@example.com")
    r = client.post(
        "/v1/cv/profiles",
        data={"name": "Backend", "text": "Backend engineer. Go."},
        headers=_auth(token_a),
    )
    pid = r.json()["id"]
    r = client.delete(f"/v1/cv/profiles/{pid}", headers=_auth(token_b))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "CV_PROFILE_NOT_FOUND"