import { money, groupDigits, currencySymbol } from '../../lib/format'
import {
  calculateAffordability,
  affordabilityState,
  stateOptions,
  getState,
  DEFAULT_RATE,
  US_RULES,
} from '../../markets/us/affordability'
import { ut } from '../../markets/us/copy'

/**
 * US Phase 1 — "Can I buy?" on the US engine. UI only: every number comes from
 * src/markets/us/affordability.js. Layout mirrors the Swiss Phase 1: inputs
 * left, live result right.
 */

const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0
const pct1 = (f) => `${Math.round(f * 1000) / 10}`

export const US_DEFAULT_VALUES = {
  grossIncome: '',
  savings: '',
  monthlyDebts: '',
  downPct: String(Math.round(US_RULES.DEFAULT_DOWN * 100)),
  region: '',
  ratePct: String(Math.round(DEFAULT_RATE.rate * 10000) / 100),
  hoaMonthly: '',
}

/** Engine input from the form's string values. */
export function usInput(values) {
  return {
    grossIncome: num(values.grossIncome),
    savings: num(values.savings),
    monthlyDebts: num(values.monthlyDebts),
    downPct: num(values.downPct) || undefined,
    state: values.region || undefined,
    rate: num(values.ratePct) ? num(values.ratePct) / 100 : undefined,
    hoaMonthly: num(values.hoaMonthly),
  }
}

/** Phase 1 result; null until there's enough to compute. */
export function usResult(values) {
  if (!num(values.grossIncome) || !num(values.savings)) return null
  return calculateAffordability(usInput(values))
}

