import { useState } from 'react'
import { chf } from '../lib/format'
import { RULE_CONSTANTS } from '../lib/affordability'
import { useI18n } from '../i18n/I18nContext'
import { renderRich } from './Trans'

const roundK = (v) => Math.round(v / 1000) * 1000
const PILLAR3A_MONTHLY = Math.round(RULE_CONSTANTS.PILLAR3A_MAX / 12) // ≈ 605/mo

/**
 * "A path to {goal}" (spec §6c): a current-max → goal progress bar, an
 * interactive monthly-savings slider with a live timeline, and three preset
 * scenarios. All derived from the existing shortfall math (no new engine work);
 * the slider value seeds the middle "save more" scenario.
 *
 * @param {number} targetPrice      The price being reached for.
 * @param {number} currentMax       The buyer's current achievable max price.
 * @param {number} equityGap        CHF of extra hard equity needed (0 if none).
 * @param {number} incomeGapAnnual  CHF of extra gross annual income needed (0 if none).
 * @param {number} [savingsPerMonth] Controlled monthly-savings value (shared across
 *                                   the dream-price viz). Falls back to local state.
 * @param {(n:number)=>void} [onSavingsChange] Setter for the controlled value.
 */
export default function PathToGoal({
  targetPrice, currentMax = 0, equityGap = 0, incomeGapAnnual = 0,
  savingsPerMonth, onSavingsChange,
}) {
  const { t } = useI18n()
  const [internal, setInternal] = useState(2000)
  const monthly = savingsPerMonth != null ? savingsPerMonth : internal
  const setMonthly = onSavingsChange || setInternal
  const clamp = (n) => Math.min(20000, Math.max(0, Math.round(n / 50) * 50))

  const fmtDuration = (months) =>
    months >= 24 ? t('path.durYears', { n: (months / 12).toFixed(1) }) : t('path.durMonths', { n: months })
  const monthsFor = (perMonth) => (equityGap > 0 && perMonth > 0 ? Math.ceil(equityGap / perMonth) : 0)

  const progress = targetPrice > 0 ? Math.min(100, Math.max(2, (currentMax / targetPrice) * 100)) : 0

  // Three transparent presets. Rates are fixed and labelled so the figures stay
  // honest (we don't know the buyer's actual current savings rate).
  const scenarios = [
    { key: 'steady', perMonth: 1000 },
    { key: 'more', perMonth: monthly },
    { key: 'max3a', perMonth: monthly + PILLAR3A_MONTHLY, note: true },
  ]

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <h4 className="font-display text-base font-bold text-ink">
        {t('path.title', { target: chf(targetPrice) })}
      </h4>
      <p className="mt-1 text-sm leading-relaxed text-body">{t('path.intro')}</p>

      {/* Progress bar: current max → goal */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span>{t('path.current', { value: chf(currentMax) })}</span>
          <span>{t('path.goal', { value: chf(targetPrice) })}</span>
        </div>
        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Equity gap + interactive savings slider */}
      {equityGap > 0 && (
        <div className="mt-5">
          <p className="text-sm text-body">{renderRich(t('path.saveGap', { gap: chf(roundK(equityGap)) }))}</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="shrink-0 text-xs text-muted">{t('path.saveLabel')}</span>
            <input
              type="range" min="0" max="6000" step="50"
              value={Math.min(6000, monthly)}
              onChange={(e) => setMonthly(clamp(Number(e.target.value)))}
              className="flex-1 accent-ink"
              aria-label={t('path.saveLabel')}
            />
            <div className="flex w-28 shrink-0 items-center rounded-lg border border-line bg-white">
              <span className="select-none pl-2 pr-1 text-xs text-muted">CHF</span>
              <input
                type="text" inputMode="numeric"
                value={monthly}
                onChange={(e) => setMonthly(clamp(Number(e.target.value.replace(/[^0-9]/g, '')) || 0))}
                className="w-full bg-transparent py-1.5 pr-1 text-right text-sm font-semibold tabular-nums text-ink focus:outline-none"
                aria-label={t('path.saveLabel')}
              />
              <span className="select-none pr-2 text-xs text-muted">/mo</span>
            </div>
          </div>
          <p className="mt-1 text-sm text-body">
            {renderRich(t('path.saveTimeline', { time: fmtDuration(monthsFor(monthly)) }))}
          </p>
        </div>
      )}

      {/* Three preset scenarios */}
      {equityGap > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t('path.scenariosTitle')}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {scenarios.map((s) => (
              <div key={s.key} className="rounded-lg border border-line bg-white p-3">
                <p className="text-xs font-semibold text-ink">{t(`path.scen.${s.key}`)}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{chf(s.perMonth)}/mo</p>
                <p className="mt-0.5 text-xs text-body">{fmtDuration(monthsFor(s.perMonth))}</p>
                {s.note && (
                  <p className="mt-1 text-[11px] leading-snug text-muted">{t('path.scen.max3aNote')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income gap, if the affordability rule (not equity) is the blocker */}
      {incomeGapAnnual > 0 && (
        <p className="mt-4 text-sm text-body">
          {renderRich(t('path.incomeGap', { gap: chf(roundK(incomeGapAnnual)) }))}
        </p>
      )}
    </div>
  )
}
