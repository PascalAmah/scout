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
function isCompanyPage(): boolean {
  if (/startup directory/i.test(meta('og:title') ?? document.title)) return false
  const segment = location.pathname.split('/')[2] ?? ''
  if (LISTING_SEGMENTS.has(segment)) return false
  // Company pages render an "Active Founders" section; listing pages don't.
  try {
    return document.body.innerText.includes('Active Founders')
  } catch {
    return /^\/companies\/[^/]+$/.test(location.pathname)
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

function detect(): DetectedPayload | null {
  if (!isCompanyPage()) return null

  // Name: the hydrated <h1> is the clean company name; otherwise use the
  // og:title ("<Company>: <tagline> | Y Combinator") before the colon.
  const h1 = document.querySelector('h1')?.textContent?.trim()
  let name = h1 && !GENERIC_TITLES.has(h1) ? h1 : null
  if (!name) {
    const ogTitle = cleanName(meta('og:title'))
    name = ogTitle ? ogTitle.split(':')[0].trim() || ogTitle : null
  }
  if (!name) return null

  const website = findWebsite() ?? meta('og:url') ?? location.origin
  return {
    source: 'yc',
    source_url: location.href,
    startup: { name, website },
    job: null,
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

// YC is a Next.js SPA: navigating the companies list changes the URL without a
// full page load, so re-detect when the route changes.
let lastPath = location.pathname
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname
    run()
  }
}, 1000)
