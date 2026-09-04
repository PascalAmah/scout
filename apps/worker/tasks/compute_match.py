"""compute_match task — full two-stage matcher.

Runs Stage 1 retrieval (embedding similarity) then Stage 2 re-rank (LLM
explanation, heuristic fallback) for a user's workspace jobs (or one job),
writing ``match_scores`` rows with score + explanation + confidence-relevant
fields. Records an ``enrichment_jobs`` row so ``/jobs-status/{id}`` can poll.
"""

import json
import logging
import uuid
from datetime import UTC, datetime

from app.models import EnrichmentJob, Job, Startup, User
from app.services import matching_service
from celery import shared_task

logger = logging.getLogger(__name__)


def _session():
    from app.db.session import SessionLocal

    return SessionLocal()


def _coerce_explanation(
    result: dict, cv_ctx: dict, job: Job, startup: Startup, stage1_score: float
) -> tuple[float, dict]:
    """Normalize an LLM verdict into the final (score, explanation) pair.

    ``gaps`` is a required field per API_SPEC — a response with matches but no
    gaps is treated as a scoring-prompt bug, so missing gaps fall back to the
    deterministic heuristic's gap list.
    """
    heuristic = matching_service.heuristic_explanation(cv_ctx, job, startup, stage1_score)
    try:
        score = max(0.0, min(100.0, float(result.get("score", stage1_score))))
    except (TypeError, ValueError):
        score = stage1_score
    matched = [str(s) for s in result.get("matched_skills") or []][:6]
    gaps = [str(g) for g in result.get("gaps") or []][:4] or heuristic[1]["gaps"]
    summary = str(result.get("summary") or "Score produced by Scout's re-rank step.").strip()
    return round(score, 2), {"matched_skills": matched, "gaps": gaps, "summary": summary}


def llm_scorer(cv_ctx: dict, job: Job, startup: Startup, stage1_score: float) -> tuple[float, dict]:
    """LLM-first Stage 2 scorer with a deterministic fallback (no key / errors)."""
    from tasks.llm import RERANK_MODEL, structured_call
    from tasks.prompts import load_prompt

    payload = json.dumps(
        {
            "cv": cv_ctx,
            "job": {"title": job.title, "description": job.description},
            "company_summary": startup.summary if startup else None,
            "stage1_score": stage1_score,
        }
    )
    result = structured_call(load_prompt("match_score"), payload, RERANK_MODEL)
    if result is None:
        return matching_service.heuristic_explanation(cv_ctx, job, startup, stage1_score)
    return _coerce_explanation(result, cv_ctx, job, startup, stage1_score)


@shared_task(name="compute_match")
def compute_match(user_id: str | None = None, job_id: str | None = None) -> dict:
    db = _session()
    job_row: EnrichmentJob | None = None
    try:
        if user_id is None:
            raise ValueError("compute_match requires a user_id")

        user = db.get(User, uuid.UUID(user_id))
        if user is None:
            return {"status": "failed", "error": "user not found"}

        job_row = EnrichmentJob(
            user_id=user.id,
            entity_type="user",
            entity_id=user.id,
            job_type="compute_match",
            status="running",
            started_at=datetime.now(UTC),
        )
        db.add(job_row)
        db.commit()
        db.refresh(job_row)

        job_uuid = uuid.UUID(job_id) if job_id else None
        count = matching_service.recompute_user(db, user, job_uuid)
        reranked = matching_service.rerank_user(db, user, job_uuid, scorer=llm_scorer)

        job_row.status = "succeeded"
        job_row.finished_at = datetime.now(UTC)
        db.commit()
        return {"status": "succeeded", "computed_scores": count, "reranked": reranked}
    except Exception as exc:
        logger.exception("compute_match failed for user %s", user_id)
        db.rollback()
        if job_row is not None and job_row.id is not None:
            job_row = db.get(EnrichmentJob, job_row.id)
            if job_row is not None:
                job_row.status = "failed"
                job_row.error = str(exc)[:500]
                job_row.finished_at = datetime.now(UTC)
                db.commit()
        return {"status": "failed", "error": str(exc)[:500]}
    finally:
        db.close()