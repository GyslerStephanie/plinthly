import { useMemo, useState } from 'react'
import { chf, int, pct, groupDigits } from '../lib/format'
import { DEFAULT_MARKET_RATE } from '../lib/affordability'
import {
  mortgagePayoff,
  PAYOFF_MAX_YEARS,
  RETIREMENT_AGE,
  RETIREMENT_INCOME_FRACTION,
} from '../lib/mortgagePayoff'
import { useI18n } from '../i18n/I18nContext'
import { T } from './Trans'
import Collapsible from './Collapsible'

const TEAL = '#0d9488' // balance line
const INK = 'var(--line-strong)'
const numFrom = (v) => Number(String(v).replace(/[^0-9.]/g, '')) || 0

/** Small compact CHF field matching the app's input idiom. */
function CashField({ label, sub, value, onChange, suffix }) {
  return (
    <label className="block text-xs text-muted">
      <span>
        {label}
        {sub && <span className="ml-1 text-faint">— {sub}</span>}
      </span>
      <div className="mt-1 flex items-center rounded-lg border border-line bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
        <span className="select-none pl-2.5 pr-1 text-xs text-faint">CHF</span>
        <input
          inputMode="numeric"
          value={groupDigits(String(value))}
          onChange={(e) => onChange(numFrom(e.target.value))}
          className="ds-figure w-full bg-transparent py-2 pr-2 text-right text-sm text-ink focus:outline-none"
        />
        {suffix && <span className="select-none pr-2.5 text-xs text-faint">{suffix}</span>}
      </div>
    </label>
  )
}

/** Mortgage-balance-over-time chart (SVG, matching the app's chart style). */
function BalanceChart({ model, displayYears }) {
  const { t } = useI18n()
  const W = 600
  const H = 216
  const padL = 46 // room for the CHF balance scale on the y-axis
  const padR = 12
  const padT = 20
  const padB = 36 // room for year ticks + the "Years" axis title
  const N = Math.max(1, displayYears)
  const sched = model.schedule
  const balanceAt = (k) => (k < sched.length ? sched[k].balance : 0)
  const max = model.startBalance || 1
  const x = (k) => padL + (k / N) * (W - padL - padR)
  const y = (v) => H - padB - (v / max) * (H - padB - padT)
  const pts = Array.from({ length: N + 1 }, (_, k) => `${x(k)},${y(balanceAt(k))}`).join(' ')
  const area = `${x(0)},${y(0)} ${pts} ${x(N)},${y(0)}`

  const ret = model.retirement
  const retIn = ret && ret.year <= N
  const payIn = model.payoffYear != null && model.payoffYear <= N
  const ticks = [0, Math.round(N / 4), Math.round(N / 2), Math.round((3 * N) / 4), N]
  const hasFloor = model.mTarget < max
  // Compact CHF scale label, e.g. 960000 → "960k".
  const kfmt = (v) => (v >= 1000 ? `${int(Math.round(v / 1000))}k` : int(Math.round(v)))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t('payoff.chartLabel')}>
      {/* y-axis: outstanding balance scale (CHF) */}
      <text x={padL - 6} y={padT - 7} fontSize="9" textAnchor="end" fill="var(--text-muted)">CHF</text>
      <text x={padL - 6} y={y(max) + 3} fontSize="10" textAnchor="end" fill="var(--text-faint)">{kfmt(max)}</text>
      {hasFloor && (
        <text x={padL - 6} y={y(model.mTarget) + 3} fontSize="10" textAnchor="end" fill="var(--text-faint)">{kfmt(model.mTarget)}</text>
      )}
      <text x={padL - 6} y={y(0) + 3} fontSize="10" textAnchor="end" fill="var(--text-faint)">0</text>

      {/* 66.7% amortization floor */}
      {hasFloor && (
        <>
          <line x1={padL} y1={y(model.mTarget)} x2={W - padR} y2={y(model.mTarget)} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          <text x={W - padR} y={y(model.mTarget) - 4} fontSize="10" textAnchor="end" fill="var(--text-faint)">
            {t('payoff.floorLabel', { pct: pct(model.mTargetLtv, 0) })}
          </text>
        </>
      )}
      {/* Balance trajectory */}
      <polygon points={area} fill={TEAL} opacity="0.08" />
      <line x1={padL} y1={y(0)} x2={W - padR} y2={y(0)} stroke="var(--line)" strokeWidth="1" />
      <polyline points={pts} fill="none" stroke={TEAL} strokeWidth="2.5" />
      {/* Retirement marker */}
      {retIn && (
        <>
          <line x1={x(ret.year)} y1={padT - 6} x2={x(ret.year)} y2={H - padB} stroke={INK} strokeWidth="1" strokeDasharray="3 3" />
          <text x={x(ret.year)} y={padT - 8} fontSize="10" textAnchor="middle" fill="var(--text-faint)">
            {t('payoff.retireMarker')}
          </text>
        </>
      )}
      {/* Payoff marker */}
      {payIn && (
        <>
          <circle cx={x(model.payoffYear)} cy={y(0)} r="4.5" fill={TEAL} stroke="var(--paper-100)" strokeWidth="1.5" />
          <text x={x(model.payoffYear)} y={y(0) - 8} fontSize="10" textAnchor="middle" fontWeight="600" fill={TEAL}>
            {t('payoff.payoffMarker')}
          </text>
        </>
      )}
      {/* x-axis: year ticks + unit title */}
      {ticks.map((k, i) => (
        <text key={i} x={x(k)} y={H - padB + 15} fontSize="10" textAnchor="middle" fill="var(--text-faint)">
          {k}
        </text>
      ))}
      <text x={(padL + (W - padR)) / 2} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--text-muted)">
        {t('payoff.axisYears')}
      </text>
    </svg>
  )
}

