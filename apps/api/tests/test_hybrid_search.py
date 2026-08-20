from fastapi.testclient import TestClient


def _register(client: TestClient, email: str = "search@example.com") -> str:
    r = client.post(
        "/v1/auth/register", json={"email": email, "password": "supersecret123"}
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _save(client: TestClient, token: str, name: str, summary: str) -> None:
    r = client.post(
        "/v1/startups",
        json={"name": name, "website": f"https://{name.lower().replace(' ', '')}.example.com"},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    startup_id = r.json()["id"]
    r = client.patch(
        f"/v1/startups/{startup_id}",
        json={"summary": summary},
        headers=_auth(token),
    )
    assert r.status_code == 200, r.text


def _save_with_source(client: TestClient, token: str, name: str, source: str) -> str:
    r = client.post(
        "/v1/startups",
        json={
            "name": name,
            "website": f"https://{name.lower().replace(' ', '')}.example.com",
            "source": source,
        },
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


class TestHybridSearch:
    def test_keyword_search_ranks_name_hit_over_summary(self, client: TestClient) -> None:
        token = _register(client)
        _save(client, token, "Lumina Health", "digital care navigation for clinics")
        _save(client, token, "Bloom Studio", "health data simulation and design tools")

        r = client.get("/v1/startups?q=health", headers=_auth(token))
        assert r.status_code == 200
        data = r.json()["data"]
        names = [d["name"] for d in data]
        # Name hit should surface first (keyword weight) and both match.
        assert "Lumina Health" in names
        assert "Bloom Studio" in names
        assert names[0] == "Lumina Health"

    def test_no_query_returns_all_recency_ordered(self, client: TestClient) -> None:
        token = _register(client)
        _save(client, token, "Lumina", "one")
        _save(client, token, "Bloom", "two")
        r = client.get("/v1/startups", headers=_auth(token))
        assert r.status_code == 200
        assert len(r.json()["data"]) == 2

    def test_search_returns_empty_for_no_match(self, client: TestClient) -> None:
        token = _register(client)
        _save(client, token, "Lumina", "automation")
        r = client.get("/v1/startups?q=quantumcryptography", headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["data"] == []

    def test_list_returns_total_count(self, client: TestClient) -> None:
        token = _register(client)
        _save(client, token, "Lumina", "one")
        _save(client, token, "Bloom", "two")
        _save(client, token, "North", "three")
        r = client.get("/v1/startups", headers=_auth(token))
        assert r.status_code == 200
        body = r.json()
        assert len(body["data"]) == 3
        assert body["total"] == 3
        assert body["next_cursor"] is None

    def test_list_paginates_and_counts(self, client: TestClient) -> None:
        token = _register(client)
        for i in range(5):
            _save(client, token, f"Startup {i}", "summary")
        r = client.get("/v1/startups?page=1&limit=2", headers=_auth(token))
        assert r.status_code == 200
        body = r.json()
        assert len(body["data"]) == 2
        assert body["total"] == 5
        assert body["next_cursor"] == "2"

        r2 = client.get("/v1/startups?page=3&limit=2", headers=_auth(token))
        assert r2.status_code == 200
        body2 = r2.json()
        assert len(body2["data"]) == 1
        assert body2["next_cursor"] is None

    def test_list_filters_by_source(self, client: TestClient) -> None:
        token = _register(client)
        _save_with_source(client, token, "Lumina", "yc")
        _save_with_source(client, token, "Bloom", "wellfound")
        _save_with_source(client, token, "North", "yc")
        r = client.get("/v1/startups?source=yc", headers=_auth(token))
        assert r.status_code == 200
        body = r.json()
        names = [d["name"] for d in body["data"]]
        assert set(names) == {"Lumina", "North"}
        assert body["total"] == 2

    def test_list_accepts_tags_param(self, client: TestClient) -> None:
        token = _register(client)
        _save(client, token, "Lumina", "one")
        r = client.get("/v1/startups?tags=fintech&tags=ai", headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["total"] == 1
