# Scout — Product Requirements Document (Enhanced)

## 1. Vision

Scout is an AI-native workspace for discovering startup opportunities, understanding companies deeply, generating tailored application materials, and tracking outreach — all in one place.

> **Discover → Save → Enrich → Match → Generate → Apply → Track → Follow up**

Scout's long-term positioning: not a job board, and not just a YC directory extension — it's the system of record and system of action for a candidate's entire startup job search.

---

## 2. Problem Statement

Startup hiring is fragmented across YC, Wellfound, Product Hunt, Techstars, Antler, company websites, LinkedIn, and founder profiles on X/Twitter.

Today, a candidate manually:
- Bookmarks or screenshots interesting companies across 6+ sources
- Re-researches the same company multiple times as it comes up again
- Manually rewrites their resume/cover letter per application
- Cold-emails founders with generic, low-context outreach
- Tracks applications in a spreadsheet that goes stale within a week

**Cost:** hours of repeated manual research and writing per application, inconsistent quality, and no compounding memory — every application starts from zero.

**Scout's bet:** if capturing a company takes one click, and everything after that (research, matching, writing, tracking) is AI-assisted, candidates can apply to 5–10x more roles with *higher* personalization per application, not lower.

---

## 3. Goals & Non-Goals

### Goals
- Make saving an opportunity from anywhere near-zero friction (1 click).
- Turn every saved startup into structured, queryable knowledge (not just a link).
- Match opportunities against a user's actual experience — not keyword overlap.
- Generate resumes, cover letters, and outreach that reference *specific* facts about the company.
- Give the user a single, accurate view of pipeline status and next actions.

### Non-Goals (v1)
- Scout is not a job board / does not aggregate all startup jobs proactively — discovery starts from what the user saves.
- Scout does not apply on the user's behalf (no auto-submit) — it prepares materials; the user submits.
- Scout does not manage the user's inbox generally — only outreach threads it generated.
- No team/recruiter-facing features in v1 (single-player product).

---

## 4. Primary Users & Personas

| Persona | Context | Primary need |
|---|---|---|
| **Software Engineer** (mid-level, exploring startups) | Actively job-hunting, 15–30 companies in consideration at once | Fast triage + tailored resumes without starting from scratch each time |
| **Designer** | Portfolio-driven, applies more selectively | Strong company research + narrative-driven cover letters |
| **Product Manager** | Evaluates company stage/traction heavily before applying | Enrichment on funding, market, and hiring signals |
| **AI Researcher** | Niche roles, cares about team/technical fit | Deep founder/team background, technical stack matching |
| **Student seeking internship** | High volume, low context per company, time-constrained | Speed: batch save → batch enrich → fast-generate materials |

**Common thread across personas:** the pain isn't finding companies (they already find them via YC/LinkedIn/Twitter) — it's what happens *after* they find one.

---

## 5. Product Principles

1. **The browser extension is an input tool, not the product.** The dashboard/workspace is where value compounds.
2. **AI should reduce manual work, not add review overhead.** Enrichment and generation should be trustworthy enough to lightly edit, not rewrite.
3. **Every saved startup becomes structured knowledge**, reusable across future applications and searches.
4. **Personalization beats keyword matching.** Fit scoring and generated content should read as "this person actually understands our company," not templated mail-merge.
5. **The user stays in control.** Nothing is sent/submitted without explicit user action.

---

## 6. Core Workflow (Detailed)

### 1. Discover
User finds a company organically (YC, Wellfound, LinkedIn, a founder's tweet, a friend's referral).

### 2. Save
One click via extension: saves company, job posting, or founder profile with source URL, timestamp, and raw page snapshot (for re-parsing if enrichment logic improves later).

### 3. Enrich
Background job triggers automatically after save:
- Pulls company website, careers page, founder LinkedIn/X (where accessible)
- Extracts funding stage, most recent round, investors (via public sources)
- Summarizes product, tech stack signals, and hiring signals
- Flags stale/missing data for manual fill-in

### 4. Analyze
User (or Scout, proactively) reviews the enriched profile: stage fit, culture signals, remote/in-person, comp signals if available.

### 5. Match
Scout computes a semantic fit score between the user's CV/portfolio embeddings and the job/company embeddings, with a natural-language explanation ("Strong match: your 3 years of React + design systems work overlaps directly with their stated frontend needs").

### 6. Generate
User requests one or more of: tailored resume, cover letter, intro email, LinkedIn DM — each grounded in specific facts pulled from the enriched company profile, not generic filler.

