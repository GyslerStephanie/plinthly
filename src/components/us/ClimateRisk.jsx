import { useEffect, useMemo, useState } from 'react'
import { money } from '../../lib/format'
import { ut } from '../../markets/us/copy'
import { getState } from '../../markets/us/affordability'
import { compareBuilds } from '../../markets/us/resilience/model'
import { HAZARDS, abbrForFips, hurricaneLoss, mitigation, nriMeta, ratingLevel, stateRisk } from '../../markets/us/hazards/model'
import { Indicative, InfoTip } from '../ui'
import { track } from '../../lib/track'

/**
 * "Climate risk" step (US): a state map shaded by FEMA's expected-annual-loss
 * rating for one hazard, the chosen state's ratings, and what a wind-resistant
 * build changes in expected hurricane loss. The map shapes load on demand.
 */

// Light → dark orange by rating; "not applicable" stays a pale neutral.
const FILL = ['#eef1e4', '#d9e4bd', '#f3d79b', '#e9a463', '#c8643b']
const NA_FILL = '#d6d3c8'
const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0

function useStateShapes() {
  const [shapes, setShapes] = useState(null)
  useEffect(() => {
    let live = true
    Promise.all([import('d3-geo'), import('topojson-client'), import('us-atlas/states-albers-10m.json')]).then(([geo, topo, atlas]) => {
      if (!live) return
      const us = atlas.default || atlas
      const path = geo.geoPath()
      const features = topo.feature(us, us.objects.states).features
      setShapes(features.map((f) => ({ abbr: abbrForFips(f.id), name: f.properties.name, d: path(f) })).filter((s) => s.abbr && s.d))
    })
    return () => { live = false }
  }, [])
  return shapes
}

