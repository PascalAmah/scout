import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Founder, Startup


def _register(client: TestClient, email: str = "ext@example.com") -> str:
    r = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "supersecret123"},
    )
    assert r.status_code == 201
    return r.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class TestDetectLinkedIn:
    def test_detect_founder_profile(self, client: TestClient) -> None:
        r = client.post(
            "/v1/extension/detect",
            json={"url": "https://www.linkedin.com/in/ada-lovelace"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["supported"] is True
        assert body["source"] == "linkedin"
        assert body["entity_type"] == "founder"

    def test_detect_job_post(self, client: TestClient) -> None:
        r = client.post(
            "/v1/extension/detect",
            json={"url": "https://www.linkedin.com/jobs/view/123456"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["supported"] is True
        assert body["source"] == "linkedin"
        assert body["entity_type"] == "job"

    def test_detect_linkedin_skips_enrichment_tier(self, client: TestClient) -> None:
        r = client.post(
            "/v1/extension/detect",
            json={"url": "https://www.linkedin.com/company/lumina"},
        )
        assert r.status_code == 200
        assert r.json()["compliance_tier"] == "restricted"


class TestExtensionQuickSave:
    def test_quick_save_persists_multiple_founders_with_socials(
        self, client: TestClient, db_session: Session
    ) -> None:
        token = _register(client)
        r = client.post(
            "/v1/extension/quick-save",
            headers=_auth(token),
            json={
                "source": "yc",
                "source_url": "https://www.ycombinator.com/companies/manicule",
                "startup": {"name": "Manicule", "website": "https://manicule.dev"},
                "founders": [
                    {
                        "name": "Naman Bansal",
                        "title": "Founder",
                        "twitter_url": "https://x.com/namanbansal0611",
                        "linkedin_url": "https://linkedin.com/in/namban",
                    },
                    {
                        "name": "Shreyans Jain",
                        "title": "Founder",
                        "twitter_url": "https://x.com/shreyansj",
                    },
                ],
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert len(body["founder_ids"]) == 2

        startup = db_session.get(Startup, uuid.UUID(body["startup_id"]))
        assert startup is not None
        founders = list(
            db_session.query(Founder)
            .where(Founder.startup_id == startup.id)
            .order_by(Founder.created_at)
            .all()
        )
        assert [f.name for f in founders] == ["Naman Bansal", "Shreyans Jain"]
        naman, shreyans = founders
        assert naman.twitter_url == "https://x.com/namanbansal0611"
        assert naman.linkedin_url == "https://linkedin.com/in/namban"
        assert naman.title == "Founder"
        assert shreyans.twitter_url == "https://x.com/shreyansj"
        assert shreyans.linkedin_url is None

    def test_quick_save_legacy_single_founder_still_works(
        self, client: TestClient, db_session: Session
    ) -> None:
        token = _register(client, email="ext2@example.com")
        r = client.post(
            "/v1/extension/quick-save",
            headers=_auth(token),
            json={
                "source": "manual",
                "source_url": "manual-entry",
                "startup": {"name": "Lumina"},
                "founder": {"name": "Ada", "title": "CEO"},
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert len(body["founder_ids"]) == 1

        startup = db_session.get(Startup, uuid.UUID(body["startup_id"]))
        founders = list(
            db_session.query(Founder)
            .where(Founder.startup_id == startup.id)
            .order_by(Founder.created_at)
            .all()
        )
        assert [f.name for f in founders] == ["Ada"]
        assert founders[0].title == "CEO"

    def test_quick_save_linkedin_founder_profile_no_enrichment(
        self, client: TestClient, db_session: Session
    ) -> None:
        token = _register(client, email="ext3@example.com")
        r = client.post(
            "/v1/extension/quick-save",
            headers=_auth(token),
            json={
                "source": "linkedin",
                "source_url": "https://www.linkedin.com/in/ada-lovelace",
                "startup": {"name": "Analytical Engines"},
                "founders": [
                    {
                        "name": "Ada Lovelace",
                        "title": "Founder at Analytical Engines",
                        "linkedin_url": "https://www.linkedin.com/in/ada-lovelace",
                    }
                ],
            },
        )
        assert r.status_code == 200
        body = r.json()
        # LinkedIn is restricted-tier: the save succeeds but no enrichment job
        # is queued (no server-side crawler for restricted sources).
        assert body["enrichment_status"] == "none"
        assert len(body["founder_ids"]) == 1

        startup = db_session.get(Startup, uuid.UUID(body["startup_id"]))
        assert startup.source == "linkedin"
        founders = list(
            db_session.query(Founder)
            .where(Founder.startup_id == startup.id)
            .order_by(Founder.created_at)
            .all()
        )
        assert [f.name for f in founders] == ["Ada Lovelace"]
        assert founders[0].linkedin_url == "https://www.linkedin.com/in/ada-lovelace"

    def test_quick_save_multiple_jobs_for_one_startup(self, client: TestClient, db_session: Session) -> None:
        token = _register(client, email="ext4@example.com")
        r = client.post(
            "/v1/extension/quick-save",
            headers=_auth(token),
            json={
                "source": "generic_careers",
                "source_url": "https://acme.example.com/jobs",
                "startup": {"name": "Acme", "website": "https://acme.example.com"},
                "jobs": [
                    {"title": "Frontend Engineer", "url": "https://acme.example.com/jobs/frontend"},
                    {"title": "Backend Engineer", "url": "https://acme.example.com/jobs/backend"},
                    {"title": "DevOps Engineer", "url": "https://acme.example.com/jobs/devops"},
                ],
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert len(body["job_ids"]) == 3
        assert body["job_id"] == body["job_ids"][0]

        startup = db_session.get(Startup, uuid.UUID(body["startup_id"]))
        from app.models import Job  # noqa: PLC0415

        job_rows = (
            db_session.query(Job).where(Job.startup_id == startup.id).order_by(Job.created_at).all()
        )
        assert [j.title for j in job_rows] == ["Frontend Engineer", "Backend Engineer", "DevOps Engineer"]

    def test_quick_save_dedupes_jobs_by_url_and_title(self, client: TestClient, db_session: Session) -> None:
        token = _register(client, email="ext5@example.com")
        body = {
            "source": "generic_careers",
            "source_url": "https://acme.example.com/jobs",
            "startup": {"name": "Acme", "website": "https://acme.example.com"},
            "jobs": [
                {"title": "Frontend Engineer", "url": "https://acme.example.com/jobs/frontend"},
                {"title": "Frontend Engineer", "url": "https://acme.example.com/jobs/frontend"},
                {"title": "Frontend Engineer", "url": None},
            ],
        }
        r = client.post("/v1/extension/quick-save", headers=_auth(token), json=body)
        assert r.status_code == 200
        # All three resolve to the same existing job (URL dedupe for the first
        # two, title dedupe for the third) — one row total in the DB.
        assert len(set(r.json()["job_ids"])) == 1

        from app.models import Job  # noqa: PLC0415

        startup = db_session.get(Startup, uuid.UUID(r.json()["startup_id"]))
        rows = db_session.query(Job).where(Job.startup_id == startup.id).all()
        assert len(rows) == 1
        assert rows[0].title == "Frontend Engineer"

    def test_quick_save_jobs_plus_legacy_job_field(self, client: TestClient, db_session: Session) -> None:
        token = _register(client, email="ext6@example.com")
        r = client.post(
            "/v1/extension/quick-save",
            headers=_auth(token),
            json={
                "source": "manual",
                "source_url": "manual-entry",
                "startup": {"name": "Lumina"},
                "job": {"title": "Founding Engineer"},
                "jobs": [{"title": "Product Designer"}],
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert len(body["job_ids"]) == 2

        from app.models import Job  # noqa: PLC0415

        startup = db_session.get(Startup, uuid.UUID(body["startup_id"]))
        titles = [j.title for j in db_session.query(Job).where(Job.startup_id == startup.id).all()]
        assert set(titles) == {"Founding Engineer", "Product Designer"}
