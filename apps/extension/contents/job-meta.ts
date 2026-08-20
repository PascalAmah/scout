/**
 * Shared job-meta heuristics used by the content-script detectors.
 *
 * Job cards across YC, LinkedIn, Work at a Startup and generic careers pages
 * render a short text line next to the role title — location, remote/hybrid
 * signal, salary, seniority. The exact markup differs per source, so the
 * detectors extract the candidate card container and lean on the small-text
 * heuristics here to classify the values worth persisting.
 */

/** Text that reads like a location ("Lehi, UT, US", "Remote (US)", "London"). */
const LOCATION_HINTS = new Set([
  'remote',
  'hybrid',
  'onsite',
  'on-site',
  'anywhere',
  'worldwide',
  'global',
  'us',
  'usa',
  'united states',
  'uk',
  'london',
  'berlin',
  'san francisco',
  'new york',
  'toronto',
  'vancouver',
  'paris',
  'amsterdam',
  'tel aviv',
  'singapore',
  'stockholm',
  'boston',
  'seattle',
  'austin',
  'los angeles',
  'chicago',
  'sydney',
  'melbourne',
  'madrid',
  'barcelona',
  'lisbon',
  'warsaw',
  'prague',
  'zurich',
  'munich',
  'denver',
  'portland',
  'boulder',
])

const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL',
  'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT',
  'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI',
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
])

/** Looks like a "City, ST" / "City, ST, US" fragment. */
function looksLikeCityState(text: string): boolean {
  const parts = text.split(',').map((p) => p.trim())
  if (parts.length < 2 || parts.length > 3) return false
  const state = parts[1]
  if (state && US_STATE_CODES.has(state.toUpperCase())) return true
  const tail = parts[parts.length - 1]
  return /^(us|usa|united states|uk|gb|ca|canada)$/i.test(tail)
}

/** Normalize a free-text location into a storeable value, or null if it isn't one. */
export function normalizeLocation(raw: string | null | undefined): string | null {
  const t = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 60) return null
  const lower = t.toLowerCase()
  if (LOCATION_HINTS.has(lower)) return t
  if (LOCATION_HINTS.has(lower.split(' (')[0] ?? '')) return t
  if (looksLikeCityState(t)) return t
  return null
}

/** Whether a location value signals remote / hybrid work. */
export function isRemoteLocation(location: string | null | undefined): boolean {
  return /remote|hybrid|anywhere|worldwide|global/i.test(location ?? '')
}

/**
 * Best-effort remote flag from a location string. Returns true for remote /
 * hybrid signals, false when a concrete city is given, null when unknown.
 */
export function remoteFromLocation(location: string | null | undefined): boolean | null {
  if (!location) return null
  const lower = location.toLowerCase()
  if (/remote|anywhere|worldwide|global/i.test(lower)) return true
  if (/hybrid/i.test(lower)) return true
  if (looksLikeCityState(location) || LOCATION_HINTS.has(lower)) return false
  return null
}

/** Maps free-text seniority into the compact value the API expects. */
export function normalizeSeniority(raw: string | null | undefined): string | null {
  const t = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 40) return null
  const lower = t.toLowerCase()
  if (/\bentry[- ]?level\b|junior\b/.test(lower)) return 'entry'
  if (/\bsenior\b/.test(lower) || /\b11\s*\+?\s*(years?|yrs?)\b/.test(lower)) return 'senior'
  if (/\bmid[- ]?level\b|\bstaff\b|\bintermediate\b/.test(lower)) return 'mid'
  return null
}

/** Maps free-text employment type into the compact value the API expects. */
export function normalizeEmploymentType(raw: string | null | undefined): string | null {
  const t = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!t || t.length > 30) return null
  const lower = t.toLowerCase()
  if (/full[- ]?time/.test(lower)) return 'full_time'
  if (/part[- ]?time/.test(lower)) return 'part_time'
  if (/contract|freelance/.test(lower)) return 'contract'
  if (/intern/.test(lower)) return 'internship'
  return null
}

/** Short, standalone text nodes inside a card that read like location/seniority. */
export function scanCardText(card: HTMLElement): string[] {
  const values: string[] = []
  for (const el of Array.from(card.querySelectorAll<HTMLElement>('span,div,p,small,li'))) {
    const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!t || t.length > 60) continue
    if (el.querySelector('a,button,img')) continue
    values.push(t)
  }
  return values
}

/** Best-effort location found inside a job card container. */
export function locationFromCard(card: HTMLElement): string | null {
  for (const t of scanCardText(card)) {
    const loc = normalizeLocation(t)
    if (loc) return loc
  }
  return null
}