### 7. Apply
User reviews/edits generated materials and applies externally (Scout does not auto-submit in v1). User marks status as "Applied."

### 8. Track
CRM view shows all opportunities by stage, with reminders for stale applications.

### 9. Follow up
Scout suggests follow-up timing (e.g., 7 days post-apply, 3 days post-interview) and can draft the follow-up message on request.

---

## 7. Modules

### 7.1 Browser Extension
- Save startup (company page)
- Save job posting
- Save founder profile
- Auto-detect careers pages while browsing
- One-click "Save to Scout" with auto-source tagging
- Duplicate detection (warns if company/job already saved)

### 7.2 Startup Workspace
Structured record per company:
- Company name, one-line description, logo
- Stage (Pre-seed / Seed / Series A+ / Public)
- Funding history (round, amount, date, lead investor — where public)
- Founders (name, background, LinkedIn/X)
- Website, careers page URL
- Hiring status (actively hiring / unclear / not hiring)
- Notes (freeform, user-authored)
- Tags (user-defined, e.g. "dream company," "backup," "fintech")
- Application status (linked to CRM)
- Source of original save + save date

### 7.3 AI Enrichment
Automated enrichment pipeline, triggered on save and re-runnable manually:
- Founder profile summarization (background, prior companies, expertise)
- Careers page parsing (open roles, team size signals)
- Tech stack detection (from job postings + public signals, e.g. BuiltWith-style heuristics)
- Recent funding lookup (public sources — Crunchbase-style where licensable, press releases)
- Company summary (product, market, differentiation)
- Hiring signal scoring (urgency, growth stage, role volume)

*Enrichment confidence levels are surfaced to the user (High/Medium/Low/Manual) rather than presented as uniformly authoritative.*

### 7.4 Opportunity Matching
- One-time CV + portfolio upload (PDF/DOCX/links), parsed into structured experience + skills
- Embeddings generated for user profile and for each saved job/company
- Semantic fit score (0–100) per opportunity, with a short natural-language rationale
- Score recalculates automatically as CV is updated or new roles are saved

### 7.5 Resume Studio
Generation surface, all grounded in the specific company profile + user's CV:
- Tailored resume (reordered/reworded bullet emphasis, not fabricated experience)
- Cover letter (references specific company facts: recent funding, product focus, founder background)
- Intro email (short, for cold outreach to a founder/hiring lead)
- LinkedIn DM (shorter still, platform-appropriate tone)

*Guardrail: generation never invents experience, titles, or metrics not present in the user's source CV.*

### 7.6 CRM
Pipeline statuses:
- Saved → Interested → Applied → Interview → Offer → Rejected → Archived

Each transition timestamped for analytics. Manual status override always available. Optional per-status notes/next-action field.

### 7.7 Analytics
- Applications sent (weekly/monthly trend)
- Response rate (Applied → Interview conversion)
- Interview → Offer conversion
- Follow-ups sent vs. due
- Time-to-first-response by company stage (useful pattern: does seed vs Series A respond faster?)

---

## 8. Data Model (High-Level)

Core entities and relationships:

- **User** 1—* **Company**
- **Company** 1—* **JobPosting**
- **Company** 1—* **Founder**
- **Company** 1—1 **EnrichmentRecord** (versioned, re-run history kept)
- **User** 1—1 **CVProfile** (parsed structured experience, versioned)
- **JobPosting** 1—1 **MatchScore** (per user, recalculated on CV/job change)
- **JobPosting** 1—* **GeneratedMaterial** (resume / cover letter / email / DM, versioned, editable)
- **JobPosting** 1—1 **ApplicationStatus** (status + timestamped history)
- **JobPosting** 1—* **FollowUp** (scheduled, sent, snoozed)

Design implication: everything hangs off **JobPosting** (or **Company** for founder-only saves), so the CRM, matching, and generation modules all read from the same enrichment source of truth — avoids drift between "what Scout knows" and "what's shown to the user."

---

## 9. AI System Design

| Task | Approach |
|---|---|
| Company/founder summarization | LLM (OpenAI/Gemini) over scraped page content, structured-output prompting |
| Fit scoring | Embedding similarity (sentence-transformers or OpenAI embeddings) + LLM-generated rationale layered on top of the raw score |
| Resume/cover letter generation | LLM with strict grounding prompt: only source facts from CVProfile + EnrichmentRecord, explicit instruction against fabrication |
| Tech stack detection | Heuristic/regex pass over job posting text + lightweight classifier, LLM fallback for ambiguous cases |
| Hiring signal scoring | Rule-based scoring (recency of postings, role count, "urgently hiring" language) rather than LLM — cheaper and more auditable |

