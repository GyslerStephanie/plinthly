import { useState } from 'react'
import { money, groupDigits } from '../../lib/format'
import { dreamPlan, payoffMilestones } from '../../markets/us/dream'
import { US_RULES } from '../../markets/us/affordability'
import { ut } from '../../markets/us/copy'
import { MoneyInput, Row, usInput } from './UsPhase1'
import CompareCta from '../CompareCta'

/**
 * US Phase 2 — dream price. UI only: every figure comes from
 * src/markets/us/dream.js (which runs the US engine and payoff schedule).
 */

const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0
const pct1 = (f) => Math.round(f * 1000) / 10

export default function UsDreamPhase({ values, dreamPrice, onDreamPriceChange, onCompare }) {
  const [extra, setExtra] = useState('')
  const input = usInput(values)
  const plan = dreamPlan(input, num(dreamPrice), { extraMonthly: num(extra) })
  const rules = { front: Math.round(US_RULES.FRONT_END * 100), back: Math.round(US_RULES.BACK_END * 100) }

  return (
    <div className="space-y-6">
      <section className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="us-dream" className="mb-1.5 block text-sm font-semibold text-ink">
          {ut('dream.priceLabel')}
        </label>
        <MoneyInput id="us-dream" value={dreamPrice} onChange={(v) => onDreamPriceChange(groupDigits(v))} />
        <p className="mt-1.5 text-xs text-muted">{ut('dream.priceHint')}</p>
      </section>

      {!plan ? (
        <p className="max-w-xl rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500">{ut('dream.empty')}</p>
      ) : (
        <>
          <Verdict plan={plan} rules={rules} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Progress plan={plan} />
            <Monthly plan={plan} />
          </div>
          {plan.savingsScenarios.length > 0 && <Savings plan={plan} />}
          <Payoff plan={plan} extra={extra} onExtra={setExtra} />
          {onCompare && <CompareCta onCompare={onCompare} />}
        </>
      )}
    </div>
  )
}

