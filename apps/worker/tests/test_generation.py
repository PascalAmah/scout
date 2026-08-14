import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "api"))


def test_prompt_loader_resolves_repo_root_prompts() -> None:
    from tasks.prompts import load_prompt

    for name in ("match_score.v1", "generate_resume.v1", "generate_outreach.v1", "enrich_startup.v1"):
        text = load_prompt(name)
        assert text.strip(), f"{name} prompt is empty"


def test_llm_scorer_falls_back_to_heuristic_without_key(monkeypatch) -> None:
    import json

    from tasks import compute_match

    # No OPENAI_API_KEY in the environment → structured_call returns None → heuristic.
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    job = type("Job", (), {"title": "Backend Engineer", "description": "Python FastAPI PostgreSQL"})
    startup = type("Startup", (), {"summary": "Builds robotics software.", "name": "Acme"})

    cv_ctx = {
        "raw_text": "Backend engineer with Python and PostgreSQL",
        "skills": ["Python", "PostgreSQL"],
        "roles": [],
        "years_of_experience": 5,
        "education": [],
    }
    score, explanation = compute_match.llm_scorer(cv_ctx, job, startup, 80.0)
    assert 0 <= score <= 100
    assert explanation["matched_skills"]
    # API_SPEC: gaps is required — a response with matches but no gaps is a bug.
    assert explanation["gaps"]
    assert explanation["summary"]
    json.dumps(explanation)  # serializable


def test_heuristic_resume_never_fabricates() -> None:
    from tasks.generate_resume import _heuristic_resume

    base = {
        "summary": "Backend engineer",
        "skills": ["Docker", "Python", "Go"],
        "experience": [{"company": "Acme", "title": "Engineer", "dates": "2020-", "bullets": ["Built APIs"]}],
        "education": [],
        "projects": [],
    }
    match = {"matched_skills": ["Go", "Python"], "gaps": ["Kubernetes"], "summary": "good fit"}
    out = _heuristic_resume(base, match)
    assert out["skills"][:2] == ["Go", "Python"]  # matched skills moved to front
    assert out["experience"] == base["experience"]  # content untouched, no invention


def test_heuristic_outreach_copy_has_no_placeholders() -> None:
    from tasks.generate_cover_letter import _heuristic_copy

    application = type("App", (), {"job": None})
    job = type("Job", (), {"title": "Backend Engineer"})
    startup = type("Startup", (), {"name": "Acme", "summary": "Builds robotics software for warehouses."})
    match = type("Match", (), {"explanation": {"matched_skills": ["Python"], "gaps": ["K8s"], "summary": "ok"}})
    text = _heuristic_copy(application, job, startup, match, "Ada Lovelace")
    assert "Acme" in text
    assert "Ada Lovelace" in text
    assert "Python" in text
    assert "[" not in text and "]" not in text
