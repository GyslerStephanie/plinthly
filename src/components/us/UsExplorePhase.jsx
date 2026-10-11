import { money, int, groupDigits } from '../../lib/format'
import { sizeFromBudget, efficiencyTable, homeData } from '../../markets/us/home'
import { stateOptions, getState } from '../../markets/us/affordability'
import { ut } from '../../markets/us/copy'
import { MoneyInput } from './UsPhase1'

/**
 * US Phase 3 — "What should I look for?". UI only: every figure comes from
 * src/markets/us/home.js over us-home-data.json.
 */

const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0

const STATUS_STYLE = {
  open: 'bg-teal-50 text-teal-800',
  waitlist: 'bg-amber-50 text-amber-900',
  paused: 'bg-amber-50 text-amber-900',
  not_launched: 'bg-slate-100 text-slate-600',
  unclear: 'bg-slate-100 text-slate-600',
}

export function StatusPill({ status }) {
  return (
    <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + (STATUS_STYLE[status] || STATUS_STYLE.unclear)}>
      {ut(`explore.status.${status}`)}
    </span>
  )
}

function Card({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {title && <h2 className="mb-4 text-lg font-bold text-slate-900">{title}</h2>}
      {children}
    </section>
  )
}

export default function UsExplorePhase({ explore, onExploreChange, region, onRegionChange }) {
  const budget = num(explore.budget)
  const st = region ? getState(region) : null
  const size = sizeFromBudget(region, budget)
  const table = size ? efficiencyTable(region, size.mid) : null
  const sh = region ? homeData.states[region] : null

  return (
    <div className="space-y-6">
      <section className="grid max-w-3xl grid-cols-1 gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <label htmlFor="us-budget" className="mb-1.5 block text-sm font-semibold text-ink">{ut('explore.budget')}</label>
          <MoneyInput id="us-budget" value={explore.budget} onChange={(v) => onExploreChange({ ...explore, budget: groupDigits(v) })} />
          <p className="mt-1.5 text-xs text-muted">{ut('explore.budgetHint')}</p>
        </div>
        <div>
          <label htmlFor="us-explore-state" className="mb-1.5 block text-sm font-semibold text-ink">{ut('explore.state')}</label>
          <select
            id="us-explore-state"
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            <option value="">—</option>
            {stateOptions.map((s) => (
              <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </section>

      {!st ? (
        <p className="max-w-3xl rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500">{ut('explore.pickState')}</p>
      ) : (
        <>
          {size && (
            <Card title={ut('explore.buysTitle', { budget: money(budget), state: st.name })}>
              <p className="ds-figure text-3xl font-medium text-ink">{ut('explore.buysRange', { low: int(size.low), high: int(size.high) })}</p>
              <p className="mt-1 text-sm text-body">{ut('explore.buysMid', { mid: int(size.mid) })}</p>
              <p className="mt-3 text-xs text-muted">
                {ut('explore.buysNote', { low: money(size.pricePerSqft.low), high: money(size.pricePerSqft.high), mid: money(size.pricePerSqft.mid) })}
              </p>
            </Card>
          )}

          {table && (
            <Card title={ut('explore.energyTitle')}>
              <p className="text-sm text-body">{ut('explore.energyIntro', { sqft: int(size.mid), state: st.name })}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="py-2 pr-3 font-medium">{ut('explore.colRating')}</th>
                      <th className="py-2 pr-3 text-right font-medium">{ut('explore.colHers')}</th>
                      <th className="py-2 pr-3 text-right font-medium">{ut('explore.colYear')}</th>
                      <th className="py-2 text-right font-medium">{ut('explore.colTen')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((r) => (
                      <tr key={r.id} className={'border-b border-line last:border-b-0 ' + (r.id === 'energyStar' ? 'bg-teal-50/60' : '')}>
                        <td className="py-2 pr-3 text-body">{r.label}</td>
                        <td className="ds-figure py-2 pr-3 text-right tabular-nums text-ink">{r.hers}</td>
                        <td className="ds-figure py-2 pr-3 text-right tabular-nums text-ink">{money(r.annual)}</td>
                        <td className="ds-figure py-2 text-right tabular-nums font-medium text-ink">{money(r.tenYear)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
                {ut('explore.energyDelta', { annual: money(table.annualSaving), ten: money(table.tenYearSaving) })}
              </p>
              <p className="mt-2 text-xs text-muted">{ut('explore.energyNote')}</p>
            </Card>
          )}

          <Card title={ut('explore.incentivesTitle', { state: st.name })}>
            <div className="space-y-5">
              <div>
                <h3 className="ds-eyebrow text-xs text-muted">{ut('explore.federal')}</h3>
                <p className="mt-1 text-sm text-body">{homeData.federal_incentives.summary}</p>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="ds-eyebrow text-xs text-muted">{ut('explore.ira')}</h3>
                  <StatusPill status={sh.ira_rebates.status} />
                </div>
                <p className="mt-1 text-sm text-body">
                  <a href={sh.ira_rebates.url} target="_blank" rel="noreferrer" className="font-medium">{sh.ira_rebates.program}</a> — {sh.ira_rebates.note}
                </p>
              </div>
              <div>
                <h3 className="ds-eyebrow text-xs text-muted">{ut('explore.utility')}</h3>
                <ul className="mt-1 space-y-1.5">
                  {sh.programs.map((p) => (
                    <li key={p.name} className="text-sm text-body">
                      <a href={p.url} target="_blank" rel="noreferrer" className="font-medium">{p.name}</a> — {p.gist}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="ds-eyebrow text-xs text-muted">{ut('explore.netMetering')}</h3>
                <p className="mt-1 text-sm text-body">{sh.net_metering}</p>
              </div>
              <a href={homeData.links.dsire} target="_blank" rel="noreferrer" className="inline-block text-sm font-medium">
                {ut('explore.allIncentives')} →
              </a>
            </div>
          </Card>

          <Card title={ut('explore.ratingsTitle')}>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ut('explore.ratings').map(([term, def]) => (
                <div key={term}>
                  <dt className="text-sm font-semibold text-ink">{term}</dt>
                  <dd className="mt-1 text-sm text-body">{def}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </>
      )}
    </div>
  )
}
