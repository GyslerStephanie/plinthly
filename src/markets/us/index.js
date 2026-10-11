/**
 * United States — conventional-loan rules, USD, square feet, English only.
 * Rules, data and engines live beside this file (us-data.json, affordability.js,
 * mortgagePayoff.js, dream.js). v1 covers Phases 1–2; other phases show a
 * "coming soon" state — see `phases`.
 */
export default {
  id: 'us',
  countryCode: 'US',
  currency: 'USD',
  numberLocale: 'en-US', // $1,250,000
  areaUnit: 'sqft',
  languages: ['en'],
  regionKind: 'state',
  defaultRegion: 'CA',
  // Phases with a real US implementation; the rest render "coming soon".
  phases: [1, 2],
}
