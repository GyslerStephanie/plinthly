import { chf } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'

/**
 * "Your levers" (spec §6d): the named, situation-specific moves that would shift
 * this buyer's result. Renders only the levers that actually apply.
 *
 * @param {object}  [lever3a]          pillar3aOptimisation() result (gap + taxSaving).
 * @param {number}  [hardEquityGap]    CHF short of the 10% hard-equity minimum (0 = none).
 * @param {number}  [existingDebtMonthly] CHF/mo of obligations dragging the ratio (0 = none).
 * @param {boolean} [debtBlocking]     Whether those debts are the affordability blocker.
 */
export default function Levers({ lever3a, hardEquityGap = 0, existingDebtMonthly = 0, debtBlocking = false }) {
  const { t } = useI18n()

  const items = []

  if (lever3a && lever3a.gap > 0) {
    items.push({
      key: '3a',
      title: t('levers.l3aTitle'),
      body: t('levers.l3aBody', {
        gap: chf(lever3a.gap),
        max: chf(lever3a.max),
        saving: chf(Math.round(lever3a.taxSaving)),
      }),
    })
  }
  if (hardEquityGap > 0) {
    items.push({
      key: 'hard',
      title: t('levers.hardTitle'),
      body: t('levers.hardBody', { gap: chf(Math.round(hardEquityGap / 1000) * 1000) }),
    })
  }
  if (existingDebtMonthly > 0 && debtBlocking) {
    items.push({
      key: 'debt',
      title: t('levers.debtTitle'),
      body: t('levers.debtBody', { amount: chf(existingDebtMonthly) }),
    })
  }

  if (!items.length) return null

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('levers.title')}</p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.key} className="rounded-lg border border-line bg-white p-3">
            <p className="text-sm font-semibold text-ink">→ {it.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-body">{it.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
