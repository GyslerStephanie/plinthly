import { chf, pct } from '../lib/format'
import { RULE_CONSTANTS } from '../lib/affordability'
import { useI18n } from '../i18n/I18nContext'
import { Card } from './ui'

const PILLAR3A_MONTHLY = Math.round(RULE_CONSTANTS.PILLAR3A_MAX / 12) // ≈ 605/mo

/* ──────────────────────────────────────────────────────────────────────────
 * GapChart — "where you are vs your goal", on price and on equity. Each bar
 * shows the filled "have" portion (ink) and the remaining gap (red) labelled
 * with the exact difference. The equity gap is passed in so it matches the
 * verdict headline exactly (accounts for the 2nd pillar).
 * ────────────────────────────────────────────────────────────────────────── */
export function GapChart({ currentMax, dreamPrice, needEquity, equityGap }) {
  const { t } = useI18n()
  const priceGap = Math.max(0, dreamPrice - currentMax)
  const haveEquity = Math.max(0, needEquity - equityGap)

  const GapBar = ({ label, have, goal, gap }) => {
    const haveW = goal > 0 ? Math.min(100, (have / goal) * 100) : 0
    return (
      <div>
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="tabular-nums text-slate-700">
            {chf(have)} <span className="text-xs text-muted">/ {chf(goal)} · {pct(have / (goal || 1))}</span>
          </span>
        </div>
        <div className="flex h-5 w-full overflow-hidden rounded bg-slate-50">
          <div className="h-full bg-ink" style={{ width: `${haveW}%` }} />
          <div className="h-full bg-error/80" style={{ width: `${100 - haveW}%` }} />
        </div>
        {gap > 0 && (
          <p className="mt-1 text-xs font-medium text-error">{t('dream.barGap', { value: chf(gap) })}</p>
        )}
      </div>
    )
  }

  return (
    <Card title={t('dream.gapTitle')}>
      <p className="mb-4 text-sm leading-relaxed text-slate-600">
        {t('dream.gapIntro', { price: chf(dreamPrice) })}
      </p>
      <div className="space-y-4">
        <GapBar label={t('dream.gapPriceLabel')} have={currentMax} goal={dreamPrice} gap={priceGap} />
        <GapBar label={t('dream.gapEquityLabel')} have={haveEquity} goal={needEquity} gap={equityGap} />
      </div>
    </Card>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * TrajectoryChart — equity over time at three savings paces vs the required
 * line. Compact. Renders its own content (no Card) so it can live in a
 * Collapsible. The middle line tracks the user's chosen savings amount.
 * ────────────────────────────────────────────────────────────────────────── */
export function TrajectoryChart({ startEquity, requiredEquity, savingsPerMonth = 2000 }) {
  const { t } = useI18n()
  const gap = Math.max(0, requiredEquity - startEquity)
  if (gap <= 0) return null

  const scenarios = [
    { key: 'steady', perMonth: 1000, color: '#999999' },
    { key: 'more', perMonth: Math.max(50, savingsPerMonth), color: '#0d0d0d' },
    { key: 'max3a', perMonth: Math.max(50, savingsPerMonth) + PILLAR3A_MONTHLY, color: '#34a853' },
  ]
  const slowest = Math.min(...scenarios.map((s) => s.perMonth))
  const monthsSlow = Math.ceil(gap / slowest)
  const maxMonths = Math.min(360, Math.max(12, monthsSlow))
  const yMax = requiredEquity * 1.05

  const W = 320, H = 120, padL = 6, padR = 6, padT = 8, padB = 16
  const plotW = W - padL - padR, plotH = H - padT - padB
  const x = (m) => padL + (m / maxMonths) * plotW
  const y = (eq) => padT + plotH - (Math.min(eq, yMax) / yMax) * plotH
  const goalY = y(requiredEquity)

  const lines = scenarios.map((s) => {
    const endEq = startEquity + s.perMonth * maxMonths
    const cross = s.perMonth > 0 ? Math.ceil(gap / s.perMonth) : Infinity
    const crossM = cross <= maxMonths ? cross : null
    return { ...s, d: `M ${x(0)} ${y(startEquity)} L ${x(maxMonths)} ${y(endEq)}`, crossM, crossX: crossM != null ? x(crossM) : null }
  })

  const yearTicks = []
  for (let m = 0; m <= maxMonths; m += 12) yearTicks.push(m)
  const fmtDur = (m) => (m >= 24 ? t('path.durYears', { n: (m / 12).toFixed(1) }) : t('path.durMonths', { n: m }))

  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-slate-600">{t('dream.trajIntro')}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('dream.trajTitle')}>
        <line x1={padL} y1={goalY} x2={W - padR} y2={goalY} stroke="#ea4335" strokeWidth="1" strokeDasharray="4 3" />
        <text x={W - padR} y={goalY - 3} fontSize="7" fill="#ea4335" textAnchor="end">
          {t('dream.trajGoal', { value: chf(requiredEquity) })}
        </text>
        {yearTicks.map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={padT} x2={x(m)} y2={padT + plotH} stroke="#f0f0f0" strokeWidth="1" />
            <text x={x(m)} y={H - 5} fontSize="7" fill="#999" textAnchor="middle">{m / 12}y</text>
          </g>
        ))}
        {lines.map((l) => (
          <g key={l.key}>
            <path d={l.d} fill="none" stroke={l.color} strokeWidth="2" />
            {l.crossX != null && <circle cx={l.crossX} cy={goalY} r="3" fill={l.color} />}
          </g>
        ))}
      </svg>
      {/* Clear legend: which line is which, the pace, and when it reaches the goal */}
      <div className="mt-2 space-y-1">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: l.color }} />
              {t(`path.scen.${l.key}`)} · {chf(l.perMonth)}/mo
            </span>
            <span className="tabular-nums text-slate-700">
              {l.crossM != null ? t('dream.trajReaches', { time: fmtDur(l.crossM) }) : t('dream.trajBeyond')}
            </span>
          </div>
        ))}
        <p className="flex items-center gap-1.5 pt-1 text-xs text-error">
          <span className="inline-block h-0.5 w-4 rounded border-t border-dashed border-error" />
          {t('dream.trajGoalLegend', { value: chf(requiredEquity) })}
        </p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * MilestoneTable — 10-year projected equity at an editable savings pace, with
 * % of goal and cumulative est. Säule 3a tax saved. Renders its own content
 * (no Card) for use inside a Collapsible; rows scroll vertically.
 * ────────────────────────────────────────────────────────────────────────── */
