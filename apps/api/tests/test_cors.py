from fastapi.testclient import TestClient


def test_cors_header_present_for_allowed_origin(client: TestClient) -> None:
    r = client.get("/healthz", headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert r.headers["access-control-allow-credentials"] == "true"


def test_cors_preflight_allowed(client: TestClient) -> None:
    r = client.options(
        "/v1/auth/me",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "GET" in r.headers["access-control-allow-methods"]


def test_cors_blocked_for_unknown_origin(client: TestClient) -> None:
    r = client.get("/healthz", headers={"Origin": "https://evil.example.com"})
    assert r.status_code == 200
    assert "access-control-allow-origin" not in r.headers
