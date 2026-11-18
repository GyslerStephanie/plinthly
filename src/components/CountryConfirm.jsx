import { useI18n } from '../i18n/I18nContext'
import { useDialogFocus } from '../lib/useDialogFocus'
import { marketName, getMarket } from '../markets'
import { useMarket } from '../markets/MarketContext'
import { ut } from '../markets/us/copy'
import { track } from '../lib/track'
import RequestPicker from './RequestPicker'

// Likely next markets for "My country isn't listed" (ISO 3166 alpha-2). The
// supported markets (CH, US) are left out; anything else goes under "Other".
const REQUEST_COUNTRIES = [
  'DE', 'AT', 'FR', 'IT', 'GB', 'IE', 'NL', 'BE', 'LU', 'ES', 'PT', 'SE', 'NO', 'DK', 'FI',
  'PL', 'CZ', 'CA', 'MX', 'BR', 'AU', 'NZ', 'SG', 'HK', 'JP', 'IN', 'AE', 'ZA', 'IL', 'CN',
]

/** Country name in the UI language; the bare code when Intl can't name it. */
function countryLabel(code, lang) {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
}

/**
 * Country choice — the first step of the front door: two equal calls to
 * action, United States and Switzerland. The browser's guess is still recorded
 * (MarketContext) but no longer pre-selects anything; nothing is applied until
 * the visitor picks.
 *
 * Copy is English (ut): the visitor hasn't chosen a country, so we don't yet
 * know which languages apply.
 */
export default function CountryConfirm({ onChoose, onSkip }) {
  const dialogRef = useDialogFocus()
  const { lang, t } = useI18n()
  const { marketId } = useMarket()
  // US first, then Switzerland: two equal choices, no pre-selected guess.
  const choices = ['us', 'ch'].map(getMarket).filter(Boolean)
  const name = (m) => marketName(m, lang)
  const requestOptions = [
    ...REQUEST_COUNTRIES.map((code) => ({ value: code, label: countryLabel(code, lang) })).sort((a, b) =>
      a.label.localeCompare(b.label, lang),
    ),
    { value: 'other', label: t('countryRequest.other') },
  ]

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-title"
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'var(--surface-page)' }}
    >
      <div className="mx-auto max-w-xl px-5 py-10 md:px-8 md:py-16">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/brand/plinthly-mark.png" alt="" className="h-8 w-8" style={{ imageRendering: 'pixelated' }} />
            <span className="ds-wordmark text-base text-ink">Plinthly</span>
          </div>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline"
            >
              {ut('country.continue')} · {name(getMarket(marketId))}
            </button>
          )}
        </div>

        <h1 id="country-title" className="font-display text-4xl font-semibold tracking-tight text-ink">
          {ut('country.title')}
        </h1>
        <p className="mt-2 text-base text-body">{ut('country.intro')}</p>

        <section className="mt-8" aria-label={ut('country.pick')}>
          <div className="grid gap-3 sm:grid-cols-2">
            {choices.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChoose(m.id)}
                className="flex items-center justify-center gap-3 rounded-xl bg-teal-800 px-5 py-4 text-lg font-bold text-on-primary shadow-sm transition hover:bg-teal-900"
              >
                <span className="ds-figure rounded-md bg-white/15 px-2 py-1 text-xs font-medium" aria-hidden="true">
                  {m.countryCode}
                </span>
                {name(m)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{ut('country.otherSoon')}</p>
          <RequestPicker
            className="mt-3"
            linkText={t('countryRequest.link')}
            label={t('countryRequest.label')}
            placeholder={t('countryRequest.placeholder')}
            options={requestOptions}
            thanks={t('countryRequest.thanks')}
            onPick={(country) => track('market_requested', { country })}
          />
        </section>

      </div>
    </div>
  )
}
