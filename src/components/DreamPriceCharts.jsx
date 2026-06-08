import { useState } from 'react'
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
export function GapChart({ currentMax, dreamPrice, haveEquity, needEquity }) {
  const { t } = useI18n()
  const priceGap = Math.max(0, dreamPrice - currentMax)
  const equityGap = Math.max(0, needEquity - haveEquity)

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
export function TrajectoryChart({ startEquity, requiredEquity, savingsPerMonth = 2000, onSavingsChange }) {
  const { t } = useI18n()
  const [hoverM, setHoverM] = useState(null)
  // Bail on missing/transient/non-finite inputs. NOTE: `!(gap > 0)` not `gap <= 0`
  // — the latter is `false` for NaN, which would render NaN geometry (NaN cx/cy).
  const gap = Math.max(0, requiredEquity - startEquity)
  if (!Number.isFinite(requiredEquity) || requiredEquity <= 0 || !Number.isFinite(startEquity) || !(gap > 0)) return null
  const clampSave = (n) => Math.min(20000, Math.max(0, Math.round(n / 50) * 50))

  const scenarios = [
    { key: 'steady', perMonth: 1000, color: '#9aa0a6', width: 2 },
    { key: 'more', perMonth: Math.max(50, savingsPerMonth), color: '#0d0d0d', width: 2.6, focal: true },
    { key: 'max3a', perMonth: Math.max(50, savingsPerMonth) + PILLAR3A_MONTHLY, color: '#34a853', width: 2 },
  ]
  const slowest = Math.min(...scenarios.map((s) => s.perMonth))
  const maxMonths = Math.min(360, Math.max(12, Math.ceil(gap / slowest)))

  // Geometry. Y is capped at the goal, so each line RISES to the goal and stops
  // at its crossing point — the fan-out then matches the reach times.
  const W = 640, H = 280, padL = 10, padR = 14, padT = 26, padB = 26
  const plotW = W - padL - padR, plotH = H - padT - padB
  const baseY = padT + plotH
  const x = (m) => padL + (Math.min(m, maxMonths) / maxMonths) * plotW
  const y = (eq) => padT + plotH - (Math.min(eq, requiredEquity) / requiredEquity) * plotH
  const goalY = y(requiredEquity)
  const startY = y(startEquity)
  const eqAt = (perMonth, m) => Math.min(requiredEquity, startEquity + perMonth * m)
  const fmtDur = (m) => (m >= 24 ? t('path.durYears', { n: (m / 12).toFixed(1) }) : t('path.durMonths', { n: Math.round(m) }))

  const lines = scenarios.map((s) => {
    const crossM = Math.ceil(gap / s.perMonth)
    const reaches = crossM <= maxMonths
    const endM = reaches ? crossM : maxMonths
    return { ...s, crossM, reaches, endX: x(endM), endY: y(eqAt(s.perMonth, endM)),
      d: `M ${x(0).toFixed(1)} ${startY.toFixed(1)} L ${x(endM).toFixed(1)} ${y(eqAt(s.perMonth, endM)).toFixed(1)}` }
  })
  const more = lines.find((l) => l.focal)

  // Year gridlines — ~6 evenly spaced ticks, never cramped.
  const stepY = Math.max(1, Math.ceil(maxMonths / 12 / 6))
  const ticks = []
  for (let yr = 0; yr * 12 <= maxMonths + 0.5; yr += stepY) ticks.push(yr * 12)

  // Hover → which month the cursor is over, mapped from the plot area.
  const onMove = (clientX, el) => {
    const r = el.getBoundingClientRect()
    if (!r.width) return
    const vbX = ((clientX - r.left) / r.width) * W
    const m = ((vbX - padL) / plotW) * maxMonths
    if (!Number.isFinite(m)) return
    setHoverM(Math.min(maxMonths, Math.max(0, m)))
  }
  const hover = !Number.isFinite(hoverM) ? null : {
    leftPct: (x(hoverM) / W) * 100,
    rows: scenarios.map((s) => ({ ...s, eq: eqAt(s.perMonth, hoverM), reached: startEquity + s.perMonth * hoverM >= requiredEquity })),
  }

  const ariaSummary = scenarios.map((s) => {
    const cm = Math.ceil(gap / s.perMonth)
    return `${t(`path.scen.${s.key}`)} ${chf(s.perMonth)}/mo: ${cm <= maxMonths ? fmtDur(cm) : t('dream.trajBeyond')}`
  }).join('; ')

  return (
    <div>
      <p className="mb-3 text-sm leading-relaxed text-slate-600">{t('dream.trajIntro')}</p>

      {/* Adjustable monthly budget — drives this chart, the path, and the table */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="text-sm text-body">{t('dream.savedPerMonth')}</label>
        <div className="flex w-32 items-center rounded-lg border border-line bg-white">
          <span className="select-none pl-2 pr-1 text-xs text-muted">CHF</span>
          <input
            type="text" inputMode="numeric"
            value={Math.max(0, savingsPerMonth)}
            onChange={(e) => onSavingsChange?.(clampSave(Number(e.target.value.replace(/[^0-9]/g, '')) || 0))}
            className="w-full bg-transparent py-1.5 pr-1 text-right text-sm font-semibold tabular-nums text-ink focus:outline-none"
            aria-label={t('dream.savedPerMonth')}
          />
          <span className="select-none pr-2 text-xs text-muted">/mo</span>
        </div>
        <input
          type="range" min="0" max="6000" step="50"
          value={Math.min(6000, savingsPerMonth)}
          onChange={(e) => onSavingsChange?.(clampSave(Number(e.target.value)))}
          className="flex-1 accent-ink"
          aria-label={t('dream.savedPerMonth')}
        />
      </div>

      {/* Chart + hover tooltip */}
      <div
        className="relative"
        onMouseMove={(e) => onMove(e.clientX, e.currentTarget)}
        onMouseLeave={() => setHoverM(null)}
        onTouchMove={(e) => e.touches[0] && onMove(e.touches[0].clientX, e.currentTarget)}
        onTouchEnd={() => setHoverM(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${t('dream.trajTitle')}. ${ariaSummary}.`}>
          <defs>
            <linearGradient id="trajMoreFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d0d0d" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#0d0d0d" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* year gridlines + labels */}
          {ticks.map((m) => (
            <g key={m}>
              <line x1={x(m)} y1={padT} x2={x(m)} y2={baseY} stroke="#f1f1f1" strokeWidth="1" />
              <text x={x(m)} y={H - 8} fontSize="11" fill="#9aa0a6" textAnchor="middle">{Math.round(m / 12)}y</text>
            </g>
          ))}

          {/* "today" baseline */}
          <line x1={padL} y1={startY} x2={W - padR} y2={startY} stroke="#ebebeb" strokeWidth="1" strokeDasharray="2 3" />
          <text x={padL} y={startY - 5} fontSize="10" fill="#9aa0a6">{t('dream.trajToday', { value: chf(startEquity) })}</text>

          {/* focal area fill under the user's pace */}
          <path d={`M ${x(0)} ${startY} L ${more.endX} ${more.endY} L ${more.endX} ${baseY} L ${x(0)} ${baseY} Z`} fill="url(#trajMoreFill)" />

          {/* goal line + label */}
          <line x1={padL} y1={goalY} x2={W - padR} y2={goalY} stroke="#ea4335" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={padL} y={goalY - 8} fontSize="11" fontWeight="600" fill="#ea4335" style={{ paintOrder: 'stroke' }} stroke="#ffffff" strokeWidth="3">
            {t('dream.trajGoal', { value: chf(requiredEquity) })}
          </text>

          {/* scenario lines + end markers (reach-time label only on the focal line) */}
          {lines.map((l) => (
            <g key={l.key}>
              <path d={l.d} fill="none" stroke={l.color} strokeWidth={l.width} strokeLinecap="round" />
              <circle cx={l.endX} cy={l.endY} r="4" fill={l.color} stroke="#fff" strokeWidth="1.5" />
              {l.focal && l.reaches && (
                <text x={l.endX} y={l.endY - 9} fontSize="11" fontWeight="600" fill={l.color}
                  textAnchor={l.endX > W * 0.85 ? 'end' : 'middle'} style={{ paintOrder: 'stroke' }} stroke="#fff" strokeWidth="3">
                  {fmtDur(l.crossM)}
                </text>
              )}
            </g>
          ))}

          {/* hover guide + per-line dots */}
          {hover && (
            <g>
              <line x1={x(hoverM)} y1={padT} x2={x(hoverM)} y2={baseY} stroke="#0d0d0d" strokeOpacity="0.22" strokeWidth="1" />
              {hover.rows.map((r) => (
                <circle key={r.key} cx={x(hoverM)} cy={y(r.eq)} r="3.5" fill={r.color} stroke="#fff" strokeWidth="1.5" />
              ))}
            </g>
          )}
        </svg>

        {/* hover tooltip */}
        {hover && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-44 -translate-x-1/2 rounded-lg border border-line bg-white p-2 text-xs shadow-md"
            style={{ left: `${Math.min(86, Math.max(14, hover.leftPct))}%` }}
          >
            <p className="mb-1 font-semibold text-ink">{t('dream.trajHoverTitle', { time: fmtDur(hoverM) })}</p>
            {hover.rows.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-2 py-0.5">
                <span className="inline-flex items-center gap-1.5 text-body">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />
                  {t(`path.scen.${r.key}`)}
                </span>
                <span className="tabular-nums text-ink">{chf(r.eq)}{r.reached ? ' ✓' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend — line, pace, and when it reaches the goal */}
      <div className="mt-3 space-y-1.5">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="inline-block h-1 w-5 rounded-full" style={{ background: l.color }} />
              <span className="font-medium">{t(`path.scen.${l.key}`)}</span>
              <span className="text-muted">· {chf(l.perMonth)}/mo</span>
            </span>
            <span className="tabular-nums font-medium text-slate-700">
              {l.reaches ? t('dream.trajReaches', { time: fmtDur(l.crossM) }) : t('dream.trajBeyond')}
            </span>
          </div>
        ))}
        <p className="flex items-center gap-2 pt-1 text-xs text-error">
          <span className="inline-block w-5 border-t border-dashed border-error" />
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
