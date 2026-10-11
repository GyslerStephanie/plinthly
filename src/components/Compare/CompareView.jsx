import { useState, useMemo, useEffect } from 'react'
import AdvisorFab from '../AdvisorFab'
import { buildCompareAdvisorContext } from '../../lib/advisorContext'
import * as chModel from '../../lib/compare/model'
import * as usModel from '../../markets/us/compare'
import { useMarket } from '../../markets/MarketContext'
import { ut } from '../../markets/us/copy'
import { getState } from '../../markets/us/affordability'

// Chart helpers below are market-agnostic; both models project 25 years.
const MAX_YEARS = chModel.MAX_YEARS
import { money, groupDigits, currencySymbol } from '../../lib/format'
import { useI18n } from '../../i18n/I18nContext'
import { useDialogFocus } from '../../lib/useDialogFocus'
import GlossaryTerm from '../GlossaryTerm'
import HowItWorks from '../HowItWorks'
import { compareCourse } from '../../lib/learn'

// One colour per option, the SAME on every tab so nothing swaps meaning when you
// switch scenarios. No red — neither line is inherently "bad" (renting isn't a
// loss; owning cost buys equity), and red misreads as a loss on the winning line.
const RENT = '#4f7d88' // path A — renting / renting+investing / waiting to buy (calm blue)
const OWN = '#566d29' //  path B — owning / buying / buying now (moss green)
// Compact "92k" amounts for charts and the table, in the active market's
// currency: "CHF 92k" in Switzerland, "$92k" in the US.
const fK = (v) => {
  const sym = currencySymbol()
  return `${v < 0 ? '−' : ''}${sym}${sym.length > 1 ? ' ' : ''}${Math.round(Math.abs(v) / 1000).toLocaleString('en-US')}k`
}

const HALO = { paintOrder: 'stroke', stroke: 'var(--paper-100)', strokeWidth: 3 }

/** Hand-rolled net-worth-over-time chart (SVG, matching the app's chart style):
 *  soft area fills, both trajectories, and value tags at the scrubbed year. */