**Reliability notes worth deciding early:**
- Cache enrichment results; don't re-scrape/re-call LLMs on every dashboard view.
- Version generated materials so edits don't destroy the original AI draft.
- Rate-limit and gracefully degrade enrichment if a source blocks scraping — fall back to manual fields rather than silent failure.

---

## 10. Non-Functional Requirements

- **Latency:** save-to-enrichment should complete within ~30–60s for a typical company (async, user not blocked).
- **Data freshness:** enrichment records should support manual re-run; auto-refresh on a schedule (e.g. weekly) for actively-tracked companies only, to control cost.
- **Privacy:** CV/portfolio data is sensitive — encrypt at rest, never used to train external models, clear deletion path.
- **Auditability:** generated materials should be traceable to the source facts used, so users can verify before sending.
- **Cost control:** LLM calls are the main variable cost — enrichment and generation should be cached/versioned, not re-run on every page load.

---

## 11. MVP Scope

- Browser extension (save company / job / founder)
- Dashboard (workspace + CRM views)
- Startup database (structured records)
- AI enrichment (company summary, founder summary, funding lookup — tech stack detection can follow post-MVP)
- Matching (CV upload + fit score, rationale)
- Resume Studio (resume + cover letter first; intro email/DM can follow)
- Application tracker (status pipeline, no analytics dashboard yet)

**Explicitly deferred post-MVP:** analytics module, scheduled auto-refresh of enrichment, LinkedIn DM generation, multi-source auto-discovery (YC/Wellfound crawlers).

---

## 12. Suggested Roadmap

| Phase | Focus | Key deliverable |
|---|---|---|
| **Phase 0** | Foundations | Auth, data model, extension skeleton, basic save flow |
| **Phase 1** | Core loop | Enrichment pipeline + Startup Workspace + CRM statuses |
| **Phase 2** | Personalization | CV upload, matching/fit scoring |
| **Phase 3** | Generation | Resume Studio (resume + cover letter), grounding guardrails |
| **Phase 4** | Retention loop | Follow-up suggestions, outreach templates (email/DM) |
| **Phase 5** | Insight layer | Analytics dashboard, response-rate tracking |
| **Phase 6** | Expansion | Auto-discovery from YC/Wellfound/Techstars, scheduled refresh |

---

## 13. Risks & Open Questions

- **Scraping reliability/legality:** careers pages and founder profiles vary widely in structure and some sources (LinkedIn) actively restrict scraping — need a clear, compliant data-sourcing strategy per source before building enrichment for it.
- **Hallucination risk in generation:** grounding prompts reduce but don't eliminate fabrication risk — needs an explicit user review step before any material is considered "final."
- **Cost scaling:** LLM + embedding costs scale with saves; needs usage-based limits or caching strategy before broad rollout.
- **Data staleness:** funding/hiring status changes; without a refresh strategy, the "knowledge base" pitch weakens over time.
- **Matching trust:** a wrong or overconfident fit score could actively mislead users into over/under-investing in an application — rationale text and confidence framing matter as much as the score.

---

## 14. Success Metrics

- **Time saved per application** (self-reported or measured: time from save → applied)
- **Resume/cover letter generation usage rate** (% of saved jobs that reach "Generated")
- **Match quality** (correlation between high fit scores and Interview/Offer outcomes, over time)
- **Outreach response rate** (replies per intro email/DM sent)
- **Weekly active users** and **saves-per-active-user** (engagement depth, not just breadth)

---

## 15. Recommended Tech Stack

### Frontend
- React (Vite), TypeScript, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui

### Extension
- Plasmo (Manifest V3)

### Backend
**Python + FastAPI**, chosen for:
- Mature AI/ML ecosystem (LangChain, LlamaIndex, sentence-transformers)
- First-class async support for background enrichment jobs
- Automatic OpenAPI docs
- Strong performance for an I/O-heavy, AI-call-heavy workload

Suggested architecture:
- FastAPI + Pydantic
- SQLAlchemy 2.0 + Alembic (migrations)
- PostgreSQL + pgvector (structured data + embeddings in one store)
- Redis (caching, job queue backing)
- Celery or Dramatiq (background enrichment/generation jobs)
- JWT/Authlib (auth)
- APScheduler (scheduled refresh jobs)

### Storage
- PostgreSQL (primary), Redis (cache/queue), Cloudflare R2 (page snapshots, uploaded CVs/portfolios)

### AI
- OpenAI and/or Gemini (summarization, generation)
- pgvector + sentence-transformers or provider embeddings (matching)

