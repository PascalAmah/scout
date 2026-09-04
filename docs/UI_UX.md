# UI_UX.md

# Scout UI/UX

## Design Principles
1. The extension is a capture tool, not a place to think — it should never require more than a couple clicks.
2. The web app is where synthesis happens — dashboard, workspace, generation, tracking.
3. AI output is always editable, never a black box — show the reasoning behind a match score or a generated line, and let the user override it.
4. Status should always be visible — enrichment/generation are async; the UI must show "in progress" states, not silent gaps.

## Information Architecture

```text
Web App
├── Dashboard (home)
├── Startups (workspace)
│   └── Startup Detail
│       ├── Overview
│       ├── Founders
│       ├── Jobs
│       └── Notes
├── Matches (ranked opportunities)
├── Resume Studio
│   ├── Base Resume
│   └── Generated Versions
├── CRM (pipeline)
│   └── Application Detail
├── Analytics
├── AI Assistant
└── Settings
    ├── Profile / CV
    ├── Account
    └── Integrations (extension pairing)
```

## Core Screens

### Dashboard
Purpose: orientation — "what needs my attention today."
- Top matches this week (score + one-line why)
- Recently enriched startups (with status if still processing)
- Applications needing follow-up (time-since-applied threshold)
- Quick stats strip: saved / applied / interviews / offers this month

### Startup Workspace (list)
Purpose: browse and filter the personal knowledge base.
- Filters: stage, tags, hiring status, source, has-open-jobs
- Search: hybrid (keyword + semantic) — "series A fintech hiring backend" should work
- Card view shows: logo, name, stage, hiring status badge, match score if computed, saved-status tag
- Empty state actively teaches extension install + first save, not just "no startups yet"

### Startup Detail
Purpose: the full picture of one company, source-of-truth notes.
- Header: name, website, stage, funding, hiring status badge
- Tabs: Overview (AI summary, tech stack, enrichment freshness timestamp), Founders, Jobs, Notes
- Enrichment status indicator if a refresh is running ("Enriching… usually takes ~2 min") — non-blocking, rest of page usable
- "Re-enrich" action visible but not primary (avoid encouraging redundant AI calls)
- Persistent "Generate resume for this" and "Save as application" actions

### Matches
Purpose: the ranked list the user actually acts on.
- Sorted by score by default, filterable by stage/location/remote
- Each row: score, matched skills (chips), 1-2 sentence explanation, gap callout if relevant
- Score is never presented as unquestionable — a "why this score?" expand shows the reasoning, and a thumbs up/down feeds future prompt tuning
- Bulk action: "Generate resumes for selected"

### Resume Studio
Purpose: generate and manage tailored materials without losing the base resume.
- Left: base resume (source of truth, user-editable)
- Right: generated versions list, each tagged to the application it was made for
- Generation flow: pick job/application → tone/emphasis options → generate (async, shows progress) → review/edit → approve
- Diff view between base resume and generated version, so edits are legible, not just "trust the AI"
- Download as PDF, copy as text

### CRM / Pipeline
Purpose: track applications like a lightweight kanban, not a spreadsheet replacement.
- Columns: Saved → Interested → Applied → Interview → Offer / Rejected → Archived
- Drag-and-drop between columns (v2; MVP can be a status dropdown per card)
- Card shows: company, role, applied date, resume version used, last outreach sent
- Application detail: full timeline (saved → applied → interview scheduled → ...), attached outreach messages, notes

### Analytics
Purpose: answer "is this working."
- Funnel chart: saved → applied → interview → offer, with conversion % between stages
- Response rate over time
- Filters by date range and by source

### AI Assistant
Purpose: conversational access to the user's own data, not general chat.
- Chat interface scoped to the user's saved startups/applications/CV
- Suggested prompts on empty state ("Which saved startups raised funding recently?", "Draft a follow-up for my Lumina application")
- Responses that reference specific startups/jobs link directly to their detail pages

## Browser Extension UX

### Principles
- Extension = capture only. No dashboards, no editing, no generation inside the popup.
- Detect first, ask second: if the page is a recognized source, the extension should pre-fill everything it can before the user clicks anything.

### States
1. **Unsupported page** — subtle icon state, no popup action beyond "manual save" fallback
2. **Detected page** (YC company page, job post, LinkedIn founder profile, generic careers page) — badge lights up, popup shows a pre-filled card: entity type, name, key fields, "Save" button
3. **Saving** — inline spinner in popup, non-blocking (user can close popup, save continues)
4. **Saved** — confirmation with a link to open the entity in the web app; option to add a quick note or tag before dismissing

### Save Flow (example: job posting)
1. User lands on a supported careers page
2. Extension badge indicates detection
3. User clicks extension icon → popup shows scraped title, company, location, pre-selected "Save Job"
4. User optionally adds tags/notes inline
5. Click "Save" → `POST /extension/quick-save` → popup shows "Saved to Scout" with a link
6. Enrichment kicks off automatically in the background; no extra step required from the user

### Error Handling
- Auth expired → popup prompts re-login (deep link to web app login, token syncs back)
- Scrape failed / ambiguous page → popup falls back to a manual entry form pre-filled with whatever partial data was captured (URL, page title at minimum)

## Visual & Interaction Notes
- Status badges (hiring status, application status, enrichment status) use consistent color coding across web app and extension so users pattern-match instantly
- Async AI actions always show a state: queued → running → done/failed — never a silent gap where the user doesn't know if something is happening
- Generated content (resumes, outreach) is visually distinguished from user-authored content (e.g. subtle "AI-generated" tag) until the user edits it, at which point it becomes "user-edited"

## Accessibility
- All AI-generated status indicators are conveyed by more than color alone (icon + text label)
- Keyboard navigable CRM board (arrow keys to move between cards, explicit action to change status rather than drag-only)
- Extension popup meets standard contrast and focus-visible requirements despite its small footprint