export function MilestoneTable({
  startEquity, requiredEquity, savingsPerMonth = 2000, onSavingsChange, marginalTaxRatePct = 25,
}) {
  const { t } = useI18n()
  const perMonth = Math.max(0, savingsPerMonth)
  const annualTaxSaving = (RULE_CONSTANTS.PILLAR3A_MAX * marginalTaxRatePct) / 100
  const clamp = (n) => Math.min(20000, Math.max(0, Math.round(n / 50) * 50))

  const rows = []
  for (let yr = 1; yr <= 10; yr++) {
    const equity = startEquity + perMonth * 12 * yr
    rows.push({
      yr,
      equity,
      pctGoal: requiredEquity > 0 ? Math.min(1, equity / requiredEquity) : 1,
      reached: equity >= requiredEquity,
      taxSaved: annualTaxSaving * yr,
    })
  }

  return (
    <div>
      {/* Editable savings pace */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-sm text-body">{t('dream.savedPerMonth')}</label>
        <div className="flex w-32 items-center rounded-lg border border-line bg-white">
          <span className="select-none pl-2 pr-1 text-xs text-muted">CHF</span>
          <input
            type="text" inputMode="numeric"
            value={perMonth}
            onChange={(e) => onSavingsChange?.(clamp(Number(e.target.value.replace(/[^0-9]/g, '')) || 0))}
            className="w-full bg-transparent py-1.5 pr-1 text-right text-sm font-semibold tabular-nums text-ink focus:outline-none"
            aria-label={t('dream.savedPerMonth')}
          />
          <span className="select-none pr-2 text-xs text-muted">/mo</span>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">{t('dream.colYear')}</th>
              <th className="px-3 py-2 font-semibold">{t('dream.colEquity')}</th>
              <th className="px-3 py-2 font-semibold">{t('dream.colPct')}</th>
              <th className="hidden px-3 py-2 font-semibold sm:table-cell">{t('dream.col3aTax')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.yr} className={r.reached ? 'bg-positive-light/40 text-ink' : 'text-slate-700'}>
                <td className="px-3 py-2 font-medium tabular-nums">{r.yr}</td>
                <td className="px-3 py-2 tabular-nums">{chf(r.equity)}</td>
                <td className="px-3 py-2 tabular-nums">{pct(r.pctGoal)}</td>
                <td className="hidden px-3 py-2 tabular-nums sm:table-cell">{chf(Math.round(r.taxSaved))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{t('dream.milestoneNote')}</p>
    </div>
  )
}
