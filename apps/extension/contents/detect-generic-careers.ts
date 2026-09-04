import type { QuickSaveJob, QuickSaveStartup } from '@scout/types'
import type { DetectedPayload } from '../background/state'
import { isRemoteLocation, locationFromCard, remoteFromLocation } from './job-meta'

export const config = {
  matches: [
    '*://*/*career*',
    '*://*/*jobs/*',
    '*://*.greenhouse.io/*',
    '*://*.lever.co/*',
    '*://*.ashbyhq.com/*',
  ],
}

function metaContent(name: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`)?.content
}

// Hosts covered by a dedicated, higher-fidelity detector. The generic careers
// matcher (e.g. `*://*/*jobs/*`) also fires on those pages, so it must step
// aside and let the specific detector own the detection.
const DEDICATED_HOSTS = new Set([
  'ycombinator.com',
  'www.ycombinator.com',
  'linkedin.com',
  'www.linkedin.com',
  'workatastartup.com',
  'www.workatastartup.com',
])

/** A role card on a listing page: title, link, plus best-effort location/company. */
interface JobCard {
  title: string
  url: string
  location?: string
  company?: string
}

/** Look like a link to an individual job posting, not a nav/filter link. */
function jobLikeHref(href: string): boolean {
  const h = href.toLowerCase()
  return (
    /\/job(s|bing)?\/|(\/|[-_])(positions?|openings?|roles?|careers?)(\/|[-_])/.test(h) ||
    /\/(positions?|openings?|roles?)(\/|$)/.test(h)
  )
}

function cleanTitle(raw: string | null | undefined): string | null {
  const t = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (t.length < 2 || t.length > 120) return null
  // Skip nav-ish labels ("All jobs", "Open positions", "Careers", "View role").
  if (/^(all|open|current|view|apply|learn more|see all|careers|jobs?)\b/i.test(t) && t.length < 28) return null
  return t
}

/** Small text inside a job card that reads like a location ("London", "Remote"). */
function guessLocation(card: HTMLElement): string | undefined {
  return locationFromCard(card) ?? undefined
}

/** Company name on a job board card (multi-company boards like Indeed/Wellfound). */
function guessCardCompany(card: HTMLElement): string | undefined {
  const attr =
    card.querySelector<HTMLElement>('[data-company], [data-employer], [data-org]')?.getAttribute('data-company') ??
    card.querySelector<HTMLElement>('[data-company], [data-employer], [data-org]')?.getAttribute('data-employer') ??
    card.querySelector<HTMLElement>('[data-company], [data-employer], [data-org]')?.getAttribute('data-org')
  if (attr && attr.trim()) return attr.trim().slice(0, 80)
  const labelled = card.querySelector<HTMLElement>('[aria-label]')?.getAttribute('aria-label')
  if (labelled && labelled.length <= 80 && !/\b(job|role|position|apply|view)\b/i.test(labelled)) return labelled
  for (const el of Array.from(card.querySelectorAll<HTMLElement>('.company, .company-name, .employer, .org, .posting-company, [class*="company"]'))) {
    const t = (el.textContent ?? '').trim()
    if (t && t.length <= 80 && !/\b(job|role|position|careers?|hiring)\b/i.test(t)) return t
  }
  return undefined
}

/** Every role card the page exposes, deduped by URL. */
function collectJobCards(): JobCard[] {
  const cards: JobCard[] = []
  const seen = new Set<string>()
  for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
    const href = a.href
    if (!jobLikeHref(href) || seen.has(href)) continue

    // Skip links inside footer, nav, or sidebar navigation — these are
    // category/tag links ("Software Engineer Jobs in San Francisco"), not
    // individual job postings.
    if (a.closest('footer, [role="contentinfo"], nav, [role="navigation"], aside, [role="complementary"]')) continue

    // ATS detail pages render on-page anchors to the current posting
    // ("#key-responsibilities") and the application form's file labels
    // ("Attach", "Google Drive"). Those resolve back to the page itself and
    // are section/heading text, not distinct roles — drop them.
    if (a.closest('form')) continue
    if (href.replace(/[?#].*$/, '') === location.href.replace(/[?#].*$/, '')) continue

    // For Greenhouse board pages, only keep links that point to an actual
    // job posting (path ends with a numeric ID). Category pages like
    // "/remotecom/jobs" or "/remotecom/jobs/in/san-francisco" lack a
    // numeric segment and are navigation, not jobs.
    if (/\.greenhouse\.io/.test(href) && !/\/\d+(?:[?#]|$)/.test(new URL(href).pathname)) continue

    const title = cleanTitle(a.textContent)
    if (!title) continue
    seen.add(href)
    // Use the nearest common ancestor of the link as the "card" for context.
    const card = (a.closest('li, article, tr, [class*="job"], [class*="posting"], [class*="card"]') ??
      a) as HTMLElement
    cards.push({
      title,
      url: href,
      location: guessLocation(card),
      company: guessCardCompany(card),
    })
  }
  return cards
}

/**
 * ATS boards whose job-detail URLs carry the company as the first path segment:
 *   jobs.ashbyhq.com/<company>/<job-id>
 *   boards.greenhouse.io/<company>/jobs/<id>
 *   jobs.lever.co/<company>/<id>
 * On these detail pages og:title / h1 hold the JOB TITLE (e.g. "Software
 * Engineer"), so reading them for the company yields the role, not the org.
 * Trust the URL slug instead — it is the reliable company name.
 */
const COMPANY_SLUG_HOSTS = new Set(['jobs.ashbyhq.com', 'boards.greenhouse.io', 'jobs.lever.co'])

function guessCompanyFromPath(): string | null {
  if (!COMPANY_SLUG_HOSTS.has(location.hostname.toLowerCase())) return null
  const first = location.pathname.split('/').filter(Boolean)[0]
  if (!first) return null
  if (/(career|job|position|role|open)/i.test(first)) return null
  return first.replace(/[-_]+/g, ' ').trim() || null
}

function guessCompanyName(): string | null {
  const fromPath = guessCompanyFromPath()
  if (fromPath) return fromPath
  const ogSite = metaContent('og:site_name')
  if (ogSite && ogSite.length <= 60) return ogSite.split('|')[0].trim()
  // On Greenhouse/Lever board pages, og:title is typically "<Company> | Jobs"
  // and the h1 is the company name.  Use these before falling back to the
  // hostname slug ("remotecom" → "Remotecom") which is rarely the real name.
  const ogTitle = metaContent('og:title')
  if (ogTitle) {
    const cleaned = ogTitle.split(/[|\-–—·]/)[0]?.trim()
    if (cleaned && cleaned.length <= 60 && !/(career|job|role|hiring|apply|work at)/i.test(cleaned)) return cleaned
  }
  const h1 = document.querySelector('h1')?.textContent?.trim()
  if (h1 && h1.length <= 60 && !/(career|job|role|hiring|apply|work at|all open)/i.test(h1)) return h1
  const title = document.title
  const cleaned = title.split(/[|\-–—·]/)[0]?.trim()
  if (cleaned && cleaned.length <= 60 && !/(career|job|role|hiring)/i.test(cleaned)) return cleaned
  const host = location.hostname.replace(/^(www|careers|jobs|boards)\./i, '')
  return host.split('.')[0].replace(/[-_]+/g, ' ') || null
}

function guessJobTitle(): string | null {
  const ogTitle = metaContent('og:title')
  if (ogTitle) {
    const cleaned = ogTitle.split(/[|\-–—·]/)[0]?.trim()
    if (cleaned && cleaned.length <= 80 && !/(career|job|role|hiring|work at)/i.test(cleaned)) return cleaned
  }
  const h1 = document.querySelector('h1')?.textContent?.trim()
  return h1 && h1.length <= 80 ? h1 : null
}

/** True when the page is a job board listing, not a single posting detail page. */
function isListingPage(): boolean {
  // Strip trailing slashes so trailing-slash paths (/jobs/123/) aren't misread
  // as listings (location.pathname never includes query/hash).
  const path = location.pathname.toLowerCase().replace(/\/+$/, '')
  // ATS boards embed the company + an opaque job id: /<company>/<job-id>
  // (jobs.ashbyhq.com/coreflow/<uuid>, jobs.lever.co/<company>/<id>). The tail
  // is non-numeric, so match /company/<short> directly rather than only digits.
  const slugDetail =
    COMPANY_SLUG_HOSTS.has(location.hostname.toLowerCase()) &&
    /^\/[^/]+\/[^/]+$/.test(path)
  const singleJob =
    slugDetail ||
    // /jobs/<id>, /<company>/jobs/<id> — the ATS (Greenhouse/Lever/Ashby) detail
    // signature. A trailing numeric id is the reliable tell regardless of the
    // word before it, so match a numeric last segment directly too.
    /\/job(s|bing)?\/[^/]+$/.test(path) ||
    /\/\d+$/.test(path) ||
    /\/(positions?|roles?|openings?)\/[^/]+$/.test(path)
  if (singleJob) return false
  return /\/jobs?\/|\/(careers?|positions?|roles?|openings?)\/?$/i.test(path) || document.querySelectorAll('a[href]').length > 12
}

function toQuickSaveJob(card: JobCard): QuickSaveJob {
  const location = card.location
  return {
    title: card.title,
    url: card.url,
    location,
    remote: remoteFromLocation(location),
  }
}

function detect(): DetectedPayload | null {
  // Dedicated detectors (YC, LinkedIn) own their pages — never guess here.
  if (DEDICATED_HOSTS.has(location.hostname.toLowerCase())) return null
  const company = guessCompanyName()
  if (!company) return null
  // Use just the origin (scheme + host) so saves from different pages of the
  // same board (listing vs. job detail) produce a matching website value.
  const website = location.origin

  const cards = collectJobCards()

  // A job DETAIL page (single posting — Greenhouse/Lever/Ashby and other
  // boards use paths like /jobs/<id> or /<company>/jobs/<id>) must yield exactly
  // that one job. Never treat it as a listing: on-page anchors to /jobs/<id>#
  // sections and form labels ("Key Responsibilities", "Cover Letter", "Attach")
  // are not roles. `isListingPage()` returns false for these paths, so it's the
  // authoritative gate — not `cards.length`, which the page's internal anchor
  // links inflate.
  if (!isListingPage()) {
    // The card whose URL is the page itself (handles boards where the posting
    // link is rendered as an anchor), matched by path sans any fragment/query.
    const selfHref = location.href.replace(/[?#].*$/, '')
    const selfCard = cards.find((c) => c.url.replace(/[?#].*$/, '') === selfHref)
    const jobTitle = guessJobTitle() ?? selfCard?.title ?? null
    // Location sits near the title — scan the title's container, not the whole
    // body, so unrelated text like a "Country" select isn't picked up.
    const h1 = document.querySelector('h1')
    const scope = h1?.closest('div')?.parentElement as HTMLElement | null
    const loc =
      selfCard?.location ??
      (scope ? locationFromCard(scope) : null) ??
      null
    return {
      source: 'generic_careers',
      source_url: location.href,
      startup: { name: company, website },
      job: jobTitle
        ? {
            title: jobTitle,
            url: location.href,
            location: loc,
            remote: isRemoteLocation(loc),
          }
        : null,
    }
  }

  // Listing page — group cards by company so a multi-company board (Indeed,
  // Wellfound search) yields one group per startup; single-company listings
  // collapse to one group under the page company.
  if (cards.length > 0) {
    const groups = new Map<string, JobCard[]>()
    for (const card of cards) {
      const key = card.company?.trim() || company
      const list = groups.get(key) ?? []
      list.push(card)
      groups.set(key, list)
    }
    const ordered: { startup: QuickSaveStartup; jobs: QuickSaveJob[] }[] = []
    for (const [name, groupCards] of groups) {
      ordered.push({
        startup: { name, website },
        jobs: groupCards.map(toQuickSaveJob),
      })
    }
    // Single-company listing: keep the flat shape too (startup + jobs[]).
    if (ordered.length === 1) {
      const single = ordered[0]
      return {
        source: 'generic_careers',
        source_url: location.href,
        startup: single.startup,
        jobs: single.jobs,
      }
    }
    return {
      source: 'generic_careers',
      source_url: location.href,
      startup: { name: company, website },
      groups: ordered,
    }
  }

  return null
}

if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('scout_detected_generic')) {
  const payload = detect()
  if (payload) {
    sessionStorage.setItem('scout_detected_generic', '1')
    void chrome.runtime.sendMessage({ type: 'scout:detected', payload }).catch(() => {})
  }
}

// The background asks the active tab to re-detect on popup open and expects
// the fresh payload back, so the popup never shows stale detection from
// another tab or an earlier navigation.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ((message as { type?: string } | null)?.type === 'scout:re-detect') {
    sendResponse({ payload: detect() })
  }
})