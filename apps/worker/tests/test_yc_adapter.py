import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))

from adapters.yc import parse_founders, parse_jobs  # noqa: E402

FOUNDERS_HTML = """<html><body>
<div class="my-4 text-2xl font-bold text-[#333333] md:mt-0">Active Founders</div>
<div class="flex flex-col gap-2 border-b border-gray-100 last:border-b-0">
  <div class="hidden gap-4 md:flex">
    <div class="text-xl font-bold">Naman Bansal</div>
    <a href="https://x.com/namanbansal0611" aria-label="Twitter account" rel="nofollow"></a>
    <a href="https://linkedin.com/in/namban" aria-label="LinkedIn profile" rel="nofollow"></a>
    <div class="text-gray-600">Founder</div>
    <div class="prose max-w-full whitespace-pre-line">Co-founder, CEO @ manicule.dev.</div>
  </div>
  <div class="group space-y-3 md:hidden">
    <div class="text-lg font-bold">Naman Bansal</div>
    <a href="https://x.com/namanbansal0611" aria-label="Twitter account" rel="nofollow"></a>
  </div>
</div>
<div class="flex flex-col gap-2 border-b border-gray-100 last:border-b-0">
  <div class="hidden gap-4 md:flex">
    <div class="text-xl font-bold">Shreyans Jain</div>
    <a href="https://x.com/shreyansj" aria-label="Twitter account" rel="nofollow"></a>
    <div class="text-gray-600">Founder</div>
  </div>
</div>
<div class="my-4 text-2xl font-bold text-[#333333] md:mt-0">Company Launches</div>
</body></html>"""


class TestParseFounders:
    def test_parses_names_titles_bios_and_socials(self) -> None:
        founders = parse_founders(FOUNDERS_HTML)
        assert [f["name"] for f in founders] == ["Naman Bansal", "Shreyans Jain"]

        naman = founders[0]
        assert naman["title"] == "Founder"
        assert naman["bio"] == "Co-founder, CEO @ manicule.dev."
        assert naman["twitter_url"] == "https://x.com/namanbansal0611"
        assert naman["linkedin_url"] == "https://linkedin.com/in/namban"

        shreyans = founders[1]
        assert shreyans["twitter_url"] == "https://x.com/shreyansj"
        assert shreyans["linkedin_url"] is None

    def test_desktop_and_mobile_blocks_are_not_duplicated(self) -> None:
        founders = parse_founders(FOUNDERS_HTML)
        names = [f["name"] for f in founders]
        assert len(names) == len(set(names))
        assert names.count("Naman Bansal") == 1

    def test_missing_section_returns_empty(self) -> None:
        assert parse_founders("<html><body>no founders here</body></html>") == []


JOBS_HTML = """<html><body>
&lt;script id="__NEXT_DATA__" type="application/json"&gt;{"props":{}}
&quot;jobPostings&quot;:[{&quot;id&quot;:1,&quot;title&quot;:&quot;Backend Engineer&quot;,&quot;url&quot;:&quot;/companies/lumina/jobs/xyz-backend-engineer&quot;,&quot;location&quot;:&quot;Remote&quot;,&quot;type&quot;:&quot;Full-time&quot;,&quot;salaryRange&quot;:&quot;$80K - $150K&quot;,&quot;equityRange&quot;:&quot;0.10% - 0.50%&quot;,&quot;minExperience&quot;:&quot;2+ years&quot;,&quot;visa&quot;:&quot;Will sponsor&quot;,&quot;skills&quot;:[]}]
&lt;/script&gt;
</body></html>"""


class TestParseJobs:
    def test_parses_job_details_and_resolves_relative_url(self) -> None:
        jobs = parse_jobs(JOBS_HTML)
        assert len(jobs) == 1
        job = jobs[0]
        assert job["title"] == "Backend Engineer"
        assert job["url"] == "https://www.ycombinator.com/companies/lumina/jobs/xyz-backend-engineer"
        assert job["location"] == "Remote"
        assert job["employment_type"] == "Full-time"
        assert job["salary_min"] == 80000.0
        assert job["salary_max"] == 150000.0
        assert "Will sponsor" in (job["description"] or "")

    def test_missing_job_postings_returns_empty(self) -> None:
        assert parse_jobs("<html><body>no jobs</body></html>") == []

    def test_empty_job_postings_returns_empty(self) -> None:
        assert parse_jobs('<html>&quot;jobPostings&quot;:[]</html>') == []