---

## 16. Future Sources

- Y Combinator, Wellfound, Techstars, Antler, HF0, Product Hunt, direct company websites — as auto-discovery crawlers, gated behind Phase 6 and a validated data-sourcing/compliance strategy per source.

---

## 17. Long-Term Vision

Scout becomes the AI operating system for startup opportunity discovery and application management — not just a YC browser extension, but the durable, compounding knowledge base and execution layer for anyone navigating the startup job market over months or years, not a single job search.

---

## 18. Competitive Landscape

Scout operates at the intersection of job tracking, AI-assisted writing, and company research. No single product covers the full workflow today, but several overlap on specific stages.

### Direct Competitors (full or near-full workflow overlap)

| Product | What they do | Scout vs. them |
|---|---|---|
| **Teal** | Job tracker + resume builder + Chrome extension. Bookmark jobs, get AI resume tailoring, track applications in a kanban. | Teal is a job search CRM first, AI writer second. It targets any job type (corporate, startup, freelance) and doesn't build a company knowledge base — it bookmarks jobs, not companies. Scout's bet is that startup candidates need deep company understanding (funding, founders, stage) before tailoring materials, and that enrichment compounds across applications. |
| **Huntr** | Job tracker + AI resume/cover letter generator + extension. Kanban pipeline, skill gap analysis, contact management. | Similar feature set to Teal but more design-polished. Again, job-tracker-first — it doesn't pull or persist company intelligence beyond what's on the job listing. Scout differentiates on enrichment depth and startup-specific signals. |
| **Simplify.jobs** | Auto-fill job applications + job discovery + resume builder. Browser extension that detects application forms and fills them. | Optimizes the "apply" step — save seconds per form. Scout explicitly does not auto-apply (v1). Simplify's extension is an automation tool; Scout's extension is a capture tool. Different philosophies, different user needs. |
| **EarnBetter** | AI resume + cover letter generator, free. Upload resume, get tailored versions. | Pure generation play — no tracking, no enrichment, no pipeline. Scout's generation is downstream of research + matching, not the entry point. Risk: users may satisfy generation needs with a free tool and not see Scout's additional value. |

### Indirect Competitors (overlapping on one axis)

| Product | Overlap | Scout's angle |
|---|---|---|
| **Notion / Airtable** (job search templates) | Many candidates build their own tracker in Notion or Airtable. Low switching cost. | Scout automates the enrichment these tools require manual entry for. The pitch: "stop building your own tracker, start having one that fills itself." |
| **LinkedIn Job Alerts / YC Work at a Startup** | Native discovery surfaces. | Scout isn't a discovery engine (v1) — it's the layer *after* discovery. Integration, not competition, in early phases. |
| **Grammarly / ChatGPT** | Writing assistance for resumes and outreach. | General-purpose tools that candidates already use. Scout's advantage is context injection (company facts, matched skills) that general tools lack. But the bar is "better than ChatGPT with a good prompt" — a moving target. |
| **Crunchbase / PitchBook** | Company funding/stage data. | Overlap on enrichment inputs. Scout doesn't aim to replace Crunchbase as a research tool — it aims to pull just enough signal for application decisions without requiring the user to do the lookup themselves. |

### Where Scout is defensible

1. **The knowledge base compounds.** A user who has 50 saved and enriched companies in Scout has a searchable, queryable asset that a general-purpose job tracker can't replicate. Switching cost grows with use.
2. **Startup-specific signal** (stage, funding recency, founder background, hiring velocity) is not captured by generalist job trackers. It's valuable enough to be the reason users *start* in Scout rather than a generic tool.
3. **The extension as a capture surface.** If saving from YC/LinkedIn/Wellfound becomes a one-click habit, the workspace becomes sticky — and no competitor currently does "one click → enriched company profile" end to end.

### Where Scout is vulnerable

1. **Generalist tools add enrichment.** If Teal or Huntr adds company research summaries to their bookmarking flow, Scout's core differentiator shrinks.
2. **ChatGPT's context window.** As models improve, a candidate can paste a job description + their resume into ChatGPT and get a tailored cover letter in seconds. Scout's generation needs to be noticeably better than that zero-effort baseline — not just "as good but with tracking."
3. **Discovery-first products.** If a YC/Wellfound aggregator with tracking features emerges, Scout's "bring-your-own-companies" model (v1) looks incomplete compared to "here are 500 companies, we'll enrich them for you."
4. **Free tier economics.** EarnBetter is free. ChatGPT is free. Scout burns LLM costs on enrichment + generation. The product must demonstrate enough incremental value that users pay — or costs must be low enough that a generous free tier is sustainable.

