# AI_DESIGN.md

# Scout AI Design

## Overview
Scout's AI layer does four jobs: **enrich** raw saved data into structured knowledge, **match** a user's CV against opportunities, **generate** tailored application materials, and (v3) **assist** conversationally over the user's own data. This document covers prompting strategy, the enrichment pipeline, the matching algorithm, and the RAG architecture that underpins the assistant.

Models: OpenAI (primary generation/reasoning) and Gemini (secondary/fallback, and for long-context enrichment tasks where useful). Embeddings: `text-embedding-3-large` (or equivalent), stored in pgvector per `DATABASE_SCHEMA.md`.

## Prompting Strategy

### Principles
- **Structured output over free text.** Every enrichment and scoring call requests JSON matching a defined schema (via function calling / tool-use or `response_format: json_schema`), not prose to be parsed with regex.
- **Grounding over invention.** Prompts explicitly instruct the model to say "unknown" rather than fabricate (e.g. funding amount, founder background). Enrichment schemas make every field nullable for exactly this reason.
- **Versioned, testable prompts.** All prompts live in `packages/prompts`, versioned (`enrich_startup.v3.txt`), with a small regression set of example inputs/expected-shape outputs run in CI before a prompt change ships.
- **Few-shot where format matters, zero-shot where judgment matters.** Structured extraction (tech stack, funding) benefits from 1-2 examples in the prompt; matching explanations and resume tone are better zero-shot with clear instructions, since examples tend to bias content.
- **Separate extraction from judgment.** Don't ask one prompt to both extract facts and score fit — split into stages so each step is independently debuggable and cheaper to re-run in isolation.

### Prompt Template Structure
Each prompt template has:
```
SYSTEM: role + constraints + output schema description
CONTEXT: retrieved/scraped source material (bounded, truncated with a stated strategy)
TASK: the specific instruction for this call
OUTPUT: schema enforced via tool-use/json_schema, not just described in text
```

### Example — Startup Enrichment (conceptual)
```
SYSTEM:
You extract structured company information from provided source text.
Only use information present in the source text. If a field cannot be
determined, return null — do not guess or infer beyond what's stated.

CONTEXT:
<scraped careers page + website homepage text, truncated to N tokens>

TASK:
Extract: company_summary (2-3 sentences), tech_stack (list), stage
(one of: idea/pre-seed/seed/series_a/series_b_plus/unknown),
hiring_signal (hiring/not_hiring/unknown).

OUTPUT SCHEMA: (enforced via structured output)
{
  "company_summary": "string | null",
  "tech_stack": ["string"],
  "stage": "enum | null",
  "hiring_signal": "enum"
}
```

### Cost & Latency Controls
- Cache enrichment results keyed on a content hash of the scraped source; re-run only when source content changes (`refresh_embeddings`/re-enrich triggers check this hash first)
- Truncate/chunk long source pages before sending to the model; prefer extracting the relevant section (e.g. "About" + careers page) over sending an entire raw HTML dump
- Use the smaller/cheaper model tier for extraction-only tasks; reserve the stronger model tier for match explanation and generation, where reasoning quality matters more
- Track token usage per job type per user (per `ARCHITECTURE.md` observability) to catch runaway cost early

## Enrichment Pipeline

1. **Trigger** — startup/job saved, or manual re-enrich, or scheduled `sync_company`
2. **Fetch** — pull careers page, homepage, and (if available) a founder's public profile page; store raw text
3. **Chunk & clean** — strip boilerplate (nav, footer), truncate to a token budget, keep source URLs for traceability
4. **Extract (LLM call 1)** — structured extraction per the schema above → `company_summary`, `tech_stack`, `stage`, `hiring_signal`, founder background fields
5. **Persist** — write extracted fields to `startups`/`founders`/`jobs`, write raw source snapshot to R2 for auditability
6. **Embed** — generate embeddings for `company_summary` (and job descriptions separately) → write to `startup_embeddings`/`job_embeddings`
7. **Status update** — mark `enrichment_jobs` row `succeeded`/`failed`, notify frontend (poll or SSE)

Failure handling: partial success is allowed — if extraction succeeds but embedding generation fails, the job retries only the embedding step, not the full pipeline (idempotent per-step design, matching the background job table in `ARCHITECTURE.md`).

## Matching Algorithm

Two-stage retrieval + re-rank, chosen over pure embedding similarity or pure LLM scoring because embedding similarity alone misses nuanced fit (e.g. "3 years React" vs "3 years Vue" look similar in embedding space but differ for a role requiring React specifically), while LLM-scoring every job for every user doesn't scale on cost or latency.

### Stage 1 — Retrieval (embedding similarity)
- Compute cosine similarity between the user's `cv_embeddings` and all `job_embeddings` (and/or `startup_embeddings` for company-level fit)
- Use the pgvector query pattern from `DATABASE_SCHEMA.md` to pull the top-N candidates (N ≈ 30-50) cheaply, narrowing the field before any LLM call
- This stage is cheap, fast, and re-runnable on every CV update or new job save without cost concern

