from fastapi.testclient import TestClient


def _register(client: TestClient, email: str = "bulk@example.com") -> str:
    r = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "supersecret123"},
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_applications(client: TestClient, token: str, n: int = 3) -> list[str]:
    ids: list[str] = []
    for i in range(n):
        r = client.post(
            "/v1/startups",
            json={"name": f"Bulk Co {i}", "website": f"https://bulk{i}.example.com"},
            headers=_auth(token),
        )
        startup_id = r.json()["id"]
        r = client.post(
            "/v1/applications",
            json={"startup_id": startup_id, "status": "applied"},
            headers=_auth(token),
        )
        ids.append(r.json()["id"])
    return ids


def test_bulk_archive(client: TestClient) -> None:
    token = _register(client)
    ids = _seed_applications(client, token)

    r = client.post(
        "/v1/applications/bulk",
        json={"application_ids": ids[:2], "status": "archived"},
        headers=_auth(token),
    )
    assert r.status_code == 200, r.text
    assert r.json()["updated"] == 2

    # The pipeline board excludes archived by design — verify via the list filter.
    archived = client.get(
        "/v1/applications?status=archived&limit=100", headers=_auth(token)
    ).json()["data"]
    archived_ids = {app["id"] for app in archived}
    assert set(ids[:2]) <= archived_ids
    assert ids[2] not in archived_ids


def test_bulk_tag(client: TestClient) -> None:
    token = _register(client)
    ids = _seed_applications(client, token)

    r = client.post(
        "/v1/applications/bulk",
        json={"application_ids": ids, "tags": ["top-tier", "remote"]},
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert r.json()["updated"] == 3

    detail = client.get(f"/v1/applications/{ids[0]}", headers=_auth(token)).json()
    assert detail["tags"] == ["top-tier", "remote"]

    # Replacing tags replaces, not appends.
    client.post(
        "/v1/applications/bulk",
        json={"application_ids": [ids[0]], "tags": ["follow-up"]},
        headers=_auth(token),
    )
    detail = client.get(f"/v1/applications/{ids[0]}", headers=_auth(token)).json()
    assert detail["tags"] == ["follow-up"]


def test_bulk_archive_and_tag_together(client: TestClient) -> None:
    token = _register(client)
    ids = _seed_applications(client, token)

    r = client.post(
        "/v1/applications/bulk",
        json={"application_ids": ids, "status": "archived", "tags": ["done"]},
        headers=_auth(token),
    )
    assert r.status_code == 200
    assert r.json()["updated"] == 3

    detail = client.get(f"/v1/applications/{ids[1]}", headers=_auth(token)).json()
    assert detail["status"] == "archived"
    assert detail["tags"] == ["done"]


def test_bulk_rejects_non_archive_status(client: TestClient) -> None:
    token = _register(client)
    ids = _seed_applications(client, token, n=1)

    r = client.post(
        "/v1/applications/bulk",
        json={"application_ids": ids, "status": "interview"},
        headers=_auth(token),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "INVALID_BULK_STATUS"


def test_bulk_rejects_foreign_application(client: TestClient) -> None:
    token_a = _register(client, email="bulka@example.com")
    token_b = _register(client, email="bulkb@example.com")
    ids = _seed_applications(client, token_a, n=1)

    r = client.post(
        "/v1/applications/bulk",
        json={"application_ids": ids, "status": "archived"},
        headers=_auth(token_b),
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "APPLICATION_NOT_FOUND"


def test_bulk_empty_selection(client: TestClient) -> None:
    token = _register(client)
    r = client.post(
        "/v1/applications/bulk",
        json={"application_ids": [], "status": "archived"},
        headers=_auth(token),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "EMPTY_BULK"