export default function UsPhase1({ values, onChange }) {
  const result = usResult(values)
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
        <h2 className="mb-5 text-lg font-bold text-slate-900">{ut('form.title')}</h2>
        <UsForm values={values} onChange={onChange} />
      </div>
      <div className="lg:sticky lg:top-6 lg:self-start">
        {result ? (
          <UsResult result={result} />
        ) : (
          <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
            {ut('result.empty')}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

export const inputBox =
  'flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100'
export const inputEl = 'w-full min-w-0 bg-transparent px-3 py-2.5 text-right text-sm tabular-nums text-ink outline-none'

export function MoneyInput({ id, value, onChange, suffix }) {
  return (
    <div className={inputBox}>
      <span className="select-none pl-3 pr-2 text-sm text-slate-400">{currencySymbol()}</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={groupDigits(value)}
        onChange={(e) => onChange(groupDigits(e.target.value))}
        className={inputEl}
      />
      {suffix && <span className="select-none pr-3 text-sm text-slate-400">{suffix}</span>}
    </div>
  )
}

function UsForm({ values, onChange }) {
  const set = (key) => (v) => onChange({ ...values, [key]: v })
  const st = values.region ? getState(values.region) : null
  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <Field id="us-income" label={ut('form.income')} hint={ut('form.incomeHint')}>
        <MoneyInput id="us-income" value={values.grossIncome} onChange={set('grossIncome')} />
      </Field>
      <Field id="us-savings" label={ut('form.savings')} hint={ut('form.savingsHint')}>
        <MoneyInput id="us-savings" value={values.savings} onChange={set('savings')} />
      </Field>
      <Field id="us-debts" label={ut('form.debts')} hint={ut('form.debtsHint')}>
        <MoneyInput id="us-debts" value={values.monthlyDebts} onChange={set('monthlyDebts')} suffix="/mo" />
      </Field>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="us-down" label={ut('form.down')} hint={ut('form.downHint')}>
          <div className={inputBox}>
            <input
              id="us-down"
              type="number"
              min={US_RULES.MIN_DOWN * 100}
              max={90}
              step={1}
              value={values.downPct}
              onChange={(e) => set('downPct')(e.target.value)}
              className={inputEl}
            />
            <span className="select-none pr-3 text-sm text-slate-400">%</span>
          </div>
        </Field>
        <Field id="us-rate" label={ut('form.rate')} hint={ut('form.rateHint', { date: DEFAULT_RATE.asOf })}>
          <div className={inputBox}>
            <input
              id="us-rate"
              type="number"
              min={1}
              max={15}
              step={0.05}
              value={values.ratePct}
              onChange={(e) => set('ratePct')(e.target.value)}
              className={inputEl}
            />
            <span className="select-none pr-3 text-sm text-slate-400">%</span>
          </div>
        </Field>
      </div>
      <Field
        id="us-state"
        label={ut('form.state')}
        hint={
          st
            ? ut('form.stateHint', { price: money(st.median_price_usd), tax: st.property_tax_rate_pct, ins: st.insurance_rate_pct })
            : null
        }
      >
        <select
          id="us-state"
          value={values.region}
          onChange={(e) => set('region')(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        >
          <option value="">—</option>
          {stateOptions.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </Field>
      <Field id="us-hoa" label={ut('form.hoa')} hint={ut('form.hoaHint')}>
        <MoneyInput id="us-hoa" value={values.hoaMonthly} onChange={set('hoaMonthly')} suffix="/mo" />
      </Field>
      <p className="text-xs text-slate-400">{ut('form.live')}</p>
    </form>
  )
}

const STATUS_STYLE = {
  not_viable: 'bg-amber-50 text-amber-900',
  tight: 'bg-amber-50 text-amber-900',
  comfortable: 'bg-teal-50 text-teal-800',
  qualifies: 'bg-teal-50 text-teal-800',
}

export function Row({ label, value, strong }) {
  return (
    <div className={'flex items-baseline justify-between gap-4 py-1.5 text-sm ' + (strong ? 'border-t border-line pt-2.5 font-semibold text-ink' : 'text-body')}>
      <span>{label}</span>
      <span className="ds-figure tabular-nums text-ink">{value}</span>
    </div>
  )
}

function UsResult({ result: r }) {
  const state = affordabilityState(r)
  const ruleVars = { front: r.rules.frontEndPct, back: r.rules.backEndPct }
  const dp = r.downPaymentBreakdown
  const mc = r.monthlyCosts
  const LIMITS = [
    ['cash', r.constraints.cashMaxPrice],
    ['front_end', r.constraints.frontEndMaxPrice],
    ['back_end', r.constraints.backEndMaxPrice],
  ]
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{ut('result.eyebrow')}</p>
          <span className={'rounded-full px-2.5 py-1 text-xs font-semibold ' + STATUS_STYLE[state]}>
            ● {ut(`result.status.${state}`)}
          </span>
        </div>
        <p className="ds-figure mt-3 text-5xl font-medium tracking-tight text-ink">{money(r.maxPrice)}</p>
        <p className="mt-3 text-base leading-relaxed text-ink">{ut(`result.headline.${r.limit}`, ruleVars)}</p>
        {!r.viable && r.shortfall && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {ut('result.notViable', { target: money(r.shortfall.targetPrice) })}{' '}
            {r.shortfall.type === 'equity'
              ? ut('result.gapCash', { gap: money(Math.ceil(r.shortfall.savingsGap / 1000) * 1000) })
              : ut('result.gapIncome', { gap: money(Math.ceil(r.shortfall.incomeGap / 1000) * 1000) })}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="ds-eyebrow text-xs text-muted">{ut('result.limitsTitle')}</h3>
        <ul className="mt-3 space-y-2">
          {LIMITS.map(([key, price]) => {
            const binding = key === r.limit
            return (
              <li
                key={key}
                className={'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ' + (binding ? 'bg-teal-50 font-semibold text-ink' : 'text-body')}
              >
                <span>
                  {ut(`result.limits.${key}`, ruleVars)}
                  {binding && <span className="ml-2 rounded-full bg-teal-800 px-2 py-0.5 text-[11px] font-semibold text-on-primary">{ut('result.binding')}</span>}
                </span>
                <span className="ds-figure tabular-nums">{money(price)}</span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {ut('result.dti', { stretch: r.rules.backEndStretchPct, max: r.rules.backEndMaxPct, back: r.rules.backEndPct })}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="ds-eyebrow text-xs text-muted">{ut('result.upfrontTitle')}</h3>
        <div className="mt-2">
          <Row label={ut('result.downPayment', { pct: r.rules.downPct })} value={money(dp.total)} />
          <Row label={ut('result.closing', { pct: r.rules.closingCostsPct })} value={money(dp.closingCosts)} />
          <Row label={ut('result.cashTotal')} value={money(dp.cashNeeded)} strong />
          <Row label={ut('result.loan')} value={money(dp.mortgage)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="ds-eyebrow text-xs text-muted">{ut('result.monthlyTitle')}</h3>
        <div className="mt-2">
          <Row label={ut('result.pi')} value={money(mc.principalAndInterest)} />
          <Row label={ut('result.tax')} value={money(mc.propertyTax)} />
          <Row label={ut('result.insurance')} value={money(mc.insurance)} />
          {mc.pmi > 0 && <Row label={ut('result.pmi')} value={money(mc.pmi)} />}
          {mc.hoa > 0 && <Row label={ut('result.hoa')} value={money(mc.hoa)} />}
          <Row label={ut('result.total')} value={`${money(mc.total)}/mo`} strong />
        </div>
        <p className="mt-3 text-sm text-body">
          {ut('result.ratios', { housing: pct1(r.ratios.housing), debt: pct1(r.ratios.debt) })}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">{ut('result.maintenance', { amount: money(mc.maintenance) })}</p>
        {r.flags.pmi && (
          <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-body">
            {ut('result.pmiNote', { rate: r.flags.pmiRatePct })}
          </p>
        )}
        {r.flags.jumbo && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {ut('result.jumbo', { limit: money(r.flags.conformingBaseline), high: money(r.flags.conformingHighCost) })}
          </p>
        )}
      </section>
    </div>
  )
}
