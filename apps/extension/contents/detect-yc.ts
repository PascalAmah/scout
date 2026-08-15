import type { DetectedPayload } from '../background/state'

export const config = {
  matches: ['https://www.ycombinator.com/companies/*'],
}

// Listing pages that match the content-script pattern but aren't company
// detail pages (e.g. /companies/active, /companies/top).
const LISTING_SEGMENTS = new Set(['active', 'top', 'new', 'library', 'apply'])
// h1 values that are page chrome, not a company name.
const GENERIC_TITLES = new Set(['Companies', 'Library', 'Apply', 'Jobs', 'Company'])
const SOCIAL_HOSTS = new Set(['twitter.com', 'x.com', 'linkedin.com', 'facebook.com'])

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

/** The company's own website: first external link that isn't YC or a social profile. */
function findWebsite(): string | null {
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

  const job = isJobDetail
    ? jobFromDetail()
    : isJobsListing
      ? firstJobFromListing(slug)
      : null

  const website = findWebsite() ?? meta('og:url') ?? location.origin
  return {
    source: 'yc',
    source_url: location.href,
    startup: { name, website },
    job,
  }
}

const KEY = 'scout_detected_yc'

function run(): void {
  const payload = detect()
  if (!payload) return
  if (sessionStorage.getItem(KEY) === location.pathname) return // already detected this page
  sessionStorage.setItem(KEY, location.pathname)
  void chrome.runtime.sendMessage({ type: 'scout:detected', payload }).catch(() => {})
}

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
