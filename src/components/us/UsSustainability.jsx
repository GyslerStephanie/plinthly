import { money } from '../../lib/format'
import { sustainabilityFor } from '../../markets/us/home'
import { getState } from '../../markets/us/affordability'
import { ut } from '../../markets/us/copy'
import { Indicative } from '../ui'
import { trackOutbound } from '../../lib/track'

/**
 * US Phase 4: "More ways to make your home sustainable". Water, yard,
 * envelope and systems ideas beyond the energy routes, with the state's
 * rainwater rule and landscape rebate. Display only: data in
 * us-home-data.json → sustainability, shaped by home.js sustainabilityFor().
 */

// Sub-dollar premiums (a cool roof) need cents; everything else rounds.
const usd = (v) => (v > 0 && v < 1 ? `$${v.toFixed(2)}` : money(v))

export function costLabel({ low, high, unit }) {
  return ut(`sustain.cost.${unit}`, { low: usd(low), high: usd(high), lowRaw: low, highRaw: high })
}

export default function UsSustainability({ region }) {
  const data = sustainabilityFor(region)
  const st = getState(region)
  if (!data || !st) return null
  const { state } = data

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="us-sustain-title">
      <h2 id="us-sustain-title" className="text-lg font-bold text-slate-900">{ut('sustain.title')}</h2>
      <p className="mt-1 max-w-3xl text-sm text-body">{ut('sustain.intro')}</p>

      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
        {data.groups.map((g) => (
          <div key={g.id}>
            <h3 className="ds-eyebrow border-b border-line pb-2 text-xs text-muted">{ut(`sustain.groups.${g.id}`)}</h3>
            <ul className="divide-y divide-line">
              {g.items.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-semibold text-ink">{ut(`sustain.names.${m.id}`)}</p>
                    {m.goodFit && (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900">
                        {ut('sustain.goodFit', { state: st.name })}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-body">{m.what}</p>
                  <p className="mt-1 text-sm text-body">{m.benefit}</p>
                  <p className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-muted">
                    <span>
                      {ut('sustain.costLabel')}: <span className="ds-figure tabular-nums text-ink">{costLabel(m.cost)}</span>
                    </span>
                    <a href={m.link.url} target="_blank" rel="noreferrer" className="font-medium" onClick={() => trackOutbound('guide')}>{m.link.label} →</a>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-surface px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">{ut('sustain.stateTitle', { state: st.name })}</h3>
        <dl className="mt-2 space-y-2 text-sm">
          <div>
            <dt className="inline font-medium text-ink">
              {ut('sustain.rainwater')} ({state.rainwater === 'limited' ? ut('sustain.rainLimited') : ut('sustain.rainLegal')}):
            </dt>{' '}
            <dd className="inline text-body">{state.rainwater_note}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-ink">{ut('sustain.landscapeRebate')}:</dt>{' '}
            <dd className="inline text-body">
              {state.landscape_rebate ? (
                <>
                  <a href={state.landscape_rebate.url} target="_blank" rel="noreferrer" className="font-medium" onClick={() => trackOutbound('rebate')}>{state.landscape_rebate.name}</a>
                  {': '}
                  {state.landscape_rebate.amount}
                </>
              ) : (
                state.note || `${ut('sustain.noRebate')}.`
              )}
            </dd>
          </div>
        </dl>
      </div>

      <Indicative>{data.notes}</Indicative>
    </section>
  )
}
