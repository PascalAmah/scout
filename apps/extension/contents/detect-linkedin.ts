import type { QuickSaveFounder, QuickSaveJob } from '@scout/types'
import type { DetectedPayload } from '../background/state'
import { isRemoteLocation, locationFromCard } from './job-meta'

export const config = {
  matches: ['https://www.linkedin.com/*', 'https://linkedin.com/*'],
}

// LinkedIn obfuscates its class names and swaps them often, so we lean on the
// stable bits: the page URL shape and the og: meta tags that LinkedIn always
// renders. DOM queries below are heuristics only, with meta fallbacks.
function metaContent(name: string): string | undefined {
  return document
    .querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`)
    ?.content
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed || null
}

function companyFromJob(): string | null {
  // og:title on a job post looks like "Backend Engineer at Lumina | LinkedIn".
  const ogTitle = metaContent('og:title')
  if (ogTitle) {
    const at = ogTitle.split(/\s+at\s+/i)[1]?.split('|')[0]?.trim()
    if (at) return at
  }
  // Fall back to the company link in the job card.
  const companyLink = document.querySelector<HTMLAnchorElement>('a[href^="/company/"]')
  if (companyLink) {
    const slug = companyLink.getAttribute('href')?.split('/')[2]
    if (slug) return slug.replace(/[-_]+/g, ' ').trim() || null
  }
  const ogSite = metaContent('og:site_name')
  return ogSite && !/linkedin/i.test(ogSite) ? ogSite.split('|')[0].trim() : null
}

function jobFromPost(): QuickSaveJob | null {
  // Job title: h1 (class-stable enough) or og:title before " at ".
  const h1 = document.querySelector('h1')?.textContent?.trim()
  const title = (h1 && h1.length <= 120 ? h1 : null) ?? metaContent('og:title')?.split(/\s+at\s+/i)[0]?.trim()
  if (!title) return null
  const job: QuickSaveJob = { title, url: location.href }

  // LinkedIn shows the location as short text near the job title ("Remote",
  // "San Francisco, CA", "United States · Remote"). Scan the title's vicinity.
  const h1El = document.querySelector('h1')
  const scope = (h1El?.parentElement?.parentElement ?? document.body) as HTMLElement
  const loc = locationFromCard(scope)
  if (loc) {
    job.location = loc
    job.remote = isRemoteLocation(loc)
  }
  return job
}

/** Extract the founder's name, title, and company from a profile page. */
function profileFounder(): QuickSaveFounder | null {
  // og:title on a profile looks like "Ada Lovelace - Founder & CEO - Lumina | LinkedIn".
  const ogTitle = clean(metaContent('og:title'))
  const parts = ogTitle ? ogTitle.split('-').map((p) => p.trim()) : []

  let name = clean(parts[0]) ?? null
  let title = clean(parts[1]) ?? null
  let company = clean(parts[2]) ?? null

  // DOM fallbacks when meta is missing or lists no company.
  if (!name) {
    name = clean(document.querySelector('h1')?.textContent)
  }
  if (!title) {
    const headline = document.querySelector<HTMLElement>('[class*="text-body-medium"]')
    title = clean(headline?.textContent)
  }
  if (!company) {
    // "Founder & CEO at Lumina" → Lumina.
    const headlineText = title ?? ''
    const at = headlineText.split(/\s+at\s+/i)[1]
    if (at) company = at.trim()
    // Fall back to the first experience company link.
    if (!company) {
      const expCompany = document.querySelector<HTMLAnchorElement>(
        'a[href^="/company/"]',
      )
      const slug = expCompany?.getAttribute('href')?.split('/')[2]
      if (slug) company = slug.replace(/[-_]+/g, ' ').trim()
    }
  }

  if (!name) return null
  const founder: QuickSaveFounder = {
    name,
    title: title ?? null,
    linkedin_url: location.href,
  }
  if (company) founder.title = title ? `${title} at ${company}` : `Founder at ${company}`
  return founder
}

function detect(): DetectedPayload | null {
  const path = location.pathname.toLowerCase()

  // Job post pages.
  if (/\/jobs\/view\//.test(path) || /\/jobs\/collections\//.test(path)) {
    const company = companyFromJob()
    const job = jobFromPost()
    if (!company || !job) return null
    return {
      source: 'linkedin',
      source_url: location.href,
      startup: { name: company, website: `https://www.${company.replace(/\s+/g, '').toLowerCase()}.com` },
      job,
    }
  }

  // Founder profile pages.
  if (/\/in\//.test(path)) {
    const founder = profileFounder()
    if (!founder) return null
    const company =
      founder.title?.split(/\s+at\s+/i)[1]?.trim() ?? founder.name
    return {
      source: 'linkedin',
      source_url: location.href,
      startup: { name: company },
      founders: [founder],
    }
  }

  return null
}

const KEY = 'scout_detected_linkedin'

function run(force = false): void {
  const payload = detect()
  if (!payload) return
  if (!force && sessionStorage.getItem(KEY) === location.pathname) return
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

// LinkedIn is a SPA: navigating between job posts and profiles changes the URL
// without a full page load, so re-detect on route changes.
let lastPath = location.pathname
setInterval(() => {
  if (location.pathname !== lastPath) {
    lastPath = location.pathname
    run()
  }
}, 1000)