function Verdict({ plan, rules }) {
  const c = plan.check
  const tests = [
    ['cash', c.cash.ok, ut('dream.tests.cashDetail', { need: money(c.cash.needed), have: money(c.cash.have) })],
    ['front_end', c.frontEnd.ok, ut('dream.tests.ratioDetail', { ratio: pct1(c.frontEnd.ratio) })],
    ['back_end', c.backEnd.ok, ut('dream.tests.ratioDetail', { ratio: pct1(c.backEnd.ratio) })],
  ]
  const L = plan.levers
  const levers = [
    L.saveMore && ut('dream.lever.saveMore', { amount: money(L.saveMore) }),
    L.earnMore && ut('dream.lever.earnMore', { amount: money(Math.ceil(L.earnMore / 1000) * 1000) }),
    L.cutDebt && ut('dream.lever.cutDebt', { amount: money(L.cutDebt) }),
    L.lowerDown &&
      (L.lowerDown.passes
        ? ut('dream.lever.lowerDownPass', { pct: L.lowerDown.downPct, monthly: money(L.lowerDown.monthly) })
        : ut('dream.lever.lowerDownFail', { pct: L.lowerDown.downPct })),
    L.aimFor && ut('dream.lever.aimFor', { amount: money(L.aimFor) }),
  ]
    .filter(Boolean)
    // The copy reads as alternatives ("Or …"); the first one shouldn't.
    .map((l, i) => (i === 0 ? l.replace(/^Or (\w)/, (_, c) => c.toUpperCase()) : l))

  return (
    <section
      className={
        'rounded-xl border p-6 shadow-sm ' +
        (plan.reachable ? 'border-teal-200 bg-teal-50/60' : 'border-amber-200 bg-amber-50')
      }
    >
      <h2 className={'text-xl font-semibold ' + (plan.reachable ? 'text-teal-900' : 'text-amber-900')}>
        {ut(plan.reachable ? 'dream.reachable' : 'dream.outOfReach', { price: money(plan.price) })}
      </h2>
      <p className="mt-1 text-sm text-body">{ut(plan.reachable ? 'dream.reachableBody' : 'dream.outOfReachBody')}</p>

      <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        {tests.map(([key, ok, detail]) => (
          <li key={key} className="rounded-lg border border-line bg-card px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{ut(`dream.tests.${key}`, rules)}</span>
              <span
                className={
                  'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                  (ok ? 'bg-teal-50 text-teal-800' : 'bg-amber-100 text-amber-900')
                }
              >
                {ok ? '✓ ' + ut('dream.tests.pass') : '✕ ' + ut('dream.tests.fail')}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </li>
        ))}
      </ul>

      {!plan.reachable && levers.length > 0 && (
        <>
          <h3 className="ds-eyebrow mt-5 text-xs text-amber-900">{ut('dream.leversTitle')}</h3>
          <ul className="mt-2 space-y-1.5">
            {levers.map((l, i) => (
              <li key={i} className="flex gap-2 text-sm text-body">
                <span className="text-amber-700" aria-hidden="true">→</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function Bar({ label, sub, frac }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <span className="ds-figure text-sm tabular-nums text-ink">{Math.round(frac * 100)}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${label}: ${Math.round(frac * 100)}%`}>
        <div className="h-3 rounded-full bg-teal-600" style={{ width: `${Math.round(frac * 100)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">{sub}</p>
    </div>
  )
}

function Progress({ plan }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="ds-eyebrow text-xs text-muted">{ut('dream.progressTitle')}</h3>
      <div className="mt-4 space-y-5">
        <Bar
          label={ut('dream.progressPrice')}
          sub={ut('dream.progressPriceSub', { max: money(plan.maxPriceToday), price: money(plan.price) })}
          frac={plan.progress.price}
        />
        <Bar
          label={ut('dream.progressCash')}
          sub={
            plan.cash.gap > 0
              ? ut('dream.progressCashSub', { have: money(plan.cash.have), need: money(plan.cash.needed) })
              : ut('dream.progressCashCovered', { have: money(plan.cash.have), need: money(plan.cash.needed) })
          }
          frac={plan.progress.cash}
        />
      </div>
    </section>
  )
}

function Monthly({ plan }) {
  const m = plan.monthly
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="ds-eyebrow text-xs text-muted">{ut('dream.monthlyTitle', { price: money(plan.price) })}</h3>
      <div className="mt-2">
        <Row label={ut('result.pi')} value={money(m.principalAndInterest)} />
        <Row label={ut('result.tax')} value={money(m.propertyTax)} />
        <Row label={ut('result.insurance')} value={money(m.insurance)} />
        {m.pmi > 0 && <Row label={ut('result.pmi')} value={money(m.pmi)} />}
        {m.hoa > 0 && <Row label={ut('result.hoa')} value={money(m.hoa)} />}
        <Row label={ut('result.total')} value={`${money(m.total)}/mo`} strong />
      </div>
      <p className="mt-2 text-xs text-muted">{ut('result.maintenance', { amount: money(m.maintenance) })}</p>
      {plan.flags.jumbo && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          {ut('result.jumbo', { limit: money(plan.flags.conformingBaseline), high: money(plan.flags.conformingHighCost) })}
        </p>
      )}
    </section>
  )
}

function Savings({ plan }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="ds-eyebrow text-xs text-muted">{ut('dream.savingsTitle')}</h3>
      <p className="mt-2 text-sm text-body">{ut('dream.savingsBody', { gap: money(plan.cash.gap) })}</p>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {plan.savingsScenarios.map((s) => (
          <li key={s.perMonth} className="rounded-lg border border-line bg-surface px-4 py-3">
            <p className="text-xs text-muted">{ut('dream.savingsRow', { amount: money(s.perMonth) })}</p>
            <p className="ds-figure mt-1 text-lg font-medium text-ink">{ut('dream.months', { n: s.months })}</p>
            {s.months >= 18 && <p className="text-xs text-muted">{ut('dream.years', { n: Math.round((s.months / 12) * 10) / 10 })}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Payoff({ plan, extra, onExtra }) {
  const p = plan.payoff
  if (!p) return null
  const rows = payoffMilestones(p)
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="ds-eyebrow text-xs text-muted">{ut('dream.payoffTitle')}</h3>
      <p className="mt-2 text-sm text-body">
        {ut('dream.payoffBody', { loan: money(plan.monthly.loan), rate: Math.round(plan.monthly.rate * 10000) / 100 })}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <Row label={ut('dream.monthlyPI')} value={money(p.monthlyPayment)} />
          <Row label={ut('dream.totalInterest')} value={money(p.totalInterest)} />
          <Row
            label={ut('dream.pmiEnds')}
            value={p.pmiMonthly > 0 && p.pmiEndMonth ? ut('dream.pmiEndsValue', { years: Math.round((p.pmiEndMonth / 12) * 10) / 10 }) : ut('dream.pmiNone')}
          />
          {p.pmiMonthly > 0 && p.pmiCancelMonth > 0 && (
            <Row label={ut('dream.pmiCancel')} value={ut('dream.pmiEndsValue', { years: Math.round((p.pmiCancelMonth / 12) * 10) / 10 })} />
          )}
          <div className="mt-4">
            <label htmlFor="us-extra" className="mb-1.5 block text-sm font-semibold text-ink">{ut('dream.extraLabel')}</label>
            <MoneyInput id="us-extra" value={extra} onChange={onExtra} suffix="/mo" />
            <p className="mt-1.5 text-xs text-muted">{ut('dream.extraHint')}</p>
            {p.extraMonthly > 0 && p.interestSaved > 0 && (
              <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
                {ut('dream.extraSaves', {
                  extra: money(p.extraMonthly),
                  interest: money(p.interestSaved),
                  years: Math.round((p.monthsSaved / 12) * 10) / 10,
                })}
              </p>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-3 font-medium">{ut('dream.tableYear')}</th>
                <th className="py-2 pr-3 text-right font-medium">{ut('dream.tableBalance')}</th>
                <th className="py-2 text-right font-medium">{ut('dream.tableEquity')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.year} className="border-b border-line last:border-b-0">
                  <td className="py-2 pr-3 tabular-nums text-body">{r.year}</td>
                  <td className="ds-figure py-2 pr-3 text-right tabular-nums text-ink">{money(r.balance)}</td>
                  <td className="ds-figure py-2 text-right tabular-nums text-ink">{money(plan.price - r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
