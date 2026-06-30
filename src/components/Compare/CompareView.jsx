import { useState, useMemo, useEffect } from 'react'
import {
  computeSeries,
  SCENARIOS,
  COMPARE_DEFAULTS,
  COMPARE_METHODOLOGY,
  MAX_YEARS,
} from '../../lib/compare/model'
import { chf, groupDigits } from '../../lib/format'
import { useI18n } from '../../i18n/I18nContext'

const MOSS = '#566d29' // path A — rent / rent+invest
const CORAL = '#c4452f' // path B — own / buy
const fK = (v) => `${v < 0 ? '−' : ''}CHF ${Math.round(Math.abs(v) / 1000).toLocaleString('en-US')}k`

/** Hand-rolled net-worth-over-time chart (SVG, matching the app's chart style). */
function TrajectoryChart({ A, B, year, labelA, labelB }) {
  const W = 600
  const H = 190
  const padL = 8
  const padB = 18
  let max = 1
  let min = 0
  for (let k = 1; k <= MAX_YEARS; k++) {
    max = Math.max(max, A[k], B[k])
    min = Math.min(min, A[k], B[k])
  }
  const x = (k) => padL + ((k - 1) / (MAX_YEARS - 1)) * (W - padL * 2)
  const y = (v) => H - padB - ((v - min) / (max - min || 1)) * (H - padB - 6)
  const line = (arr) =>
    Array.from({ length: MAX_YEARS }, (_, i) => `${x(i + 1)},${y(arr[i + 1])}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${labelA} vs ${labelB} over time`}>
      <line x1={padL} y1={H - padB} x2={W - padL} y2={H - padB} stroke="var(--line)" strokeWidth="1" />
      <polyline points={line(A)} fill="none" stroke={MOSS} strokeWidth="2.5" />
      <polyline points={line(B)} fill="none" stroke={CORAL} strokeWidth="2.5" strokeDasharray="6 4" />
      <line x1={x(year)} y1={2} x2={x(year)} y2={H - padB} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx={x(year)} cy={y(A[year])} r="4" fill={MOSS} />
      <circle cx={x(year)} cy={y(B[year])} r="4" fill={CORAL} />
      {[1, 5, 10, 15, 20, 25].map((k) => (
        <text key={k} x={x(k)} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--text-faint)">
          {k}
        </text>
      ))}
    </svg>
  )
}

const FIELD =
  'flex items-center rounded-lg border border-line bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100'
const numFrom = (v) => Number(String(v).replace(/[^0-9.]/g, '')) || 0

/**
 * Percent input field matching the app's down-payment field. Keeps a local
 * string while editing so decimals ("1.5") and a leading "−" type cleanly,
 * and re-syncs when the numeric value changes externally (e.g. a preset click).
 */
function PctField({ label, sub, value, onChange }) {
  const [txt, setTxt] = useState(String(value))
  useEffect(() => {
    setTxt((prev) => (parseFloat(prev) === value ? prev : String(value)))
  }, [value])
  return (
    <label className="block text-xs text-muted">
      <span>
        {label}
        {sub && <span className="ml-1 text-faint">— {sub}</span>}
      </span>
      <div className={`mt-1 ${FIELD}`}>
        <input
          inputMode="decimal"
          value={txt}
          onChange={(e) => {
            const v = e.target.value
            if (!/^-?\d*\.?\d*$/.test(v)) return
            setTxt(v)
            const n = parseFloat(v)
            if (!Number.isNaN(n)) onChange(n)
          }}
          className="ds-figure w-full bg-transparent py-2 pl-3 text-right text-sm text-ink focus:outline-none"
        />
        <span className="select-none px-3 text-sm text-faint">%</span>
      </div>
    </label>
  )
}

