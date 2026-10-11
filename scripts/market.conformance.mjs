/**
 * Market layer conformance — registry shape, browser detection, which market a
 * link opens in, and the `mk` hash key. Run: npm run test:market
 *
 * The rule that matters most: a share link made before markets existed must
 * still open as Switzerland, whatever the visitor's stored preference.
 */
import {
  MARKETS, DEFAULT_MARKET_ID, getMarket, isMarketId, marketIdForCountry,
  resolveInitialMarketId, marketName,
} from '../src/markets/index.js'
import { detectCountry, countryFromTimeZone, countryFromLanguages } from '../src/markets/detect.js'
import { encodeState, decodeState } from '../src/lib/share.js'

let pass = 0
let fail = 0
function check(name, ok) {
  if (ok) pass++
  else {
    fail++
    console.error(`✗ ${name}`)
  }
}

// ── 1. Registry ──────────────────────────────────────────────────────────────
const REQUIRED = ['id', 'countryCode', 'flag', 'currency', 'numberLocale', 'areaUnit', 'languages', 'regionKind', 'defaultRegion']
for (const [id, m] of Object.entries(MARKETS)) {
  for (const f of REQUIRED) check(`${id}: has ${f}`, m[f] != null)
  check(`${id}: key matches id`, m.id === id)
  check(`${id}: languages include en (the t() fallback)`, m.languages.includes('en'))
  check(`${id}: currency is a valid ISO code`, (() => {
    try { new Intl.NumberFormat('en', { style: 'currency', currency: m.currency }); return true } catch { return false }
  })())
}
check('default market is registered', isMarketId(DEFAULT_MARKET_ID))
check('default market is ch', DEFAULT_MARKET_ID === 'ch')
check('getMarket falls back to default for junk', getMarket('xx').id === DEFAULT_MARKET_ID)
check('isMarketId rejects prototype keys', !isMarketId('toString') && !isMarketId('__proto__'))
check('CH country → ch', marketIdForCountry('CH') === 'ch')
check('country lookup is case-insensitive', marketIdForCountry('ch') === 'ch')
check('unsupported country → null', marketIdForCountry('FR') === null)
check('marketName localises', marketName(MARKETS.ch, 'de') === 'Schweiz')

// ── 2. Detection (suggestion only) ───────────────────────────────────────────
check('Zurich zone → CH', countryFromTimeZone('Europe/Zurich') === 'CH')
check('New York zone → US', countryFromTimeZone('America/New_York') === 'US')
check('Indiana sub-zone → US', countryFromTimeZone('America/Indiana/Indianapolis') === 'US')
check('Honolulu → US', countryFromTimeZone('Pacific/Honolulu') === 'US')
check('Toronto is not US', countryFromTimeZone('America/Toronto') === null)
check('Mexico City is not US', countryFromTimeZone('America/Mexico_City') === null)
check('language region de-CH → CH', countryFromLanguages(['de-CH']) === 'CH')
check('first tag with a region wins', countryFromLanguages(['en', 'en-US', 'de-CH']) === 'US')
check('no region → null', countryFromLanguages(['en', 'de']) === null)
check('time zone beats language (expat in Zurich)',
  detectCountry({ timeZone: 'Europe/Zurich', languages: ['en-US'] }) === 'CH')
check('falls back to language when zone unknown',
  detectCountry({ timeZone: 'Europe/Paris', languages: ['fr-FR'] }) === 'FR')
check('nothing known → null', detectCountry({}) === null)

// ── 3. Which market a link opens in ──────────────────────────────────────────
check('hash mk wins over stored', resolveInitialMarketId({ hashMarket: 'ch', stored: 'xx' }) === 'ch')
check('legacy link (state, no mk) → ch even if stored says otherwise',
  resolveInitialMarketId({ hashHasState: true, stored: 'ch' }) === 'ch')
check('no hash → stored choice', resolveInitialMarketId({ stored: 'ch' }) === 'ch')
check('junk stored → default', resolveInitialMarketId({ stored: 'zz' }) === DEFAULT_MARKET_ID)
check('junk hash mk ignored', resolveInitialMarketId({ hashMarket: 'zz' }) === DEFAULT_MARKET_ID)
check('nothing → default', resolveInitialMarketId() === DEFAULT_MARKET_ID)

// ── 4. URL hash ──────────────────────────────────────────────────────────────
check('mk encodes', encodeState({ market: 'ch', grossIncome: '150,000' }).includes('mk=ch'))
check('mk round-trips', decodeState('gi=150000&mk=ch').market === 'ch')
check('legacy hash decodes without market', decodeState('gi=150000&ct=ZH').market === undefined)

console.log(`\nMarket conformance: ${pass} passed, ${fail} failed (${pass + fail} checks)`)
if (fail > 0) process.exit(1)
console.log('✓ All checks passed.')
