import { money, int } from '../../lib/format'
import {
  sizeFromBudget, measureDetails, upgradeLedger, optionNewCertified, optionBuild, efficiencyTable, DEFAULT_MEASURES,
} from '../../markets/us/home'
import { getState } from '../../markets/us/affordability'
import { ut } from '../../markets/us/copy'
import { Row } from './UsPhase1'
import { StatusPill } from './UsExplorePhase'

/**
 * US Phase 4 — three routes. UI only: figures come from src/markets/us/home.js.
 * `explore.measures` is a comma string (shared-link friendly); undefined → the
 * default upgrade plan.
 */

const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0

export function selectedUsMeasures(str) {
  if (str == null) return DEFAULT_MEASURES
  return String(str).split(',').map((s) => s.trim()).filter(Boolean)
}

function RouteCard({ id, letter, chosen, onChoose, children }) {
  const active = chosen === id
  return (
    <section className={'flex flex-col rounded-xl border bg-white p-6 shadow-sm ' + (active ? 'border-teal-700 ring-2 ring-teal-100' : 'border-slate-200')}>
      <p className="ds-eyebrow text-xs text-muted">Route {letter}</p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">{ut(`options.${id === 'new' ? 'newHome' : id}.title`)}</h2>
      <p className="mt-1 text-sm text-body">{ut(`options.${id === 'new' ? 'newHome' : id}.sub`)}</p>
      <div className="mt-4 flex-1">{children}</div>
      <button
        type="button"
        onClick={() => onChoose(id)}
        aria-pressed={active}
        className={
          'mt-5 rounded-lg px-4 py-2.5 text-sm font-bold transition ' +
          (active ? 'bg-teal-800 text-on-primary' : 'border border-line text-ink hover:border-slate-400')
        }
      >
        {active ? '✓ ' + ut('options.chosen') : ut('options.choose')}
      </button>
    </section>
  )
}