function Metric({ label, value, sub, tone }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={'ds-figure mt-0.5 text-base ' + (tone === 'faint' ? 'text-faint' : 'text-ink')}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-faint">{sub}</p>}
    </div>
  )
}

/**
 * "Mortgage over time" — the payoff panel attached to the Phase 1 / Phase 2
 * result. Reads the mortgage already computed upstream and lets the user layer
 * voluntary extra repayments on top of the mandatory Swiss amortization, see the
 * debt-free year, the interest cost/saving, and whether the loan still passes
 * the bank's ⅓-income test after retirement.
 */
export default function MortgagePayoffPanel({ price, mortgage, income = 0 }) {
  const { t } = useI18n()
  const [extra, setExtra] = useState(0)
  const [rate, setRate] = useState(DEFAULT_MARKET_RATE)
  const [age, setAge] = useState(40)
  const [retIncome, setRetIncome] = useState(() =>
    income > 0 ? Math.round((income * RETIREMENT_INCOME_FRACTION) / 1000) * 1000 : 0,
  )

  const model = useMemo(
    () =>
      mortgagePayoff({
        price,
        mortgage,
        rate,
        extraMonthly: extra,
        currentAge: age,
        retirementAge: RETIREMENT_AGE,
        retirementIncome: retIncome,
      }),
    [price, mortgage, rate, extra, age, retIncome],
  )

  if (!model) return null

  const ret = model.retirement
  const desired = Math.max(model.payoffYear ?? 25, ret ? ret.year + 1 : 0, model.mandatoryDoneYear ?? 0)
  const displayYears = Math.min(PAYOFF_MAX_YEARS, Math.max(10, desired))
  const horizonRow = model.schedule[Math.min(displayYears, model.schedule.length - 1)]
  const interestOverHorizon = horizonRow?.cumInterest ?? model.totalInterest

  const sub = model.payoffYear != null
    ? t('payoff.subPayoff', { y: model.payoffYear })
    : t('payoff.subFloor')

  return (
    <Collapsible title={t('payoff.title')} sub={sub}>
      <T as="p" className="-mt-1 mb-4 text-sm leading-relaxed text-slate-600" k="payoff.intro" />

      <BalanceChart model={model} displayYears={displayYears} />

      {/* Four read-outs — the four things this answers */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Metric
          label={t('payoff.mAmortDone')}
          value={model.mandatoryDoneYear != null ? t('payoff.yearVal', { y: model.mandatoryDoneYear }) : t('payoff.none')}
          sub={model.mandatoryDoneYear == null ? t('payoff.noneSub') : t('payoff.mAmortSub')}
        />
        <Metric
          label={t('payoff.debtFree')}
          value={
            model.payoffYear == null
              ? t('payoff.never')
              : model.payoffAge
                ? t('payoff.yearAgeVal', { y: model.payoffYear, age: model.payoffAge })
                : t('payoff.yearVal', { y: model.payoffYear })
          }
          tone={model.payoffYear == null ? 'faint' : undefined}
          sub={model.payoffYear == null ? t('payoff.neverSub') : undefined}
        />
        <Metric
          label={t('payoff.totalInterest')}
          value={chf(interestOverHorizon)}
          sub={t('payoff.totalInterestSub', { y: displayYears, rate: pct(rate, 1) })}
        />
        <Metric
          label={t('payoff.interestSaved')}
          value={model.interestSaved > 0 ? chf(model.interestSaved) : '—'}
          tone={model.interestSaved > 0 ? undefined : 'faint'}
          sub={model.interestSaved > 0 ? t('payoff.interestSavedSub') : t('payoff.interestSavedOff')}
        />
      </div>

      {/* Extra repayment slider — the debt-free lever */}
      <div className="mt-5">
        <div className="flex items-center justify-between">
          <label htmlFor="payoffExtra" className="text-sm font-medium text-slate-700">
            {t('payoff.extraLabel')} <span className="font-normal text-faint">— {t('payoff.extraSub')}</span>
          </label>
          <span className="tabular-nums text-sm font-semibold text-teal-700">
            {extra > 0 ? `${chf(extra)}/mo` : t('payoff.extraOff')}
          </span>
        </div>
        <input
          id="payoffExtra"
          type="range"
          min="0"
          max="3000"
          step="50"
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="mt-2 w-full accent-teal-600"
        />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {[0, 500, 1000, 2000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setExtra(v)}
              className={'rounded-full border px-2.5 py-0.5 text-xs transition ' + (extra === v ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-line bg-white text-muted')}
            >
              {v === 0 ? t('payoff.extraNone') : `${int(v)}`}
            </button>
          ))}
        </div>
      </div>

      {/* Market rate — reuses the "what you'd really pay" convention */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label htmlFor="payoffRate" className="text-sm font-medium text-slate-700">
            {t('result.rateLabel')}
          </label>
          <span className="tabular-nums text-sm font-semibold text-teal-700">{pct(rate, 1)}</span>
        </div>
        <input
          id="payoffRate"
          type="range"
          min="1"
          max="6"
          step="0.1"
          value={(rate * 100).toFixed(1)}
          onChange={(e) => setRate(Number(e.target.value) / 100)}
          className="mt-2 w-full accent-teal-600"
        />
      </div>

      {/* Retirement inputs + re-test */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="block text-xs text-muted">
          {t('payoff.ageLabel')}
          <div className="mt-1 flex items-center rounded-lg border border-line bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
            <input
              inputMode="numeric"
              value={age || ''}
              onChange={(e) => setAge(Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0)}
              className="ds-figure w-full bg-transparent py-2 pl-3 text-right text-sm text-ink focus:outline-none"
            />
            <span className="select-none px-2.5 text-xs text-faint">{t('payoff.yearsUnit')}</span>
          </div>
        </label>
        <CashField
          label={t('payoff.retIncomeLabel')}
          sub={t('payoff.retIncomeSub')}
          value={retIncome}
          onChange={setRetIncome}
          suffix="/yr"
        />
      </div>

      {ret ? (
        <div
          className={
            'mt-4 rounded-lg border-l-4 p-3 text-sm leading-relaxed ' +
            (ret.affordable ? 'border-l-positive bg-positive-light/40 text-teal-900' : 'border-l-amber-500 bg-warning-light text-amber-900')
          }
        >
          <p className="font-semibold">{t('payoff.retTitle')}</p>
          <p className="mt-1">
            {t(ret.affordable ? 'payoff.retOk' : 'payoff.retTight', {
              age: ret.retirementAge,
              income: chf(ret.income),
              ratio: pct(ret.ratio, 0),
              ceiling: pct(0.333, 0),
              cost: chf(Math.round(ret.housingCost / 12)),
            })}
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-surface p-3 text-xs leading-relaxed text-faint">
          {t('payoff.retNeedInputs')}
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-faint">{t('payoff.disclaimer')}</p>
    </Collapsible>
  )
}
