import type { DetectedPayload } from '../background/state'

export const config = {
  matches: ['https://www.ycombinator.com/companies/*'],
}

function cleanName(raw: string | null | undefined): string | null {
  if (!raw) return null
  return raw.replace(/\s*\|\s*Y\s*Combinator$/i, '').replace(/^\s*|\s*$/g, '') || null
}

function detect(): DetectedPayload | null {
  const meta = (name: string) =>
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"], meta[property="${name}"]`)?.content

  const name = cleanName(
    meta('og:title') ||
      meta('og:site_name') ||
      document.querySelector('h1')?.textContent ||
      document.title,
  )
  const website =
    document.querySelector<HTMLAnchorElement>('a[rel="nofollow"]')?.href ??
    meta('og:url') ??
    location.origin

  if (!name) return null
  return {
    source: 'yc',
    source_url: location.href,
    startup: { name, website },
    job: null,
  }
}

if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem('scout_detected_yc')) {
  const payload = detect()
  if (payload) {
    sessionStorage.setItem('scout_detected_yc', '1')
    void chrome.runtime.sendMessage({ type: 'scout:detected', payload }).catch(() => {})
  }
}