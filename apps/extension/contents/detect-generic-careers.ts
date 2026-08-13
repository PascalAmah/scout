import type { DetectedPayload } from '../background/state'

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

function isJobsPage(): boolean {
  const path = location.pathname.toLowerCase()
  return /\/jobs?\//.test(path) || /\/roles?\//.test(path)
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
  if (!isJobsPage()) return null
  const ogTitle = metaContent('og:title')
  if (ogTitle) {
    const cleaned = ogTitle.split(/[|\-–—·]/)[0]?.trim()
    if (cleaned && cleaned.length <= 80 && !/(career|job|role|hiring|work at)/i.test(cleaned)) return cleaned
  }
  const h1 = document.querySelector('h1')?.textContent?.trim()
  return h1 && h1.length <= 80 ? h1 : null
}

function detect(): DetectedPayload | null {
  const name = guessCompanyName()
  if (!name) return null
  const jobTitle = guessJobTitle()
  return {
    source: 'generic_careers',
    source_url: location.href,
    startup: { name, website: metaContent('og:url') ?? location.origin },
    job: jobTitle ? { title: jobTitle, url: location.href } : null,
  }
}

if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('scout_detected_generic')) {
  const payload = detect()
  if (payload) {
    sessionStorage.setItem('scout_detected_generic', '1')
    void chrome.runtime.sendMessage({ type: 'scout:detected', payload }).catch(() => {})
  }
}