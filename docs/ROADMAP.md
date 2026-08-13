# ROADMAP.md

# Scout Roadmap

Milestones are organized by outcome, not date, since AI product timelines shift. Each phase should ship independently usable value.

## MVP — "Save it, know it, track it"
Goal: prove the core loop (Discover → Save → Enrich → Track) end to end for a single user, single source. Everything beyond enrichment and tracking is deferred — if the enrichment isn't trustworthy and users don't come back to track, nothing else matters.

- **Extension**: save startup from YC company pages only; detect YC pages
- **Dashboard**: list of saved startups, basic filters (stage, tags)
- **Startup database**: core schema live (`startups`, `saved_startups`) — founders, jobs, and notes tables built but populated by enrichment only, not exposed in UI yet
- **AI enrichment**: company summary only — one LLM call per save, no multi-step pipeline. Output: 2-3 sentence summary, stage guess, and whether they appear to be hiring. No tech stack detection, no funding lookup, no founder scraping. Background job + polling.
- **Application tracker**: manual status updates across the CRM statuses (saved → interested → applied → interview → offer → rejected → archived), with status history timestamps
- **Auth**: email/password, JWT

Explicitly out of scope for MVP: multi-source scraping (Wellfound/Techstars/Product Hunt), matching/fit scoring, resume generation, cover letter generation, CV upload/parsing, founder profiles, job postings, analytics dashboard, AI Assistant, bulk actions, kanban board, follow-up reminders.

**Exit criteria**: a user can install the extension, land on a YC company page, save it in one click, see an AI-generated company summary appear in the dashboard within ~30s, and track the application through status stages — without leaving Scout.

### Why this scope cut

The original MVP scope described a 6+ month, 3-engineer build. Trimming to one source (YC), one envelope of enrichment (LLM summary only), and no generation/matching lets a single engineer ship an end-to-end working product in weeks, not quarters. The risk isn't scope — it's that enrichment quality and retention can't be validated until real users interact with real saved companies. Prove the save → enrich → track loop works reliably first. Layer on intelligence (matching, generation) once the foundation earns trust.

## v1.1 — Fill the gaps MVP skipped
- Second source: generic careers pages (extension detects and saves from any company website)
- Startup database full schema: expose founders, jobs, notes in the UI
- AI enrichment v2: add tech stack detection, hiring signal scoring, and founder bio summarization
- CV upload: single CV, parsed into `cv_profiles`
- Matching (v1): embedding similarity only (no LLM re-ranking yet) — good enough to sort saved jobs, not yet explain
- Resume generation: one tailored resume per application, plain-text/markdown output
- Cover letter + intro email generation
- Match score explanations (LLM re-ranks top-N embedding candidates and returns matched skills/gaps — the two-stage pipeline described in `AI_DESIGN.md`)
- Resume PDF rendering (via R2 + a rendering service/template)
- LinkedIn DM generation
- Analytics summary (applications, response rate, interviews, offers)
- Basic email notifications (enrichment complete, follow-up reminders)

## v2 — "More sources, less manual work"
Goal: reduce how often the user has to leave Scout to find opportunities, and start automating the parts of the loop that are still manual.

- Additional sources: Wellfound, Techstars, Product Hunt scraping/sync (`sync_company` scheduled jobs)
- Multiple CV/resume profiles (e.g. "backend" vs "product" positioning)
- Follow-up reminders and suggested follow-up copy based on time-since-applied
- CRM kanban board view (drag-and-drop status changes)
- Founder enrichment depth: prior companies, shared connections (if LinkedIn data is accessible), recent public activity
- Bulk actions (bulk tag, bulk archive)
- Extension: save directly from LinkedIn job posts and founder profiles
- Search: full-text + semantic hybrid search across saved startups

## v3 — "The AI operating system for the job search"
Goal: move from a tracker with AI features to an assistant that proactively surfaces opportunities and manages outreach cadence.

- AI Assistant: conversational interface over the user's full saved dataset ("which of my saved startups raised in the last 30 days?")
- Proactive discovery: daily/weekly digest of new matching opportunities from tracked sources, ranked and explained
- Outreach sequencing: multi-step outreach plans with suggested timing, not just single messages
- Team/collaboration mode (e.g. bootcamp cohorts, career coaches managing multiple candidates)
- Public company/founder knowledge graph (aggregated, de-identified insights across users) — privacy review required before scoping
- Microservice split per `ARCHITECTURE.md` (AI Service, Search Service, Notification Service, Analytics Service) if scale demands it
- Mobile-friendly web experience (native app is a "maybe," not committed)

## Cross-Cutting Workstreams (ongoing across all phases)
- **Reliability**: job retry/backoff policies, dead-letter queue for failed enrichment/generation jobs
- **Cost control**: token usage tracking per user/job, caching of embeddings and enrichment results to avoid recomputation
- **Prompt quality**: versioned prompts (`packages/prompts`), regression test set for enrichment/matching/generation quality
- **Privacy/security**: RBAC hardening, data retention policy enforcement, dependency/security scanning in CI

## Success Metrics by Phase
| Phase | Primary metric |
|---|---|
| MVP | Time from "save startup" to "enrichment complete" + 7-day retention |
| v1.1 | Time from "save startup" to "resume generated", match explanation usefulness |
| v2 | Weekly active users, opportunities saved from non-YC sources |
| v3 | Outreach response rate, assistant query volume |

These roll up to the PRD's north-star metrics: time saved per application, resume generation usage, match quality, outreach response rate, weekly active users.
