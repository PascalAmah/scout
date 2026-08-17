from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_login_me(client: TestClient) -> None:
    r = client.post(
        "/v1/auth/register",
        json={"email": "jane@example.com", "password": "supersecret123"},
    )
    assert r.status_code == 201
    data = r.json()
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "jane@example.com"

    access = data["access_token"]
    r = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200
    assert r.json()["email"] == "jane@example.com"


def test_register_duplicate_email(client: TestClient) -> None:
    body = {"email": "dup@example.com", "password": "supersecret123"}
    assert client.post("/v1/auth/register", json=body).status_code == 201
    r = client.post("/v1/auth/register", json=body)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "EMAIL_TAKEN"


def test_login_wrong_password(client: TestClient) -> None:
    client.post(
        "/v1/auth/register",
        json={"email": "a@example.com", "password": "supersecret123"},
    )
    r = client.post(
        "/v1/auth/login",
        json={"email": "a@example.com", "password": "wrongpass"},
    )
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_refresh_and_logout(client: TestClient) -> None:
    r = client.post(
        "/v1/auth/register",
        json={"email": "b@example.com", "password": "supersecret123"},
    )
    refresh_token = r.json()["refresh_token"]

    r = client.post("/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200

    assert client.post("/v1/auth/logout", json={"refresh_token": refresh_token}).status_code == 204

    r = client.post("/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 401


def test_reset_request_does_not_leak_accounts(client: TestClient) -> None:
    client.post(
        "/v1/auth/register",
        json={"email": "c@example.com", "password": "supersecret123"},
    )
    assert client.post(
        "/v1/auth/password/reset-request", json={"email": "c@example.com"}
    ).status_code == 204
    assert client.post(
        "/v1/auth/password/reset-request", json={"email": "nobody@example.com"}
    ).status_code == 204


def test_reset_with_invalid_token(client: TestClient) -> None:
    r = client.post(
        "/v1/auth/password/reset",
        json={"token": "garbage", "password": "newpassword123"},
    )
    assert r.status_code == 400


def test_complete_onboarding_saves_preferences_and_stamps_completion(
    client: TestClient,
) -> None:
    r = client.post(
        "/v1/auth/register",
        json={"email": "ob@example.com", "password": "supersecret123"},
    )
    assert r.status_code == 201
    access = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {access}"}

    # Fresh account: onboarding not done yet.
    me = client.get("/v1/auth/me", headers=headers).json()
    assert me["onboarding_completed_at"] is None
    assert me["preferences"] is None

    r = client.post(
        "/v1/auth/onboarding/complete",
        json={
            "target_roles": ["Software Engineer", "Backend"],
            "remote": True,
            "locations": ["San Francisco"],
        },
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["onboarding_completed_at"] is not None
    assert data["preferences"] == {
        "target_roles": ["Software Engineer", "Backend"],
        "remote": True,
        "locations": ["San Francisco"],
    }

    # Idempotent: completing again refreshes, never errors.
    r = client.post("/v1/auth/onboarding/complete", json={}, headers=headers)
    assert r.status_code == 200
    assert r.json()["preferences"] == {
        "target_roles": [],
        "remote": False,
        "locations": [],
    }
