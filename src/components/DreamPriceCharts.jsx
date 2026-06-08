import { chf, pct } from '../lib/format'
import { RULE_CONSTANTS } from '../lib/affordability'
import { useI18n } from '../i18n/I18nContext'
import { Card } from './ui'

const PILLAR3A_MONTHLY = Math.round(RULE_CONSTANTS.PILLAR3A_MAX / 12) // ≈ 605/mo

/** The three transparent savings pace presets used across the dream-price viz. */
const SCENARIOS = [
  { key: 'steady', perMonth: 1000, color: '#999999' },
  { key: 'more', perMonth: 2000, color: '#666666' },
  { key: 'max3a', perMonth: 2000 + PILLAR3A_MONTHLY, color: '#0d0d0d' },
]

/* ──────────────────────────────────────────────────────────────────────────
 * GapChart — "where you are vs where you want to be", on price and on equity.
 * ────────────────────────────────────────────────────────────────────────── */
export function GapChart({ currentMax, dreamPrice, haveEquity, needEquity }) {
  const { t } = useI18n()
  const priceScale = Math.max(dreamPrice, currentMax, 1)
  const eqScale = Math.max(needEquity, haveEquity, 1)

  const Bar2 = ({ label, value, of, suffix }) => {
    const w = Math.min(100, (value / of) * 100)
    return (
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="tabular-nums text-slate-700">
            {chf(value)} <span className="text-xs text-muted">· {pct(value / of)}{suffix}</span>
          </span>
        </div>
        <div className="h-5 w-full overflow-hidden rounded bg-slate-50">
          <div className="h-full rounded bg-ink" style={{ width: `${w}%` }} />
        </div>
      </div>
    )
  }

  return (
    <Card title={t('dream.gapTitle')}>
      <p className="mb-4 text-sm leading-relaxed text-slate-600">
        {t('dream.gapIntro', { price: chf(dreamPrice) })}
      </p>
      <div className="space-y-4">
        <Bar2 label={t('dream.gapPriceLabel')} value={currentMax} of={priceScale} suffix={` ${t('dream.ofGoal')}`} />
        <Bar2 label={t('dream.gapEquityLabel')} value={haveEquity} of={eqScale} suffix={` ${t('dream.ofGoal')}`} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {t('dream.gapNote', {
          priceGap: chf(Math.max(0, dreamPrice - currentMax)),
          eqGap: chf(Math.max(0, needEquity - haveEquity)),
        })}
      </p>
    </Card>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * TrajectoryChart — equity accumulation over time under 3 savings paces, vs the
 * required-equity line. Pure SVG, no chart library.
 * ────────────────────────────────────────────────────────────────────────── */
export function TrajectoryChart({ startEquity, requiredEquity }) {
  const { t } = useI18n()
  const gap = Math.max(0, requiredEquity - startEquity)
  if (gap <= 0) return null

  const slowest = SCENARIOS[0].perMonth
  const monthsSlow = Math.ceil(gap / slowest)
  const maxMonths = Math.min(360, Math.max(12, monthsSlow)) // cap at 30y
  const yMax = requiredEquity * 1.05

  // SVG geometry (viewBox units; rendered responsive via w-full).
  const W = 320, H = 170, padL = 8, padR = 8, padT = 10, padB = 22
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const x = (m) => padL + (m / maxMonths) * plotW
  const y = (eq) => padT + plotH - (Math.min(eq, yMax) / yMax) * plotH

  const goalY = y(requiredEquity)

  const lines = SCENARIOS.map((s) => {
    const endEq = startEquity + s.perMonth * maxMonths
    const cross = s.perMonth > 0 ? Math.ceil(gap / s.perMonth) : Infinity
    const crossM = cross <= maxMonths ? cross : null
    return {
      ...s,
      d: `M ${x(0).toFixed(1)} ${y(startEquity).toFixed(1)} L ${x(maxMonths).toFixed(1)} ${y(endEq).toFixed(1)}`,
      crossM,
      crossX: crossM != null ? x(crossM) : null,
    }
  })

  const yearTicks = []
  for (let m = 0; m <= maxMonths; m += 12) yearTicks.push(m)

  const fmtDur = (m) => (m >= 24 ? t('path.durYears', { n: (m / 12).toFixed(1) }) : t('path.durMonths', { n: m }))

  return (
    <Card title={t('dream.trajTitle')}>
      <p className="mb-3 text-sm leading-relaxed text-slate-600">{t('dream.trajIntro')}</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('dream.trajTitle')}>
        {/* goal line */}
        <line x1={padL} y1={goalY} x2={W - padR} y2={goalY} stroke="#ea4335" strokeWidth="1" strokeDasharray="4 3" />
        <text x={padL} y={goalY - 3} fontSize="8" fill="#ea4335">
          {t('dream.trajGoal', { value: chf(requiredEquity) })}
        </text>
        {/* year gridlines + labels */}
        {yearTicks.map((m) => (
          <g key={m}>
            <line x1={x(m)} y1={padT} x2={x(m)} y2={padT + plotH} stroke="#f0f0f0" strokeWidth="1" />
            <text x={x(m)} y={H - 8} fontSize="8" fill="#999" textAnchor="middle">{m / 12}y</text>
          </g>
        ))}
        {/* scenario lines + crossing markers */}
        {lines.map((l) => (
          <g key={l.key}>
            <path d={l.d} fill="none" stroke={l.color} strokeWidth="2" />
            {l.crossX != null && (
              <circle cx={l.crossX} cy={goalY} r="3" fill={l.color} />
            )}
          </g>
        ))}
      </svg>

      {/* legend + crossing times */}
      <div className="mt-2 space-y-1">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
              {t(`path.scen.${l.key}`)} · {chf(l.perMonth)}/mo
            </span>
            <span className="tabular-nums text-slate-700">
              {l.crossM != null ? fmtDur(l.crossM) : t('dream.trajBeyond')}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * MilestoneTable — year-by-year projected equity at the "save more" pace, with
 * % of goal and cumulative est. Säule 3a tax saved.
 * ────────────────────────────────────────────────────────────────────────── */
export function MilestoneTable({ startEquity, requiredEquity, marginalTaxRatePct = 25 }) {
  const { t } = useI18n()
  const gap = Math.max(0, requiredEquity - startEquity)
  if (gap <= 0) return null

  const perMonth = SCENARIOS[1].perMonth // "save more" reference pace
  const monthsToGoal = Math.ceil(gap / perMonth)
  const yearsToGoal = Math.min(15, Math.ceil(monthsToGoal / 12))
  const annualTaxSaving = (RULE_CONSTANTS.PILLAR3A_MAX * marginalTaxRatePct) / 100

  const rows = []
  for (let yr = 1; yr <= yearsToGoal; yr++) {
    const equity = Math.min(requiredEquity, startEquity + perMonth * 12 * yr)
    rows.push({
      yr,
      equity,
      pctGoal: Math.min(1, equity / requiredEquity),
      taxSaved: annualTaxSaving * yr,
    })
  }

  return (
    <Card title={t('dream.milestoneTitle')}>
      <p className="mb-3 text-sm leading-relaxed text-slate-600">
        {t('dream.milestoneIntro', { perMonth: chf(perMonth) })}
      </p>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">{t('dream.colYear')}</th>
              <th className="px-3 py-2 font-semibold">{t('dream.colEquity')}</th>
              <th className="px-3 py-2 font-semibold">{t('dream.colPct')}</th>
              <th className="hidden px-3 py-2 font-semibold sm:table-cell">{t('dream.col3aTax')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.yr} className={r.pctGoal >= 1 ? 'bg-surface text-ink' : 'text-slate-700'}>
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
    </Card>
  )
}
