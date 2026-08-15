import sys
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))

from adapters.producthunt import NotConfiguredError, ProductHuntAdapter  # noqa: E402
from adapters.techstars import TechstarsAdapter  # noqa: E402
from tasks.sync_company import sync_company  # noqa: E402
from tasks.sync_gate import SyncBlockedError, assert_sync_allowed, block_reason  # noqa: E402


class TestSyncGate:
    def test_allows_direct_api_and_permitted_crawl(self) -> None:
        assert_sync_allowed("yc", "direct_api")
        assert_sync_allowed("techstars", "permitted_crawl")

    def test_blocks_restricted_and_user_capture(self) -> None:
        for tier in ("restricted", "user_capture"):
            try:
                assert_sync_allowed("x", tier)
                raise AssertionError(f"expected SyncBlockedError for tier {tier}")
            except SyncBlockedError:
                pass

    def test_blocks_inactive_source(self) -> None:
        try:
            assert_sync_allowed("yc", "direct_api", status="paused")
            raise AssertionError("expected SyncBlockedError for paused source")
        except SyncBlockedError:
            pass

    def test_block_reason_roundtrip(self) -> None:
        allowed = SimpleNamespace(compliance_tier="direct_api", source_status="active")
        assert block_reason("yc", allowed) == ""
        denied = SimpleNamespace(compliance_tier="user_capture", source_status="active")
        assert "user_capture" in block_reason("wellfound", denied)
        assert "no source_registry entry" in block_reason("mystery", None)


class TestRobotsGate:
    def test_disallowed_path_is_blocked(self) -> None:
        import tasks.robots as robots

        with mock.patch.object(
            robots, "_fetch_robots_txt", return_value="User-agent: *\nDisallow: /private/"
        ), mock.patch.object(robots, "_CACHE", {}):
            assert robots.robots_allows("https://example.com/private/x") is False
            assert robots.robots_allows("https://example.com/public") is True

    def test_missing_robots_txt_allows(self) -> None:
        import tasks.robots as robots

        with mock.patch.object(robots, "_fetch_robots_txt", return_value=""), mock.patch.object(
            robots, "_CACHE", {}
        ):
            assert robots.robots_allows("https://example.org/page") is True


class TestTechstarsAdapter:
    def test_discover_parses_sitemap(self) -> None:
        sitemap = (
            '<?xml version="1.0"?><urlset>'
            "<url><loc>https://www.techstars.com/companies/acme</loc></url>"
            "<url><loc>https://www.techstars.com/companies/globex</loc></url>"
            "</urlset>"
        )
        with mock.patch("adapters.techstars.fetch_html", return_value=sitemap) as fetch:
            items = TechstarsAdapter().discover()
        assert fetch.call_args.args[0] == "https://www.techstars.com/sitemap.xml"
        assert items == [
            {"url": "https://www.techstars.com/companies/acme"},
            {"url": "https://www.techstars.com/companies/globex"},
        ]

    def test_fetch_cleans_html(self) -> None:
        html = "<html><head><title>Acme</title></head><body><h1>Acme</h1><p>Hello</p></body></html>"
        with mock.patch("adapters.techstars.fetch_html", return_value=html):
            content = TechstarsAdapter().fetch("https://www.techstars.com/companies/acme")
        assert content.source == "techstars"
        assert content.title == "Acme"
        assert "Hello" in content.raw_text


class TestProductHuntAdapter:
    def test_fetch_requires_token(self) -> None:
        with mock.patch.dict("os.environ", {}, clear=False), mock.patch.dict(
            "os.environ", {"PRODUCTHUNT_API_TOKEN": ""}
        ):
            try:
                ProductHuntAdapter().fetch("https://www.producthunt.com/posts/acme")
                raise AssertionError("expected NotConfiguredError")
            except NotConfiguredError:
                pass

    def test_fetch_parses_graphql(self) -> None:
        body = {
            "data": {
                "post": {
                    "name": "Acme",
                    "tagline": "The best thing",
                    "description": "Long description",
                    "website": "https://acme.example.com",
                    "url": "https://www.producthunt.com/posts/acme",
                }
            }
        }
        with mock.patch.dict("os.environ", {"PRODUCTHUNT_API_TOKEN": "tok"}), mock.patch(
            "adapters.producthunt.httpx.post"
        ) as post:
            post.return_value = SimpleNamespace(
                status_code=200, raise_for_status=lambda: None, json=lambda: body
            )
            content = ProductHuntAdapter().fetch("https://www.producthunt.com/posts/acme")
        assert content.title == "Acme"
        assert "The best thing" in content.raw_text

    def test_discover_parses_edges(self) -> None:
        body = {
            "data": {
                "posts": {
                    "edges": [
                        {"node": {"name": "Acme", "slug": "acme", "url": "https://www.producthunt.com/posts/acme"}},
                        {"node": {"name": "Globex", "slug": "globex", "url": None}},
                        {"node": {}},
                    ]
                }
            }
        }
        with mock.patch.dict("os.environ", {"PRODUCTHUNT_API_TOKEN": "tok"}), mock.patch(
            "adapters.producthunt.httpx.post"
        ) as post:
            post.return_value = SimpleNamespace(
                status_code=200, raise_for_status=lambda: None, json=lambda: body
            )
            items = ProductHuntAdapter().discover()
        assert items[0] == {"url": "https://www.producthunt.com/posts/acme", "name": "Acme"}
        assert items[1]["url"] == "https://www.producthunt.com/posts/globex"  # built from slug
        assert len(items) == 2


class TestSyncCompanyTask:
    def test_blocks_non_eligible_source(self) -> None:
        db = mock.MagicMock()
        with mock.patch("tasks.sync_company._session", return_value=db), mock.patch(
            "tasks.sync_gate.load_source_config",
            return_value=SimpleNamespace(compliance_tier="user_capture", source_status="active"),
        ):
            result = sync_company.run(source="wellfound", discovery=True)
        assert result["status"] == "blocked"
        assert "user_capture" in result["reason"]

    def test_blocks_unknown_source(self) -> None:
        db = mock.MagicMock()
        with mock.patch("tasks.sync_company._session", return_value=db), mock.patch(
            "tasks.sync_gate.load_source_config", return_value=None
        ):
            result = sync_company.run(source="mystery", discovery=True)
        assert result["status"] == "blocked"
        assert "no source_registry entry" in result["reason"]

    def test_single_company_enqueues(self) -> None:
        db = mock.MagicMock()
        db.scalar.return_value = None  # no existing startup
        adapter = mock.MagicMock()
        adapter.compliance_tier = "direct_api"
        adapter.fetch.return_value = SimpleNamespace(raw_text="company text", title="Acme")
        with mock.patch("tasks.sync_company._session", return_value=db), mock.patch(
            "tasks.sync_gate.load_source_config",
            return_value=SimpleNamespace(compliance_tier="direct_api", source_status="active"),
        ), mock.patch("adapters.get_adapter", return_value=adapter), mock.patch(
            "app.services.job_queue.enqueue_enrich_startup"
        ) as enqueue:
            result = sync_company.run(source="techstars", url="https://www.techstars.com/companies/acme")

        assert result["status"] == "enqueued"
        enqueue.assert_called_once()
        db.add.assert_called()
        db.commit.assert_called()