### Stage 2 — Re-rank (LLM scoring)
- For the top-N candidates, send the user's structured CV data + the job/company summary to the model with a scoring prompt
- Output schema:
  ```json
  {
    "score": 0-100,
    "matched_skills": ["string"],
    "gaps": ["string"],
    "summary": "one to two sentence explanation"
  }
  ```
- Score combines semantic fit with explicit requirement matching (years of experience, required skills present/absent) — the prompt instructs the model to weigh explicit requirement mismatches more heavily than loose thematic similarity, since a high embedding score can still be a poor requirements fit
- Results are cached in `match_scores` (per `DATABASE_SCHEMA.md`) and only recomputed when the CV changes, the job description changes, or the user forces a refresh

### Recompute Triggers
| Event | Action |
|---|---|
| CV uploaded/updated | Re-embed CV, re-run Stage 1 + 2 against all open jobs |
| New job saved | Re-embed job, run Stage 1 + 2 for that job against the user's CV |
| Job description edited | Re-embed job, invalidate cached score, recompute |
| User forces refresh | Re-run Stage 2 only (Stage 1 candidates rarely change without new data) |

### Explainability
Match explanations are stored, not regenerated on every view — the UI reads `match_scores.explanation` directly (see `UI_UX.md: Matches` screen). This keeps the "why this score" expand instant and avoids paying for an LLM call on every page view.

## Generation (Resumes, Cover Letters, Outreach)

- **Grounding source**: the user's base resume/CV structured data + the target job/company enrichment data + the match explanation (so generated content leans on already-identified matched skills rather than re-deriving fit from scratch)
- **Tone/emphasis controls**: user-selectable options (tone, skills to emphasize) are injected into the prompt as explicit constraints, not left implicit
- **No fabrication constraint**: prompts explicitly instruct the model not to invent experience, metrics, or claims not present in the base CV — generation reshapes and emphasizes existing true content, it doesn't add new claims
- **Editable output**: generated content is always returned as structured, editable fields (not a single opaque blob) so the Resume Studio diff view (per `UI_UX.md`) can show what changed from the base resume
- **Versioning**: every generation call produces an immutable `resume_versions` row; regenerating creates a new version rather than overwriting, preserving history

## RAG Architecture (AI Assistant, v3)

The assistant answers questions scoped to the user's own saved data — not general web knowledge — so retrieval is the core mechanism, not fine-tuning or a large system prompt dump of all user data.

### Retrieval Sources
1. **Structured data** — direct SQL queries for well-defined questions ("which startups did I save this month") rather than embedding search; the assistant's tool layer includes typed query functions, not just vector search, because structured questions are answered more reliably by SQL than by retrieval
2. **Semantic search** — pgvector similarity over `startup_embeddings`/`job_embeddings`/notes for fuzzy questions ("startups similar to the fintech ones I've saved")
3. **Conversation memory** — recent turns in the assistant session, kept short and summarized rather than replayed in full, to control context length

### Architecture Pattern
This is a tool-use (function-calling) agent pattern, not naive "stuff everything into context":
```
User query
   │
   ▼
Assistant orchestrator (LLM with tool definitions)
   │
   ├─→ tool: query_saved_startups(filters)      [SQL]
   ├─→ tool: semantic_search(query, entity_type) [pgvector]
   ├─→ tool: get_application_timeline(app_id)    [SQL]
   └─→ tool: get_match_explanation(job_id)       [SQL, cached]
   │
   ▼
Assistant synthesizes tool results into a grounded answer,
citing/linking specific startups, jobs, or applications
```

- The model decides which tool(s) to call based on the query, rather than a fixed retrieval step for every question — a date-range question needs SQL, a similarity question needs vector search, and some questions need both
- Tool results are returned as structured data to the model, which then composes the final natural-language answer with references the frontend can turn into links (per `UI_UX.md: AI Assistant`)
- Strict scoping: every tool call is executed with the authenticated user's ID injected server-side, never trusted from the prompt, so retrieval can never cross user boundaries

### Guardrails
- The assistant only answers from retrieved data; if a tool call returns nothing relevant, the prompt instructs it to say so rather than fall back to general knowledge that might be mistaken for an insight about the user's own data
- No write actions from the assistant in v3 scope (read-only tools only) — the assistant can suggest a status change or a follow-up message, but the user takes the action explicitly in the CRM/Resume Studio UI, keeping a human in the loop for anything that touches real applications

## Evaluation & Quality
- Regression prompt set per task type (enrichment, scoring, generation) run in CI on prompt changes, checking output schema validity and spot-checking a sample against expected extractions
- Human-in-the-loop feedback: thumbs up/down on match scores (per `UI_UX.md`) feeds a review queue for prompt tuning, not automatic retraining
- Cost/latency dashboards per job type (per `ARCHITECTURE.md` observability) to catch prompt regressions that blow up token usage
