import json
from types import SimpleNamespace
from unittest import mock

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def fake_ai_key():
    """The tool tests mock the OpenAI client, so a fake key passes the
    configured-key guard without ever hitting the network."""
    from app.config import settings

    with mock.patch.object(settings, "ai_api_key", "test-key"):
        yield


def _register(client: TestClient, email: str = "assist@example.com") -> str:
    r = client.post(
        "/v1/auth/register", json={"email": email, "password": "supersecret123"}
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _fake_client_with_responses(*responses):
    """Build a fake OpenAI client whose chat.completions.create returns the given
    completion objects in sequence."""

    class _Completions:
        def __init__(self, responses):
            self._responses = list(responses)

        def create(self, **kwargs):
            return self._responses.pop(0)

    class _Chat:
        def __init__(self, responses):
            self.completions = _Completions(responses)

    class _Client:
        def __init__(self, responses):
            self.chat = _Chat(responses)

    return _Client(responses)


def _completion(content: str | None, tool_calls: list[dict] | None):
    message = SimpleNamespace(content=content, tool_calls=tool_calls)
    choice = SimpleNamespace(message=message)
    return SimpleNamespace(choices=[choice])


def _tool_call(name: str, args: dict, call_id: str = "call_1"):
    fn = SimpleNamespace(name=name, arguments=json.dumps(args))
    return SimpleNamespace(id=call_id, function=fn)


class TestAssistantTools:
    def test_query_saved_startups_tool(self, client: TestClient, fake_ai_key) -> None:
        token = _register(client)
        r = client.post(
            "/v1/startups",
            json={"name": "Lumina Health", "website": "https://lumina.example.com"},
            headers=_auth(token),
        )
        assert r.status_code == 201

        r = client.post(
            "/v1/startups",
            json={"name": "Bloom Studio", "website": "https://bloom.example.com"},
            headers=_auth(token),
        )
        assert r.status_code == 201

        # First turn: model asks to list saved startups. Second turn: final answer.
        first = _completion(None, [_tool_call("query_saved_startups", {})])
        second = _completion("You have 2 startups saved: Lumina Health and Bloom Studio.", None)
        with mock.patch("app.services.assistant_service._client", return_value=_fake_client_with_responses(first, second)):
            r = client.post(
                "/v1/assistant/chat",
                json={"message": "what did I save?"},
                headers=_auth(token),
            )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "Lumina Health" in body["answer"]
        assert len(body["tools"]) == 1
        assert body["tools"][0]["name"] == "query_saved_startups"
        assert "Lumina Health" in body["tools"][0]["result"]

    def test_tool_errors_surface_to_model(self, client: TestClient, fake_ai_key) -> None:
        token = _register(client)
        first = _completion(None, [_tool_call("get_match_explanation", {"job_id": "not-a-uuid"})])
        second = _completion("I couldn't find that job.", None)
        with mock.patch("app.services.assistant_service._client", return_value=_fake_client_with_responses(first, second)):
            r = client.post(
                "/v1/assistant/chat",
                json={"message": "explain my match"},
                headers=_auth(token),
            )
        assert r.status_code == 200
        body = r.json()
        assert len(body["tools"]) == 1
        assert body["tools"][0]["name"] == "get_match_explanation"
        assert "I couldn't find that job." in body["answer"]

    def test_unknown_tool(self, client: TestClient, fake_ai_key) -> None:
        token = _register(client)
        first = _completion(None, [_tool_call("delete_everything", {})])
        second = _completion("I can't do that — I'm read-only.", None)
        with mock.patch("app.services.assistant_service._client", return_value=_fake_client_with_responses(first, second)):
            r = client.post(
                "/v1/assistant/chat",
                json={"message": "delete my data"},
                headers=_auth(token),
            )
        assert r.status_code == 200
        body = r.json()
        assert body["tools"][0]["result"] == '{"error": "unknown tool \'delete_everything\'"}'
        assert "read-only" in body["answer"]

    def test_requires_api_key(self, client: TestClient) -> None:
        token = _register(client)
        with mock.patch.dict("os.environ", {}, clear=False):
            from app.config import settings

            with mock.patch.object(settings, "ai_api_key", ""):
                r = client.post(
                    "/v1/assistant/chat",
                    json={"message": "hi"},
                    headers=_auth(token),
                )
        assert r.status_code == 503
