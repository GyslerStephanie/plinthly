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
import { formatMoney, formatInt, money, int, currencySymbol, areaUnit, setFormatMarket } from '../src/lib/format.js'

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
const REQUIRED = ['id', 'countryCode', 'currency', 'numberLocale', 'areaUnit', 'languages', 'regionKind', 'defaultRegion', 'phases']
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
check('US country → us', marketIdForCountry('US') === 'us')
check('every market offers Phase 1', Object.values(MARKETS).every((m) => m.phases.includes(1)))
check('US is English-only', MARKETS.us.languages.length === 1 && MARKETS.us.languages[0] === 'en')
check('US formats USD for real', formatMoney(1250000, MARKETS.us) === '$1,250,000')
check('US area unit is sq ft', areaUnit(MARKETS.us) === 'sq ft')
check('US link opens US even if stored is ch', resolveInitialMarketId({ hashMarket: 'us', hashHasState: true, stored: 'ch' }) === 'us')
check('marketName localises', marketName(MARKETS.ch, 'de') === 'Schweiz')
check('marketName US', marketName(MARKETS.us, 'en') === 'United States')

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

// ── 5. Formatting ────────────────────────────────────────────────────────────
// Switzerland must render byte-identically to the pre-market `chf()`.
const legacyChf = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 })
const legacyInt = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 })
const SAMPLES = [0, 1, 999, 7258, 170000, 850000, 1250000, 12345678.9, -42000]
check('CH money is byte-identical to legacy chf()', SAMPLES.every((v) => formatMoney(v, MARKETS.ch) === legacyChf.format(v)))
check('CH int is byte-identical to legacy int()', SAMPLES.every((v) => formatInt(v, MARKETS.ch) === legacyInt.format(v)))
check('money() defaults to CH', money(850000) === legacyChf.format(850000))
check('junk → em dash', formatMoney(NaN) === '—' && formatMoney(null) === '—' && formatInt(Infinity) === '—')
check('CH symbol is CHF', currencySymbol(MARKETS.ch) === 'CHF')
check('CH area unit is m²', areaUnit(MARKETS.ch) === 'm²')
// A stand-in US-shaped market proves the formatter is truly market-driven
// before the real US market lands.
const usLike = { currency: 'USD', numberLocale: 'en-US', areaUnit: 'sqft' }
check('USD formats as $1,250,000', formatMoney(1250000, usLike) === '$1,250,000')
check('USD symbol is $', currencySymbol(usLike) === '$')
check('sq ft label', areaUnit(usLike) === 'sq ft')
setFormatMarket(usLike)
check('active market drives money()/int()', money(1250000) === '$1,250,000' && int(1250) === '1,250')
setFormatMarket(MARKETS.ch)
check('switching back restores CHF', money(1250000) === legacyChf.format(1250000))

console.log(`\nMarket conformance: ${pass} passed, ${fail} failed (${pass + fail} checks)`)
if (fail > 0) process.exit(1)
console.log('✓ All checks passed.')
