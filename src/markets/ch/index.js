/**
 * Switzerland — the original Plinthly market. The rules, data and engines stay
 * where they have always lived (src/lib, src/data); this file only describes
 * the market so shared code can ask "which currency / locale / unit?" instead
 * of assuming CHF.
 */
export default {
  id: 'ch',
  countryCode: 'CH',
  flag: '🇨🇭',
  currency: 'CHF',
  numberLocale: 'de-CH', // CHF 1'250'000
  areaUnit: 'm2',
  languages: ['en', 'de', 'fr', 'it'],
  regionKind: 'canton',
  defaultRegion: 'ZH',
}