### Competitive Strategy

- **Don't compete on discovery in v1.** Scout is for candidates who already find companies they like — the value is what happens next. Competing with LinkedIn's or YC's native discovery is a losing game at this stage.
- **Compete on depth, not breadth.** A saved company in Scout that shows "seed stage, $4.2M raised, 2 YC founders with deep learning backgrounds, hiring 3 backend roles" is more valuable than a bookmark in Teal. Enrichment quality is the moat.
- **Compete on compounding.** The 10th saved company is more valuable than the 1st, because the knowledge base starts revealing patterns. Generalist trackers don't compound.

---

## 19. Monetization & Pricing

Scout's primary variable cost is LLM API calls (enrichment, matching, generation). A pricing model must cover these costs at scale while remaining accessible to cash-constrained job seekers.

### Guiding Principles

1. **Free tier must demonstrate the core value.** Users should experience save → enrich → track at zero cost before hitting a paywall. If the free tier isn't self-serve enough to prove value, conversion won't happen.
2. **Price to the action, not the storage.** Storing saved startups is cheap; enriching and generating is expensive. Pricing should gate LLM-intensive actions, not the library itself.
3. **Revenue scales with usage, not with outcome.** Charging a percentage of salary (like a recruiter) creates misaligned incentives. A subscription or credit model keeps incentives clean: Scout's job is to be useful, not to get the user hired at any cost.
4. **Launch with pricing, not "we'll figure it out later."** Without revenue from day one, every user is a liability, not an asset. Even if early pricing is low, having the machinery in place prevents a painful retrofit.

### Proposed Pricing Tiers

#### Free Tier
- Save up to 25 startups
- 10 AI enrichments (company summaries) per month
- Basic application tracking (manual status updates)
- No matching, no resume/cover letter generation

#### Pro Tier — $15/month (or $120/year)
- Unlimited saved startups
- Unlimited enrichments (with fair-use cap, e.g. 200/month)
- CV upload + matching (fit scores + explanations)
- Resume & cover letter generation (up to 30 generations/month)
- Outreach generation (intro email, LinkedIn DM — up to 20/month)
- Analytics dashboard

#### Team / Coach Tier — $30/month per seat (future, post-v2)
- All Pro features
- Multi-user workspaces (bootcamp cohorts, career coaches)
- Shared company libraries per team
- Coach dashboard (overview of candidate pipelines)

### Credit-Based Alternative
Instead of hard caps on generation, a credit model could work: 30 credits/month on Pro, where 1 resume gen = 3 credits, 1 cover letter = 2 credits, 1 outreach = 1 credit. This gives users flexibility (e.g. more resumes, fewer cover letters) while keeping costs predictable. Evaluate based on early usage patterns.

### Cost Model (per user, per month, estimated)

| Activity | Unit cost (LLM) | Monthly volume (Pro) | Monthly cost |
|---|---|---|---|
| Enrichment (company summary) | ~$0.02 | 100 | $2.00 |
| Match scoring (Stage 2 re-rank) | ~$0.03 | 50 | $1.50 |
| Resume generation | ~$0.05 | 10 | $0.50 |
| Cover letter generation | ~$0.04 | 10 | $0.40 |
| Outreach generation | ~$0.03 | 10 | $0.30 |
| Embedding generation + storage | ~$0.01/embedding | 200 | $2.00 |
| **Total variable cost** | | | **~$6.70** |

At $15/month Pro with ~$6.70 variable cost, gross margin is ~55% before infra/hosting. That's healthy for a SaaS product with AI costs baked in. Infra (Postgres, Redis, R2, compute) adds ~$2-3/user/month at modest scale, pushing full cost to ~$9-10 and margin to ~33-40% — tight but viable, and improving with volume discounts on LLM usage.

### Key Risk
Job seekers stop paying when they get hired. Churn is inherently high — nobody subscribes to a job search tool indefinitely. This means:
- **LTV is capped.** If the average job search is 3 months and churn is 100% at hire, LTV is ~$45 (3 months × $15). CAC must stay well below that.
- **Annual pricing is critical.** $120/year locks in commitment; monthly allows churn.
- **Reactivation matters.** Many engineers job-hop every 1-2 years. If Scout is genuinely useful, reactivation rates will determine long-term viability. A "pause subscription, keep your data" option (e.g. $3/month while not job searching) could preserve the knowledge base between searches.
- **Student/intern pricing** lowers the barrier for high-volume users with low willingness to pay but high viral potential.
