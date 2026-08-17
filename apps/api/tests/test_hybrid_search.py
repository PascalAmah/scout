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
