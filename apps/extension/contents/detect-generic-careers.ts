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

function guessCompanyName(): string | null {
  const ogSite = metaContent('og:site_name')
  if (ogSite && ogSite.length <= 60) return ogSite.split('|')[0].trim()
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
  const path = location.pathname.toLowerCase()
  const singleJob = /\/job(s|bing)?\/[^/]+$/.test(path) || /\/(positions?|roles?|openings?)\/[^/]+$/.test(path)
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
  const website = metaContent('og:url') ?? location.origin

  const cards = collectJobCards()
  if (cards.length > 1 || (isListingPage() && cards.length > 0)) {
    // Group cards by company so a multi-company board (Indeed, Wellfound
    // search) yields one group per startup; single-company listings collapse
    // to one group under the page company.
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

  // Single job posting detail page.
  const jobTitle = guessJobTitle()
  const loc = locationFromCard(document.body) ?? null
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