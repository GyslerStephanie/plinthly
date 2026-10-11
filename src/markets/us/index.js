/**
 * United States — conventional-loan rules, USD, square feet, English only.
 * Rules, data and engines live beside this file (us-data.json, affordability.js,
 * mortgagePayoff.js, dream.js). All five phases have a US implementation
 * (Compare is Swiss-only for now).
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
  // Phases with a US implementation.
  phases: [1, 2, 3, 4, 5],
}