export default function ClimateRisk({ region, onRegionChange, build, onCompare }) {
  const shapes = useStateShapes()
  const [hazard, setHazard] = useState('hurricane')
  const [picked, setPicked] = useState(region || 'FL')
  useEffect(() => { if (region) setPicked(region) }, [region])
  const risk = stateRisk(picked)
  const supported = !!getState(picked)

  const pick = (abbr) => {
    setPicked(abbr)
    track('risk_state_picked', { state: abbr })
    if (getState(abbr)) onRegionChange(abbr)
  }

  // Expected hurricane loss: code-built (B) vs the Swiss-grade house (D), from the build model.
  const loss = useMemo(() => {
    if (!supported) return null
    const horizon = Number(build.horizon) || 30
    const r = compareBuilds({ stateCode: picked, mode: 'size', sqft: num(build.sqft) || 2000, horizon, wallD: build.wallD || undefined })
    if (!r?.byId?.B || !r?.byId?.D) return null
    const valueOf = (c) => r.beyond?.byId?.[c.id]?.insuredValue || c.base.mid
    const resistant = r.byId.D.wall.hazard_fit?.hurricane === 'good'
    const l = hurricaneLoss(picked, valueOf(r.byId.B), valueOf(r.byId.D), horizon, resistant)
    return l && { ...l, horizon, premium: r.byId.D.upfront.mid - r.byId.B.upfront.mid, wall: r.byId.D.wall.short }
  }, [picked, supported, build.sqft, build.horizon, build.wallD])

  const pct = (x) => Math.round(x * 100)
  const coastal = risk && ratingLevel(risk.coastalFlood.rating) != null

  return (
    <div className="space-y-[var(--space-stack)]">
      <section className="ds-card">
        <div role="group" aria-label={ut('risk.hazardLabel')} className="flex flex-wrap gap-2">
          {HAZARDS.map((h) => (
            <button
              key={h}
              type="button"
              aria-pressed={hazard === h}
              onClick={() => setHazard(h)}
              className={'rounded-full border px-3.5 py-1.5 text-sm transition ' + (hazard === h ? 'border-teal-700 bg-teal-50 font-semibold text-teal-900' : 'border-line bg-white text-body hover:border-ink')}
            >
              {ut(`risk.hazard.${h}`)}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {shapes ? (
              <svg viewBox="0 0 975 610" role="group" aria-label={ut('risk.mapLabel', { hazard: ut(`risk.hazard.${hazard}`) })} className="h-auto w-full">
                {shapes.map((s) => {
                  const lv = ratingLevel(stateRisk(s.abbr)?.[hazard]?.rating)
                  const on = s.abbr === picked
                  return (
                    <path
                      key={s.abbr}
                      d={s.d}
                      fill={lv == null ? NA_FILL : FILL[lv]}
                      stroke={on ? '#1b1c17' : '#ffffff'}
                      strokeWidth={on ? 2.5 : 0.8}
                      className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-70"
                      tabIndex={0}
                      role="button"
                      aria-label={`${s.name}: ${stateRisk(s.abbr)?.[hazard]?.rating || ''}`}
                      aria-pressed={on}
                      onClick={() => pick(s.abbr)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(s.abbr) } }}
                    >
                      <title>{s.name}</title>
                    </path>
                  )
                })}
              </svg>
            ) : (
              <div className="flex aspect-[975/610] items-center justify-center rounded-lg bg-surface text-sm text-muted">{ut('risk.loading')}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-hidden="true">
              {FILL.map((c, i) => (
                <span key={c} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-black/10" style={{ background: c }} />{ut(`risk.rating.${i}`)}</span>
              ))}
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-black/10" style={{ background: NA_FILL }} />{ut('risk.rating.na')}</span>
            </div>
            <label className="mt-3 block text-sm text-body">
              {ut('risk.pickState')}
              <select
                value={picked}
                onChange={(e) => pick(e.target.value)}
                className="ml-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm text-ink"
              >
                {(shapes || []).slice().sort((a, b) => a.name.localeCompare(b.name)).map((s) => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
              </select>
            </label>
          </div>

          {risk && (
            <aside aria-label={risk.name} className="lg:border-l lg:border-line lg:pl-6">
              <h3 className="font-display text-2xl font-semibold text-ink">{risk.name}</h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                {HAZARDS.map((h) => (
                  <div key={h} className="flex justify-between gap-3">
                    <dt className="text-body">{ut(`risk.hazard.${h}`)}</dt>
                    <dd className="font-semibold text-ink">{ratingLevel(risk[h].rating) == null ? ut('risk.rating.na') : ut(`risk.rating.${ratingLevel(risk[h].rating)}`)}</dd>
                  </div>
                ))}
              </dl>
              {coastal && (
                <a href={mitigation.sea_level_rise_viewer} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
                  {ut('risk.slr')} ↗
                </a>
              )}
              {supported ? (
                <button type="button" onClick={onCompare} className="mt-4 block rounded-full bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800">
                  {ut('risk.compareIn', { state: risk.name })}
                </button>
              ) : (
                <p className="mt-4 text-sm text-muted">{ut('risk.notCovered')}</p>
              )}
            </aside>
          )}
        </div>
        <Indicative>{ut('risk.source', { version: nriMeta.version })}</Indicative>
      </section>

      {loss && (
        <section className="ds-card" aria-labelledby="risk-loss-title">
          <h2 id="risk-loss-title" className="ds-section-title flex items-center gap-1.5">
            {ut('risk.loss.title', { state: risk.name })}
            <InfoTip label={ut('risk.loss.title', { state: risk.name })}>
              {ut('risk.loss.method', { rate: (loss.rate * 100).toFixed(3), low: pct(loss.cut.low), high: pct(loss.cut.high) })}
            </InfoTip>
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium" />
                  <th className="py-2 pr-3 font-medium">{ut('risk.loss.typical')}</th>
                  <th className="py-2 font-medium">{ut('risk.loss.resistant', { wall: loss.wall })}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-body">{ut('risk.loss.perYear')}</th>
                  <td className="ds-figure py-2 pr-3 tabular-nums text-ink">{money(loss.typical.perYear)}</td>
                  <td className="ds-figure py-2 tabular-nums text-ink">{money(loss.resistant.perYear.low)}–{money(loss.resistant.perYear.high)}</td>
                </tr>
                <tr className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-body">{ut('risk.loss.overN', { n: loss.horizon })}</th>
                  <td className="ds-figure py-2 pr-3 font-semibold tabular-nums text-ink">{money(loss.typical.total)}</td>
                  <td className="ds-figure py-2 font-semibold tabular-nums text-ink">{money(loss.resistant.total.low)}–{money(loss.resistant.total.high)}</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-body">{ut('risk.loss.extra')}</th>
                  <td className="py-2 pr-3 text-muted">—</td>
                  <td className="ds-figure py-2 tabular-nums text-ink">{money(loss.premium)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {!loss.resistantApplied && <p className="mt-2 text-sm text-body">{ut('risk.loss.pickStrongWall')}</p>}
          <p className="mt-3 text-sm text-body">{ut('risk.loss.bcr', { ratio: mitigation.above_code_bcr.hurricane_wind })}</p>
          <Indicative>{ut('risk.loss.note')}</Indicative>
          <p className="mt-1 text-xs text-muted">
            {ut('build.beyond.sources')}:{' '}
            {[...mitigation.fortified_hurricane.sources, ...mitigation.above_code_bcr.sources, nriMeta.url].map((u, i) => (
              <span key={u}>{i > 0 && ' · '}<a href={u} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">{new URL(u).hostname.replace(/^www\./, '')}</a></span>
            ))}
          </p>
        </section>
      )}
    </div>
  )
}
