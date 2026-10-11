/**
 * Best-guess the visitor's country from the browser — a SUGGESTION for the
 * onboarding confirm step, never applied silently. Pure (no window access) so
 * it can be tested; the caller passes in what the browser reports.
 *
 * Time zone wins over language: an English-speaking expat in Zurich has
 * `en-US` as browser language but `Europe/Zurich` as time zone, and where they
 * live is what decides which market's rules apply.
 */

// US IANA zones. Explicit list rather than `America/*`, which also covers
// Canada, Mexico and South America.
const US_ZONE_PREFIXES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
  'America/Los_Angeles', 'America/Anchorage', 'America/Adak', 'America/Boise',
  'America/Detroit', 'America/Indiana/', 'America/Kentucky/', 'America/North_Dakota/',
  'America/Menominee', 'America/Juneau', 'America/Sitka', 'America/Metlakatla',
  'America/Nome', 'America/Yakutat', 'America/Indianapolis', 'America/Louisville',
  'Pacific/Honolulu', 'US/',
]

const ZONE_COUNTRY = {
  'Europe/Zurich': 'CH',
}

/** ISO 3166 country code for an IANA time zone, or null when unknown. */
export function countryFromTimeZone(timeZone) {
  if (!timeZone) return null
  if (ZONE_COUNTRY[timeZone]) return ZONE_COUNTRY[timeZone]
  if (US_ZONE_PREFIXES.some((p) => timeZone === p || (p.endsWith('/') && timeZone.startsWith(p)))) return 'US'
  return null
}

/** Country from the first language tag that carries a region (`de-CH` → CH). */
export function countryFromLanguages(languages = []) {
  for (const tag of languages) {
    const m = /^[a-z]{2,3}[-_]([A-Za-z]{2})\b/.exec(String(tag || ''))
    if (m) return m[1].toUpperCase()
  }
  return null
}

/** Best guess, or null. `{ timeZone, languages }` as the browser reports them. */
export function detectCountry({ timeZone, languages } = {}) {
  return countryFromTimeZone(timeZone) || countryFromLanguages(languages)
}

/** Read the browser's signals. Tolerates environments without Intl/navigator. */
export function browserSignals() {
  let timeZone = null
  let languages = []
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    /* ignore */
  }
  try {
    languages = navigator.languages?.length ? [...navigator.languages] : [navigator.language].filter(Boolean)
  } catch {
    /* ignore */
  }
  return { timeZone, languages }
}