export default function CompareView({ onClose, seed = {} }) {
  const { t } = useI18n()
  const [scenario, setScenario] = useState('rent_vs_buy')
  const [year, setYear] = useState(10)
  const [inputs, setInputs] = useState({
    ...COMPARE_DEFAULTS,
    ...Object.fromEntries(Object.entries(seed).filter(([, v]) => v != null)),
  })

  const scnMeta = SCENARIOS.find((s) => s.id === scenario)
  const s = useMemo(() => computeSeries(scenario, inputs), [scenario, inputs])

  const a = s.A[year]
  const b = s.B[year]
  const diff = a - b
  const labelA = t(`compare.h.${s.hA}`)
  const labelB = t(`compare.h.${s.hB}`)

  let story
  if (s.costLens) {
    story = t('compare.storyCost', {
      winner: a < b ? labelA : labelB,
      n: year,
      amount: fK(Math.abs(a - b)),
    })
  } else {
    let cross = t('compare.noCross')
    const sign1 = s.A[1] >= s.B[1]
    for (let k = 2; k <= MAX_YEARS; k++) {
      if (s.A[k] >= s.B[k] !== sign1) {
        cross = t('compare.crossAt', { y: k })
        break
      }
    }
    story = t('compare.storyWealth', { winner: diff >= 0 ? labelA : labelB, amount: fK(Math.abs(diff)), n: year, cross })
  }

  // breakdown table rows 1..year
  let maxAbs = 1
  for (let k = 1; k <= year; k++) maxAbs = Math.max(maxAbs, Math.abs(s.A[k] - s.B[k]))

  const setVal = (key, n) => setInputs((p) => ({ ...p, [key]: n }))
  const setCash = (key) => (e) => setInputs((p) => ({ ...p, [key]: numFrom(e.target.value) }))
  const cashField = (key, label) => (
    <label className="block text-xs text-muted">
      {label}
      <div className={`mt-1 ${FIELD}`}>
        <span className="select-none pl-2.5 pr-1 text-xs text-faint">CHF</span>
        <input
          inputMode="numeric"
          value={groupDigits(String(inputs[key]))}
          onChange={setCash(key)}
          className="ds-figure w-full bg-transparent py-2 pr-2.5 text-right text-sm text-ink focus:outline-none"
        />
      </div>
    </label>
  )
  const pct = (key, label, sub) => (
    <PctField label={label} sub={sub} value={inputs[key]} onChange={(n) => setVal(key, n)} />
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface-page" style={{ background: 'var(--surface-page)' }}>
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <button
          type="button"
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
        >
          ← {t('compare.back')}
        </button>

        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{t('compare.title')}</h1>
        <p className="mt-2 text-sm text-muted">{t('compare.intro')}</p>

        {/* Scenario tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          {SCENARIOS.map((sc, i) => {
            const on = sc.id === scenario
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setScenario(sc.id)}
                className={
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ' +
                  (on ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-line bg-white text-muted hover:border-stone-400')
                }
              >
                <span className={'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ' + (on ? 'bg-teal-700 text-white' : 'bg-surface text-faint')}>{i + 1}</span>
                {t(`compare.scn.${sc.id}`)}
              </button>
            )
          })}
        </div>

        {/* Time horizon — the scrubber (signature "explore over time" control) */}
        <div className="mt-4 rounded-xl border border-line bg-surface px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="ds-eyebrow text-xs text-muted">{t('compare.horizon')}</span>
            <span className="ds-figure text-2xl text-ink">{t('compare.years', { n: year })}</span>
          </div>
          <input
            type="range"
            min="5"
            max="25"
            step="1"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="ds-range mt-3"
            style={{ '--val': `${((year - 5) / 20) * 100}%` }}
            aria-label={t('compare.horizon')}
          />
          <div className="mt-2 flex justify-between">
            {[5, 10, 15, 20, 25].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={
                  'ds-figure text-[11px] tabular-nums transition ' +
                  (year === y ? 'font-semibold text-ink' : 'text-faint hover:text-muted')
                }
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Key takeaway */}
        <div className="mt-4 rounded-xl border border-line bg-white p-5 shadow-sm">
          <p className="ds-eyebrow text-xs text-faint">★ {t('compare.takeaway')} · {t(`compare.scn.${scenario}`)}</p>
          <p className="mt-2 text-base leading-relaxed text-body" dangerouslySetInnerHTML={{ __html: story }} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Metric label={labelA} value={chf(a)} />
            <Metric label={labelB} value={chf(b)} />
            <Metric label={t('compare.diff')} value={fK(diff)} />
          </div>
        </div>

        {/* Assumptions */}
        <details open className="mt-4 rounded-xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">{t('compare.assume')}</summary>
          <p className="mt-2 text-xs text-faint">{t('compare.assumeCaption')}</p>

          <p className="ds-eyebrow mt-4 text-xs text-muted">{t('compare.grpKnow')}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {cashField('income', t('compare.fIncome'))}
            {cashField('cash', t('compare.fCash'))}
            {cashField('rentMonthly', t('compare.fRent'))}
            {cashField('price', t('compare.fPrice'))}
            {cashField('savingMonthly', t('compare.fSave'))}
          </div>

          <p className="ds-eyebrow mt-5 text-xs text-muted">
            {t('compare.grpFuture')} <span className="ml-1 font-normal normal-case tracking-normal text-faint">{t('compare.grpFutureTag')}</span>
          </p>
          <div className={'mt-3 rounded-lg bg-surface p-3 ' + (scnMeta.usesInvest ? '' : 'opacity-50')}>
            {pct('investReturnPct', t('compare.sInvest'), t('compare.sInvestSub'))}
            {scnMeta.usesInvest ? (
              <>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[['presetCautious', 2], ['presetBalanced', 4], ['presetGrowth', 6]].map(([k, v]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setInputs((p) => ({ ...p, investReturnPct: v }))}
                      className={'rounded-full border px-2.5 py-0.5 text-xs transition ' + (inputs.investReturnPct === v ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-line bg-white text-muted')}
                    >
                      {t(`compare.${k}`)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-faint">{t('compare.investHint')}</p>
              </>
            ) : (
              <p className="mt-2 text-xs italic text-faint">{t('compare.investOff')}</p>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pct('mortgageRatePct', t('compare.sRate'))}
            <div>{pct('appreciationPct', t('compare.sAppr'))}<p className="mt-0.5 text-xs text-faint">{t('compare.apprHint')}</p></div>
            {pct('rentInflationPct', t('compare.sInfl'))}
            {pct('incomeGrowthPct', t('compare.sIncg'))}
          </div>

          <p className="ds-eyebrow mt-5 text-xs text-muted">{t('compare.grpTax')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[['old', 'regimeOld'], ['new', 'regimeNew']].map(([val, k]) => (
              <button
                key={val}
                type="button"
                onClick={() => setInputs((p) => ({ ...p, regime: val }))}
                className={'rounded-lg border px-3 py-1.5 text-xs transition ' + (inputs.regime === val ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-line bg-white text-muted')}
              >
                {t(`compare.${k}`)}
              </button>
            ))}
            <div className="min-w-[140px]">{pct('marginalTaxPct', t('compare.sTax'))}</div>
          </div>
        </details>

        {/* Breakdown */}
        <details open className="mt-4 rounded-xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">{t('compare.breakdown')}</summary>
          <div className="mt-3 flex gap-4 text-xs text-muted">
            <Legend color={MOSS} label={labelA} />
            <Legend color={CORAL} label={labelB} dashed />
          </div>
          <p className="mt-1 text-xs text-faint">{t(`compare.cap.${scenario}`)}</p>
          <div className="mt-2">
            <TrajectoryChart A={s.A} B={s.B} year={year} labelA={labelA} labelB={labelB} />
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-1.5 pr-2 text-left font-medium">{t('compare.colYear')}</th>
                  {s.incCol && <th className="px-2 py-1.5 text-right font-medium">{t('compare.colIncome')}</th>}
                  <th className="px-2 py-1.5 text-right font-medium">{labelA}</th>
                  <th className="px-2 py-1.5 text-right font-medium">{labelB}</th>
                  <th className="px-2 py-1.5 text-right font-medium">{t('compare.diff')}</th>
                </tr>
              </thead>
              <tbody className="ds-figure">
                {Array.from({ length: year }, (_, i) => i + 1).map((k) => {
                  const d = s.A[k] - s.B[k]
                  const w = Math.max(2, (Math.abs(d) / maxAbs) * 48)
                  return (
                    <tr key={k} className={'border-b border-line/60 ' + (k === year ? 'bg-teal-50' : '')}>
                      <td className="py-1.5 pr-2 text-left">{k}</td>
                      {s.incCol && <td className="px-2 py-1.5 text-right">{chf(inputs.income * Math.pow(1 + inputs.incomeGrowthPct / 100, k - 1))}</td>}
                      <td className="px-2 py-1.5 text-right">{chf(s.A[k])}</td>
                      <td className="px-2 py-1.5 text-right">{chf(s.B[k])}</td>
                      <td className="px-2 py-1.5 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          {fK(d)}
                          <span className="inline-block h-2 rounded" style={{ width: w, background: d >= 0 ? MOSS : CORAL }} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {scenario === 'buy_later' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted">{t('compare.buyIn')}</span>
              <div className={`${FIELD} w-24`}>
                <input
                  inputMode="numeric"
                  value={inputs.buyInYear}
                  onChange={(e) => setVal('buyInYear', Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0)}
                  className="ds-figure w-full bg-transparent py-2 pl-3 text-right text-sm text-ink focus:outline-none"
                />
                <span className="select-none px-2 text-xs text-faint">yr</span>
              </div>
            </div>
          )}
        </details>

        <p className="mt-4 text-xs leading-relaxed text-faint">{t('compare.disclaimer', { v: COMPARE_METHODOLOGY })}</p>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="ds-figure mt-0.5 text-base text-ink">{value}</p>
    </div>
  )
}

function Legend({ color, label, dashed }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block" style={{ width: 14, height: 0, borderTop: `3px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
      {label}
    </span>
  )
}
