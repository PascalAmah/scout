"""Interest relevance: job titles vs onboarding target roles.

Covers the deterministic scorer (``job_relevance``) and its surfacing through
the startup detail and workspace list endpoints.
"""

from fastapi.testclient import TestClient

from app.services.job_relevance import score_relevance

# Roles exactly as the onboarding wizard stores them (RolesStep).
SWE_ROLES = ["Software Engineer", "Frontend", "Backend", "Full-stack"]


class TestScoreRelevance:
    def test_onboarding_roles_map_across_spellings(self) -> None:
        assert score_relevance("Full-stack Engineer", SWE_ROLES) == "high"
        assert score_relevance("Fullstack Engineer", SWE_ROLES) == "high"
        assert score_relevance("Frontend Developer", SWE_ROLES) == "high"
        assert score_relevance("Back-End Engineer", SWE_ROLES) == "high"
        assert score_relevance("Software Engineer - Intern", SWE_ROLES) == "high"

    def test_real_startup_board_tiers(self) -> None:
        # Titles observed on a real company's careers page for a SWE user.
        expected = {
            "Software Engineer - Intern": "high",
            "Staff AI Engineer": "medium",
            "Forward Deployed Engineer": "medium",
            "AI Deployments Lead": "none",
            "Agent Product Manager": "none",
            "AI Trainer (Part-time)": "none",
            "Founder's Office": "none",
            "Mortgage Originations Process Specialist": "none",
            "Senior Product Manager": "none",
            "Head of Sales": "none",
            "Enterprise Account Executive": "none",
        }
        for title, tier in expected.items():
            assert score_relevance(title, SWE_ROLES) == tier, title

    def test_founding_engineer_role_matches_founder_titles(self) -> None:
        assert score_relevance("Founding Engineer", ["Founding Engineer"]) == "high"
        assert score_relevance("Founding AI Engineer", ["Founding Engineer"]) == "high"
        # "Founder Intern" shares the family but is not an engineering role.
        assert score_relevance("Founder Intern (now and Summer 2026)", ["Founding Engineer"]) == (
            "medium"
        )

    def test_custom_roles_fall_back_to_token_overlap(self) -> None:
        assert score_relevance("Mobile Engineer (iOS)", ["Mobile Engineer"]) == "high"
        assert score_relevance("Mobile Engineer (iOS)", ["Refrigeration Tech"]) == "none"

    def test_ml_ai_role(self) -> None:
        assert score_relevance("AI Trainer (Part-time)", ["ML / AI"]) == "high"
        assert score_relevance("Machine Learning Engineer", ["ML / AI"]) == "high"
        assert score_relevance("Head of Sales", ["ML / AI"]) == "none"

    def test_empty_inputs(self) -> None:
        assert score_relevance("Software Engineer", []) == "none"
        assert score_relevance("", SWE_ROLES) == "none"


def _register(client: TestClient, email: str) -> str:
    r = client.post("/v1/auth/register", json={"email": email, "password": "supersecret123"})
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_startup_with_jobs(client: TestClient, token: str) -> str:
    r = client.post(
        "/v1/startups",
        json={"name": "Coreflow", "website": "https://coreflow.example.com"},
        headers=_auth(token),
    )
    assert r.status_code == 201, r.text
    startup_id = r.json()["id"]
    for title in [
        "Enterprise Account Executive",
        "Staff AI Engineer",
        "Software Engineer - Intern",
        "Head of Sales",
    ]:
        r = client.post(
            f"/v1/startups/{startup_id}/jobs",
            json={"title": title, "status": "open"},
            headers=_auth(token),
        )
        assert r.status_code == 201, r.text
    return startup_id


class TestRelevanceEndpoints:
    def test_detail_annotates_and_sorts_jobs(self, client: TestClient) -> None:
        token = _register(client, "relevance@example.com")
        r = client.post(
            "/v1/auth/onboarding/complete",
            json={"target_roles": SWE_ROLES, "remote": False, "locations": []},
            headers=_auth(token),
        )
        assert r.status_code == 200

        startup_id = _create_startup_with_jobs(client, token)
        r = client.get(f"/v1/startups/{startup_id}", headers=_auth(token))
        assert r.status_code == 200
        jobs = r.json()["jobs"]
        tiers = [job["relevance"] for job in jobs]
        assert set(tiers) <= {"high", "medium", "none"}
        # Relevant roles float to the top; ordering is tier-sorted.
        order = {"high": 0, "medium": 1, "none": 2}
        assert tiers == sorted(tiers, key=lambda tier: order[tier])
        assert jobs[0]["title"] == "Software Engineer - Intern"

        # Workspace list carries the matching count.
        r = client.get("/v1/startups", headers=_auth(token))
        assert r.status_code == 200
        item = r.json()["data"][0]
        assert item["open_roles_count"] == 4
        assert item["matching_roles_count"] == 2  # high + medium tiers

    def test_user_without_preferences_gets_null_relevance(self, client: TestClient) -> None:
        token = _register(client, "noprefs@example.com")
        startup_id = _create_startup_with_jobs(client, token)
        r = client.get(f"/v1/startups/{startup_id}", headers=_auth(token))
        assert r.status_code == 200
        assert all(job["relevance"] is None for job in r.json()["jobs"])
        r = client.get("/v1/startups", headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["data"][0]["matching_roles_count"] == 0
