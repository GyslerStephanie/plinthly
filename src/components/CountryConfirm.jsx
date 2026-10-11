import { useI18n } from '../i18n/I18nContext'
import { useDialogFocus } from '../lib/useDialogFocus'
import { marketList, marketName, getMarket } from '../markets'
import { useMarket } from '../markets/MarketContext'
import { ut } from '../markets/us/copy'

/**
 * Country confirm — the first step of the front door (spec: auto-detect, then
 * confirm). The browser's guess is pre-selected as one big confirm button; the
 * other countries sit in a list below. Nothing is applied until the visitor
 * picks, so the guess can never silently lock anyone in.
 *
 * Copy is English (ut): the visitor hasn't chosen a country, so we don't yet
 * know which languages apply.
 */
export default function CountryConfirm({ onChoose, onSkip }) {
  const dialogRef = useDialogFocus()
  const { lang } = useI18n()
  const { detectedMarketId, marketId } = useMarket()
  const guess = detectedMarketId ? getMarket(detectedMarketId) : null
  const others = marketList.filter((m) => !guess || m.id !== guess.id)
  const name = (m) => marketName(m, lang)

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

        <p className="ds-eyebrow text-xs text-teal-700">{ut('country.eyebrow')}</p>
        <h1 id="country-title" className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">
          {ut('country.title')}
        </h1>
        <p className="mt-2 text-base text-body">{ut('country.intro')}</p>

        {guess && (
          <section className="mt-8 rounded-xl border-2 border-teal-800 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="ds-figure rounded-md bg-teal-50 px-2.5 py-2 text-sm font-medium text-teal-800" aria-hidden="true">
                {guess.countryCode}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted">{ut('country.detected')}</p>
                <p className="font-display text-2xl font-semibold leading-tight text-ink">{name(guess)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-body">{ut(`country.summary.${guess.id}`)}</p>
            <button
              type="button"
              onClick={() => onChoose(guess.id)}
              className="mt-4 w-full rounded-lg bg-teal-800 px-4 py-3 text-sm font-bold text-on-primary transition hover:bg-teal-900"
            >
              {ut('country.confirm', { name: name(guess) })}
            </button>
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-ink">{guess ? ut('country.other') : ut('country.pick')}</h2>
          <ul className="mt-2 overflow-hidden rounded-xl border border-line bg-card">
            {others.map((m) => (
              <li key={m.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => onChoose(m.id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface"
                >
                  <span className="ds-figure rounded-md bg-surface px-2 py-1.5 text-xs font-medium text-body" aria-hidden="true">
                    {m.countryCode}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{name(m)}</span>
                    <span className="block text-sm text-muted">{ut(`country.summary.${m.id}`)}</span>
                  </span>
                  <span className="text-muted" aria-hidden="true">→</span>
                </button>
              </li>
            ))}
            <li className="flex items-center gap-3 px-4 py-3.5 text-sm text-muted">
              <span className="h-5 w-5 shrink-0 rounded-full border border-dashed border-slate-300" aria-hidden="true" />
              {ut('country.otherSoon')}
            </li>
          </ul>
        </section>

        <p className="mt-6 text-sm text-muted">{ut('country.privacy')}</p>
      </div>
    </div>
  )
}