function TrajectoryChart({ A, B, year, labelA, labelB }) {
  const W = 600
  const H = 200
  const padL = 8
  const padR = 8
  const padT = 18
  const padB = 20
  let max = 1
  let min = 0
  for (let k = 1; k <= MAX_YEARS; k++) {
    max = Math.max(max, A[k], B[k])
    min = Math.min(min, A[k], B[k])
  }
  const x = (k) => padL + ((k - 1) / (MAX_YEARS - 1)) * (W - padL - padR)
  const y = (v) => H - padB - ((v - min) / (max - min || 1)) * (H - padB - padT)
  const pts = (arr) => Array.from({ length: MAX_YEARS }, (_, i) => `${x(i + 1)},${y(arr[i + 1])}`).join(' ')
  const area = (arr) => `${x(1)},${y(min)} ${pts(arr)} ${x(MAX_YEARS)},${y(min)}`
  const anchor = x(year) > W * 0.82 ? 'end' : x(year) < W * 0.18 ? 'start' : 'middle'
  const aHigh = A[year] >= B[year]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${labelA} vs ${labelB} over time`}>
      <polygon points={area(B)} fill={OWN} opacity="0.06" />
      <polygon points={area(A)} fill={RENT} opacity="0.1" />
      <line x1={padL} y1={y(Math.max(0, min))} x2={W - padR} y2={y(Math.max(0, min))} stroke="var(--line)" strokeWidth="1" />
      <polyline points={pts(B)} fill="none" stroke={OWN} strokeWidth="2.5" strokeDasharray="6 4" />
      <polyline points={pts(A)} fill="none" stroke={RENT} strokeWidth="2.5" />
      <line x1={x(year)} y1={padT - 6} x2={x(year)} y2={H - padB} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx={x(year)} cy={y(A[year])} r="4.5" fill={RENT} stroke="var(--paper-100)" strokeWidth="1.5" />
      <circle cx={x(year)} cy={y(B[year])} r="4.5" fill={OWN} stroke="var(--paper-100)" strokeWidth="1.5" />
      <text x={x(year)} y={y(A[year]) + (aHigh ? -9 : 16)} textAnchor={anchor} fontSize="11" fontWeight="500" fill={RENT} style={HALO}>{fK(A[year])}</text>
      <text x={x(year)} y={y(B[year]) + (aHigh ? 16 : -9)} textAnchor={anchor} fontSize="11" fontWeight="500" fill={OWN} style={HALO}>{fK(B[year])}</text>
      {[1, 5, 10, 15, 20, 25].map((k) => (
        <text key={k} x={x(k)} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--text-faint)">
          {k}
        </text>
      ))}
    </svg>
  )
}

/** The gap between the two paths, as a signed area over time. Above the zero line
 *  path A leads (blue), below it path B leads (green); where the band crosses zero
 *  the two are even (break-even). Clip-paths split the fill at zero, so a crossing
 *  needs no special-casing. */
function DifferenceStrip({ A, B, year }) {
  const W = 600
  const H = 76
  const padL = 8
  const padR = 8
  const padT = 14
  const padB = 14
  const D = Array.from({ length: MAX_YEARS }, (_, i) => A[i + 1] - B[i + 1])
  let hi = 0
  let lo = 0
  for (const v of D) {
    hi = Math.max(hi, v)
    lo = Math.min(lo, v)
  }
  if (hi === lo) hi = 1
  const x = (k) => padL + ((k - 1) / (MAX_YEARS - 1)) * (W - padL - padR)
  const y = (v) => H - padB - ((v - lo) / (hi - lo)) * (H - padB - padT)
  const y0 = y(0)
  const dPts = D.map((v, i) => `${x(i + 1)},${y(v)}`).join(' ')
  const areaPts = `${x(1)},${y0} ${dPts} ${x(MAX_YEARS)},${y0}`
  const dY = D[year - 1]
  const anchor = x(year) > W * 0.82 ? 'end' : x(year) < W * 0.18 ? 'start' : 'middle'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Difference between the two options over time">
      <defs>
        <clipPath id="gapAbove"><rect x="0" y="0" width={W} height={Math.max(0, y0)} /></clipPath>
        <clipPath id="gapBelow"><rect x="0" y={y0} width={W} height={Math.max(0, H - y0)} /></clipPath>
      </defs>
      <polygon points={areaPts} fill={RENT} opacity="0.22" clipPath="url(#gapAbove)" />
      <polygon points={areaPts} fill={OWN} opacity="0.22" clipPath="url(#gapBelow)" />
      <polyline points={dPts} fill="none" stroke="var(--ink-300)" strokeWidth="1.25" />
      <line x1={padL} y1={y0} x2={W - padR} y2={y0} stroke="var(--line-strong)" strokeWidth="1" />
      <line x1={x(year)} y1={padT - 6} x2={x(year)} y2={H - padB} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 3" />
      <circle cx={x(year)} cy={y(dY)} r="4" fill={dY >= 0 ? RENT : OWN} stroke="var(--paper-100)" strokeWidth="1.5" />
      <text x={x(year)} y={y(dY) + (dY >= 0 ? -8 : 15)} textAnchor={anchor} fontSize="11" fontWeight="600" fill={dY >= 0 ? RENT : OWN} style={HALO}>{fK(dY)}</text>
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
// Assumption fields that have a glossary entry get a "?" explainer.
const TERM_FOR = {
  cash: 'liquid_cash',
  investReturnPct: 'investment_return',
  appreciationPct: 'property_appreciation',
  rentInflationPct: 'rent_inflation',
  downPaymentPct: 'down_payment',
  propertyTaxPct: 'property_tax',
  insurancePct: 'homeowners_insurance',
}

function PctField({ label, sub, value, onChange, termId }) {
  const [txt, setTxt] = useState(String(value))
  useEffect(() => {
    setTxt((prev) => (parseFloat(prev) === value ? prev : String(value)))
  }, [value])
  return (
    <label className="block text-xs text-muted">
      <span>
        {label}
        {termId && <GlossaryTerm id={termId} icon term={label} />}
        {sub && <span className="ml-1 text-faint">· {sub}</span>}
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

export default function CompareView({ onClose, seed = {}, seedYear, region }) {
  const { t: tBase, lang } = useI18n()
  const { marketId } = useMarket()
  const isUs = marketId === 'us'
  // Same screen, two models: the US engine has its own scenarios and costs.
  const { SCENARIOS, COMPARE_DEFAULTS, computeSeries, MAX_YEARS, COMPARE_METHODOLOGY } = isUs ? usModel : chModel
  // US copy overrides the Swiss compare.* strings where the meaning differs.
  const t = (key, vars) => {
    if (isUs && key.startsWith('compare.')) {
      const v = ut(key, vars)
      if (v !== key) return v
    }
    return tBase(key, vars)
  }
  const usState = isUs && region ? getState(region) : null
  // Read-only view with a visible back button — Escape has nothing to discard.
  const dialogRef = useDialogFocus({ onClose })
  const [scenario, setScenario] = useState('rent_vs_buy')
  // Onboarding can seed the default time horizon from the user's duration answer.
  const [year, setYear] = useState(() =>
    seedYear ? Math.max(5, Math.min(MAX_YEARS, seedYear)) : 10,
  )
  const [inputs, setInputs] = useState({
    ...COMPARE_DEFAULTS,
    // US: property tax and insurance default to the chosen state's rates.
    ...(usState ? { propertyTaxPct: usState.property_tax_rate_pct, insurancePct: usState.insurance_rate_pct } : {}),
    ...Object.fromEntries(Object.entries(seed).filter(([, v]) => v != null)),
  })

  const scnMeta = SCENARIOS.find((s) => s.id === scenario)
  const isRentBuy = scenario === 'rent_vs_buy'
  const trueCost = isRentBuy && !!inputs.trueCost
  // Invest return drives the true-cost opportunity charge too, so un-grey it there.
  const investActive = scnMeta.usesInvest || trueCost
  const s = useMemo(() => computeSeries(scenario, inputs), [scenario, inputs])

  const a = s.A[year]
  const b = s.B[year]
  const diff = a - b
  const labelA = t(`compare.h.${s.hA}`)
  const labelB = t(`compare.h.${s.hB}`)
  // Plain-language verb phrases for the headline, plus full (rounded) figures.
  const winA = t(`compare.win.${s.hA}`)
  const winB = t(`compare.win.${s.hB}`)
  const round1k = (v) => money(Math.round(Math.abs(v) / 1000) * 1000)

  let story
  if (s.costLens) {
    const rentCheaper = a < b
    story = t('compare.storyCost', {
      winner: rentCheaper ? winA : winB,
      loser: rentCheaper ? winB : winA,
      n: year,
      amount: round1k(a - b),
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
    const aAhead = diff >= 0
    story = t('compare.storyWealth', {
      winner: aAhead ? winA : winB,
      loser: aAhead ? winB : winA,
      amount: round1k(diff),
      n: year,
      cross,
    })
  }

  // breakdown table rows 1..year
  let maxAbs = 1
  for (let k = 1; k <= year; k++) maxAbs = Math.max(maxAbs, Math.abs(s.A[k] - s.B[k]))

  const setVal = (key, n) => setInputs((p) => ({ ...p, [key]: n }))
  const setCash = (key) => (e) => setInputs((p) => ({ ...p, [key]: numFrom(e.target.value) }))
  const cashField = (key, label) => (
    <label className="block text-xs text-muted">
      {label}
      {TERM_FOR[key] && <GlossaryTerm id={TERM_FOR[key]} icon term={label} />}
      <div className={`mt-1 ${FIELD}`}>
        <span className="select-none pl-2.5 pr-1 text-xs text-faint">{currencySymbol()}</span>
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
    <PctField label={label} sub={sub} value={inputs[key]} onChange={(n) => setVal(key, n)} termId={TERM_FOR[key]} />
  )

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-surface-page"
      style={{ background: 'var(--surface-page)' }}
    >
      <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
        <button
          type="button"
          onClick={onClose}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
        >
          ← {t('compare.back')}
        </button>

        <h1 id="compare-title" className="font-display text-3xl font-semibold tracking-tight text-ink">{t('compare.title')}</h1>
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
                  'flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm transition ' +
                  (on
                    ? 'border-teal-600 bg-teal-50 font-medium text-teal-800 shadow-sm'
                    : 'border-line bg-white text-muted hover:border-stone-400 hover:text-body')
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

        {/* True-cost lens toggle (Rent vs Buy only) — Cash cost vs incl. opportunity cost */}
        {isRentBuy && (
          <div className="mt-4">
            <div className="inline-flex overflow-hidden rounded-lg border border-line bg-white">
              {[['lensCash', false], ['lensTrue', true]].map(([k, on]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={trueCost === on}
                  onClick={() => setInputs((p) => ({ ...p, trueCost: on }))}
                  className={
                    'px-4 py-1.5 text-sm transition ' +
                    (trueCost === on ? 'bg-teal-700 font-medium text-white' : 'text-muted hover:text-body')
                  }
                >
                  {t(`compare.${k}`)}
                </button>
              ))}
            </div>
            <GlossaryTerm id="opportunity_cost" icon term={t('compare.lensTrue')} />
            {trueCost && <p className="mt-1.5 text-xs text-faint">{t('compare.lensHint')}</p>}
          </div>
        )}

        {/* Key takeaway */}
        <div className="mt-4 rounded-xl border border-line bg-white p-5 shadow-sm">
          <p className="ds-eyebrow text-xs text-faint">★ {t('compare.takeaway')} · {t(`compare.scn.${scenario}`)}</p>
          <p className="mt-2 text-base leading-relaxed text-body" dangerouslySetInnerHTML={{ __html: story }} />
          <p className="mt-4 text-xs text-faint">{t(s.costLens ? 'compare.metricsCost' : 'compare.metricsWealth', { n: year })}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-3">
            <Metric label={labelA} value={money(a)} accent={RENT} />
            <Metric label={labelB} value={money(b)} accent={OWN} />
            <Metric label={t('compare.diff')} value={fK(diff)} />
          </div>
        </div>

        {/* Wealth-view bridge — carries the opportunity-cost figure to Save + Invest.
            NOTE: round1k() drops the sign, and the copy asserts investing wins. That
            holds only while investReturn > appreciation (the default). If a user sets
            appreciation above their return, opp goes negative (owning wins) but the
            line still reads "investing earned more" — reword sign-aware if we surface it. */}
        {isRentBuy && (
          <button
            type="button"
            onClick={() => setScenario('save_invest')}
            className="mt-3 flex w-full items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-left text-sm text-teal-900 transition hover:border-teal-300"
          >
            <span aria-hidden="true">💡</span>
            <span dangerouslySetInnerHTML={{ __html: t('compare.bridge', { amount: `<b>${round1k(s.opp[year])}</b>` }) }} />
            <span className="ml-auto whitespace-nowrap font-medium text-teal-700">{t('compare.bridgeGo')}</span>
          </button>
        )}

        <div className="mt-4">
          <HowItWorks course={compareCourse(isUs ? 'us' : 'ch')} />
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
          <div className={'mt-3 rounded-lg bg-surface p-3 ' + (investActive ? '' : 'opacity-50')}>
            {pct('investReturnPct', t('compare.sInvest'), t('compare.sInvestSub'))}
            {investActive ? (
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

          {isUs ? (
            <>
              <p className="ds-eyebrow mt-5 text-xs text-muted">{t('compare.grpCosts')}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {pct('propertyTaxPct', t('compare.fTax'))}
                {pct('insurancePct', t('compare.fIns'))}
              </div>
            </>
          ) : (
          <>
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
          </>
          )}

          <p className="ds-eyebrow mt-5 text-xs text-muted">{t('compare.grpStructure')}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pct('downPaymentPct', t('compare.fDown'))}
            {pct('maintenancePct', t('compare.fMaint'))}
          </div>
          <p className="mt-2 text-xs text-faint">{t('compare.structureHint')}</p>
        </details>

        {/* Breakdown */}
        <details open className="mt-4 rounded-xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">{t('compare.breakdown')}</summary>
          <div className="mt-3 flex gap-4 text-xs text-muted">
            <Legend color={RENT} label={labelA} />
            <Legend color={OWN} label={labelB} dashed />
          </div>
          <p className="mt-1 text-xs text-faint">{t(`compare.cap.${scenario}`)}</p>
          <div className="mt-2">
            <TrajectoryChart A={s.A} B={s.B} year={year} labelA={labelA} labelB={labelB} />
          </div>

          <p className="ds-eyebrow mt-4 text-xs text-muted">{t('compare.gap')}</p>
          <p className="text-xs text-faint">
            {t('compare.gapCap', { a: labelA, b: labelB })}
          </p>
          <div className="mt-1.5">
            <DifferenceStrip A={s.A} B={s.B} year={year} />
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="ds-eyebrow border-b border-line text-[10px] text-faint">
                  <th className="py-2 pr-2 text-left font-medium">{t('compare.colYear')}</th>
                  {s.incCol && <th className="px-2 py-2 text-right font-medium">{t('compare.colIncome')}</th>}
                  <th className="px-2 py-2 text-right font-medium">{labelA}</th>
                  <th className="px-2 py-2 text-right font-medium">{labelB}</th>
                  <th className="px-2 py-2 text-right font-medium">{t('compare.diff')}</th>
                </tr>
              </thead>
              <tbody className="ds-figure">
                {Array.from({ length: year }, (_, i) => i + 1).map((k) => {
                  const d = s.A[k] - s.B[k]
                  const w = Math.max(2, (Math.abs(d) / maxAbs) * 48)
                  const hl = k === year
                  return (
                    <tr key={k} className={'border-b border-line/60 ' + (hl ? 'bg-teal-50/70' : '')}>
                      <td className={'py-1.5 pr-2 text-left ' + (hl ? 'border-l-2 border-teal-600 pl-2 font-semibold text-ink' : 'text-muted')}>{k}</td>
                      {s.incCol && <td className="px-2 py-1.5 text-right text-body">{money(inputs.income * Math.pow(1 + inputs.incomeGrowthPct / 100, k - 1))}</td>}
                      <td className="px-2 py-1.5 text-right text-ink">{money(s.A[k])}</td>
                      <td className="px-2 py-1.5 text-right text-ink">{money(s.B[k])}</td>
                      <td className="px-2 py-1.5 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          {/* Colour the gap by the line that's ahead, not red/green — keeps the
                              buy line's meaning intact in the wealth lens (blue, not "loss"). */}
                          <span style={{ color: d >= 0 ? RENT : OWN }}>{fK(d)}</span>
                          <span className="inline-block h-2 rounded" style={{ width: w, background: d >= 0 ? RENT : OWN }} />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {scenario === 'buy_cheaper' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted">{t('compare.cheaperAt')}</span>
              <div className={`${FIELD} w-24`}>
                <input
                  inputMode="numeric"
                  aria-label={t('compare.cheaperAt')}
                  value={inputs.cheaperPricePct}
                  onChange={(e) => setVal('cheaperPricePct', Math.min(100, Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0))}
                  className="ds-figure w-full bg-transparent py-2 pl-3 text-right text-sm text-ink focus:outline-none"
                />
              </div>
              <span className="text-xs text-faint">{t('compare.cheaperUnit')}</span>
            </div>
          )}

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

      {/* The advisor, mounted INSIDE the overlay. Compare is `fixed inset-0
          z-50`, so an instance rendered by App would be painted over; `inline`
          lifts this one above it. It gets the Compare toolset, so it answers
          from the scenario model rather than the Phase 1 engine. */}
      {!isUs && <AdvisorFab
        surface="compare"
        inline
        context={buildCompareAdvisorContext(scenario, inputs, year, { a, b, hA: s.hA, hB: s.hB, costLens: s.costLens }, lang)}
        compare={{ scenario, inputs, year }}
        onApplyScenario={(overrides) => {
          // Same discipline as Phase 1: the chat only ever previews, and this is
          // the one path that writes to the dashboard the user is reading.
          const { scenarioId, year: nextYear, ...rest } = overrides
          if (scenarioId) setScenario(scenarioId)
          if (nextYear) setYear(nextYear)
          if (Object.keys(rest).length) setInputs((p) => ({ ...p, ...rest }))
        }}
      />}
    </div>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        {accent && <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />}
        {label}
      </p>
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
