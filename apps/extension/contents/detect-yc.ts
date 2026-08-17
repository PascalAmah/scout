import type { QuickSaveFounder } from '@scout/types'
import type { DetectedPayload } from '../background/state'

export const config = {
  matches: ['https://www.ycombinator.com/companies/*'],
}

// Listing pages that match the content-script pattern but aren't company
// detail pages (e.g. /companies/active, /companies/top).
const LISTING_SEGMENTS = new Set(['active', 'top', 'new', 'library', 'apply'])
// h1 values that are page chrome, not a company name.
const GENERIC_TITLES = new Set(['Companies', 'Library', 'Apply', 'Jobs', 'Company'])
const SOCIAL_HOSTS = new Set(['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'startupschool.org'])

function cleanName(raw: string | null | undefined): string | null {
  if (!raw) return null
  return raw.replace(/\s*\|?\s*Y\s*Combinator$/i, '').trim() || null
}

function meta(name: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`)
    ?.content
}

/** True only on a company detail page — not the directory or batch listing pages. */
function hasFounderMarker(): boolean {
  try {
    return document.body.innerText.includes('Active Founders')
  } catch {
    return false
  }
}

/**
 * The company's own website. YC renders a dedicated link with
 * aria-label="Company website" on every page kind (company, jobs listing, job
 * detail); fall back to the first external link that isn't YC or a social
 * profile (header nav links like Startup School come first in DOM order).
 */
function findWebsite(): string | null {
  const labelled = document.querySelector<HTMLAnchorElement>('a[aria-label="Company website"]')
  if (labelled?.href) return labelled.href
  for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]'))) {
    try {
      const host = new URL(a.href).hostname.replace(/^www\./, '')
      if (SOCIAL_HOSTS.has(host) || host.endsWith('ycombinator.com')) continue
      return a.href
    } catch {
      // unparseable href — skip
    }
  }
  return null
}

/** Company name on the company page: hydrated <h1>, else og:title before the colon. */
function companyName(): string | null {
  const h1 = document.querySelector('h1')?.textContent?.trim()
  if (h1 && !GENERIC_TITLES.has(h1)) return h1
  const ogTitle = cleanName(meta('og:title'))
  return ogTitle ? ogTitle.split(':')[0].trim() || ogTitle : null
}

/** Company name on a job detail page: "Machine Learning Engineer at Stripe" → "Stripe". */
function companyFromJobDetail(): string | null {
  const ogTitle = cleanName(meta('og:title'))
  if (ogTitle) {
    const at = ogTitle.split(/\s+at\s+/i)
    if (at.length > 1) return at[at.length - 1].trim() || null
  }
  // Fall back to the company page link in the breadcrumb/nav.
  const link = document.querySelector<HTMLAnchorElement>('a[href^="/companies/"]')
  return link ? (link.pathname.split('/')[2] ?? null) : null
}

/** Company name on the jobs listing: "Jobs at Stripe" → "Stripe". */
function companyFromJobsListing(): string | null {
  const ogTitle = cleanName(meta('og:title'))
  return ogTitle ? ogTitle.replace(/^jobs?\s+at\s+/i, '').trim() || null : null
}

/** The specific job shown on a job detail page. */
function jobFromDetail(): { title: string; url: string } | null {
  const h1 = document.querySelector('h1')?.textContent?.trim()
  if (h1 && h1.length <= 120) return { title: h1, url: location.href }
  const ogTitle = cleanName(meta('og:title'))
  if (ogTitle) {
    const title = ogTitle.split(/\s+at\s+/i)[0]?.trim()
    if (title) return { title, url: location.href }
  }
  return null
}

/** First open role on the jobs listing page. */
function firstJobFromListing(slug: string): { title: string; url: string } | null {
  const link = document.querySelector<HTMLAnchorElement>(`a[href^="/companies/${slug}/jobs/"]`)
  const title = link?.textContent?.trim()
  if (!link || !title) return null
  return { title, url: link.href }
}

/** The page heading that begins the founder list, if present. */
function foundersHeading(): Element | null {
  const heading = Array.from(document.querySelectorAll<HTMLElement>('div')).find(
    (el) => el.children.length === 0 && el.textContent?.trim() === 'Active Founders',
  )
  if (!heading) return null
  // The founder list is the sibling that follows the heading.
  return heading.nextElementSibling
}

/**
 * Parse the "Active Founders" section into founder records with their social
 * profiles. YC renders each founder twice (desktop + mobile markup) inside one
 * card, so we collect per-card and dedupe by name.
 */
function parseFounders(): QuickSaveFounder[] {
  const container = foundersHeading()
  if (!container) return []

  const cards = Array.from(container.querySelectorAll<HTMLElement>('div')).filter((el) =>
    el.className?.includes('border-b border-gray-100'),
  )

  const byName = new Map<string, QuickSaveFounder>()
  for (const card of cards) {
    const nameEl = card.querySelector<HTMLElement>('div.font-bold')
    const name = nameEl?.textContent?.trim()
    if (!name) continue

    const titleEl = card.querySelector<HTMLElement>('div.text-gray-600')
    const bioEl = card.querySelector<HTMLElement>('div.whitespace-pre-line')
    const socials = Array.from(card.querySelectorAll<HTMLAnchorElement>('a[aria-label]'))
    const twitter = socials.find((a) => a.getAttribute('aria-label') === 'Twitter account')?.href ?? null
    const linkedin = socials.find((a) => a.getAttribute('aria-label') === 'LinkedIn profile')?.href ?? null

    byName.set(name, {
      name,
      title: titleEl?.textContent?.trim() || null,
      bio: bioEl?.textContent?.trim() || null,
      twitter_url: twitter,
      linkedin_url: linkedin,
    })
  }
  return Array.from(byName.values())
}

function detect(): DetectedPayload | null {
  const pathMatch = location.pathname.match(/^\/companies\/([^/]+)(?:\/(.*))?$/)
  if (!pathMatch) return null
  const slug = pathMatch[1]
  const rest = pathMatch[2] ?? ''
  if (LISTING_SEGMENTS.has(slug)) return null

  const isJobDetail = /^jobs\/.+/.test(rest)
  const isJobsListing = rest === 'jobs'

  let name: string | null
  if (isJobDetail) {
    name = companyFromJobDetail()
  } else if (isJobsListing) {
    name = companyFromJobsListing()
  } else {
    // Company page — reject the directory and batch-listing pages.
    if (/startup directory/i.test(meta('og:title') ?? document.title)) return null
    if (!hasFounderMarker()) return null
    name = companyName()
  }
  if (!name) return null

  // Job detail pages parse their own role; the /jobs listing AND the company
  // page both embed the open-role cards, so the first role link works for both.
  const job = isJobDetail
    ? jobFromDetail()
    : firstJobFromListing(slug)

  const website = findWebsite() ?? meta('og:url') ?? location.origin
  return {
    source: 'yc',
    source_url: location.href,
    startup: { name, website },
    job,
    founders: parseFounders(),
  }
}

const KEY = 'scout_detected_yc'

function run(force = false): void {
  const payload = detect()
  if (!payload) return
  if (!force && sessionStorage.getItem(KEY) === location.pathname) return // already detected this page
  sessionStorage.setItem(KEY, location.pathname)
  void chrome.runtime.sendMessage({ type: 'scout:detected', payload }).catch(() => {})
}

// The background asks the active tab to re-detect on popup open and expects
// the fresh payload back, so the popup never shows stale detection from
// another tab or an earlier navigation.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ((message as { type?: string } | null)?.type === 'scout:re-detect') {
    sendResponse({ payload: detect() })
  }
})

run()

// YC is a Next.js SPA: navigating between the company page, jobs tab, and job
// details changes the URL without a full page load, so re-detect on route
// changes.
let lastPath = location.pathname
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname
    run()
  }
}, 1000)