export default function UsOptionsPhase({ explore, onExploreChange, region }) {
  const budget = num(explore.budget)
  const st = region ? getState(region) : null
  const size = sizeFromBudget(region, budget)
  if (!st || !size) {
    return <p className="max-w-3xl rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500">{ut('explore.pickState')}</p>
  }
  const sqft = size.mid
  const selected = selectedUsMeasures(explore.measures)
  const details = measureDetails(region, sqft)
  const led = upgradeLedger(region, sqft, selected)
  const neu = optionNewCertified(region, budget, sqft)
  const build = optionBuild(region, sqft)
  const table = efficiencyTable(region, sqft)
  const choose = (id) => onExploreChange({ ...explore, chosenOption: id })
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    onExploreChange({ ...explore, measures: next.join(',') })
  }
  const yrs = (y) => Math.round(y)

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-base text-body">
        {ut('options.intro', { budget: money(budget), state: st.name, sqft: int(sqft) })}
      </p>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Route A — upgrade */}
        <RouteCard id="upgrade" letter="A" chosen={explore.chosenOption} onChoose={choose}>
          <h3 className="ds-eyebrow text-xs text-muted">{ut('options.measuresTitle')}</h3>
          <ul className="mt-2 space-y-1">
            {details.map((m) => {
              const on = selected.includes(m.id)
              return (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 text-sm hover:bg-surface">
                    <input type="checkbox" checked={on} onChange={() => toggle(m.id)} className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: 'var(--moss-600, #566d29)' }} />
                    <span className="min-w-0 flex-1">
                      <span className={on ? 'font-medium text-ink' : 'text-body'}>{ut(`options.measure.${m.id}`)}</span>
                      <span className="block text-xs text-muted">
                        {money(m.cost.mid)} ·{' '}
                        {m.annualSaving >= 0
                          ? ut('options.perYear', { amount: money(m.annualSaving) })
                          : ut('options.raisesBill', { amount: money(-m.annualSaving) })}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 border-t border-line pt-3">
            <Row label={ut('options.upgradeCost')} value={`${money(led.cost.low)}–${money(led.cost.high)}`} />
            <Row
              label={led.annualSaving >= 0 ? ut('options.upgradeSaves') : ut('options.upgradeAdds')}
              value={ut('options.perMonth', { amount: money(Math.abs(led.monthlySaving)) })}
            />
            <Row label={ut('options.tenYear')} value={money(led.tenYearSaving)} />
            <p className="mt-2 text-xs text-muted">
              {led.paybackYears && led.paybackYears < 40 ? ut('options.payback', { years: yrs(led.paybackYears) }) : ut('options.noPayback')}
            </p>
            {led.heatPumpRaisesBill && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{ut('options.hpWarning')}</p>
            )}
            {led.rebates.upToIfOpen > 0 && (
              <div className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs leading-relaxed text-body">
                <div className="mb-1"><StatusPill status={led.rebates.status} /></div>
                {led.rebates.status === 'open'
                  ? ut('options.rebatesOpen', { amount: money(led.rebates.upTo) })
                  : ut('options.rebatesClosed', { status: ut(`explore.status.${led.rebates.status}`).toLowerCase(), amount: money(led.rebates.upToIfOpen) })}{' '}
                <a href={led.rebates.url} target="_blank" rel="noreferrer">{ut('options.rebatesLink')}</a>
              </div>
            )}
          </div>
        </RouteCard>

        {/* Route B — new certified */}
        <RouteCard id="new" letter="B" chosen={explore.chosenOption} onChoose={choose}>
          <Row label={ut('options.newPremium')} value={`${money(neu.premium.low)}–${money(neu.premium.high)}`} />
          <Row label={ut('options.newSaves')} value={ut('options.perYear', { amount: money(neu.annualSaving) })} />
          <Row label={ut('options.tenYear')} value={money(neu.tenYearSaving)} />
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {ut('options.newResale', { low: neu.resalePremiumPct.low, high: neu.resalePremiumPct.high })}
          </p>
        </RouteCard>

        {/* Route C — build */}
        <RouteCard id="build" letter="C" chosen={explore.chosenOption} onChoose={choose}>
          <Row label={ut('options.buildCost', { low: money(build.perSqft.low), high: money(build.perSqft.high) })} value={`${money(build.cost.low)}–${money(build.cost.high)}`} />
          <Row label={ut('options.buildSoft')} value={`${money(build.softCosts.low)}–${money(build.softCosts.high)}`} />
          <Row label={ut('options.buildEfficient')} value={`${money(build.efficientPremium.low)}–${money(build.efficientPremium.high)}`} />
          <p className="mt-3 text-xs text-muted">{ut('options.buildTime', { months: Math.round(build.timelineMonths) })}</p>
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{ut('options.buildLand')}</p>
        </RouteCard>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{ut('options.compareTitle')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-3 font-medium" />
                <th className="py-2 pr-3 text-right font-medium">{ut('options.cmpUpfront')}</th>
                <th className="py-2 pr-3 text-right font-medium">{ut('options.cmpEnergy')}</th>
                <th className="py-2 text-right font-medium">{ut('options.cmpTen')}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['cmpUpgrade', `${money(led.cost.low)}–${money(led.cost.high)}`, led.afterAnnual],
                ['cmpNew', `${money(neu.premium.low)}–${money(neu.premium.high)}`, neu.certifiedAnnual],
                ['cmpBuild', `${money(build.cost.low)}–${money(build.cost.high)}`, table.rows.find((r) => r.id === 'zerh').annual],
              ].map(([key, upfront, energy]) => (
                <tr key={key} className="border-b border-line last:border-b-0">
                  <td className="py-2 pr-3 font-medium text-ink">{ut(`options.${key}`)}</td>
                  <td className="ds-figure py-2 pr-3 text-right tabular-nums text-ink">{upfront}</td>
                  <td className="ds-figure py-2 pr-3 text-right tabular-nums text-ink">{money(energy)}</td>
                  <td className="ds-figure py-2 text-right tabular-nums text-ink">{money(energy * 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
