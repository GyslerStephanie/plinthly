import { money, int } from '../../lib/format'
import { ut } from '../../markets/us/copy'
import { getState } from '../../markets/us/affordability'
import { swissBrief, swissBuildPath } from '../../markets/us/buildPath'
import { Indicative } from '../ui'
import { trackOutbound } from '../../lib/track'

const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0

/**
 * "From idea to keys" for the Swiss-grade house: the build brief (from the
 * Compare builds choices) and the steps to realise it, with who does each and
 * official directories. Shown on the action plan when the route is "build".
 */
export default function BuildPath({ region, build }) {
  const brief = swissBrief({ state: region, sqft: num(build?.sqft) || 2000, storeys: Number(build?.storeys) || 2, horizon: Number(build?.horizon) || 30, wallD: build?.wallD || undefined })
  if (!brief) return null
  const steps = swissBuildPath(brief)
  const stateName = getState(region)?.name || region

  const body = (s) => {
    const k = `buildPath.step.${s.id}`
    if (s.id === 'land' && s.flags?.flood) return ut(`${k}.bodyFlood`)
    if (s.id === 'design' && s.flags?.windOrHail) return ut(`${k}.bodyWind`, s.vars)
    if (s.id === 'bids') {
      if (!s.vars) return ut(`${k}.bodyNoData`)
      const v = s.vars
      return ut(`${k}.body`, { perSqftLow: money(v.perSqftLow), perSqftHigh: money(v.perSqftHigh), softLow: money(v.softLow), softHigh: money(v.softHigh), months: v.months })
    }
    if (s.id === 'feasibility') return ut(`${k}.body`, { premium: money(s.vars.premium), energySaved: money(s.vars.energySaved), horizon: s.vars.horizon })
    return ut(`${k}.body`, s.vars)
  }

  const row = (label, value) => (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 border-b border-line py-1.5 last:border-b-0">
      <dt className="text-body">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )

  return (
    <section aria-labelledby="build-path-title" className="space-y-[var(--space-stack)]">
      <div>
        <h2 id="build-path-title" className="font-display text-2xl font-semibold text-ink">{ut('buildPath.title')}</h2>
        <p className="mt-1 max-w-3xl text-base text-body">{ut('buildPath.intro')}</p>
      </div>

      <div className="ds-card">
        <h3 className="ds-section-title">{ut('buildPath.brief.title')} · {stateName}</h3>
        <dl className="mt-2 text-sm">
          {row(ut('buildPath.brief.size'), ut('buildPath.brief.sizeVal', { sqft: int(brief.sqft), storeys: brief.storeys }))}
          {row(ut('buildPath.brief.wall'), ut('buildPath.brief.wallVal', { wall: brief.wall.label, rLow: brief.wall.r.low, rHigh: brief.wall.r.high }))}
          {row(ut('buildPath.brief.windows'), ut(`buildPath.brief.windowsVal.${brief.windows}`))}
          {row(ut('buildPath.brief.systems'), brief.systems.map((x) => ut(`buildPath.brief.system.${x}`)).join(', ').replace(/^./, (c) => c.toUpperCase()))}
          {row(ut('buildPath.brief.air'), ut('buildPath.brief.airVal', { low: brief.wall.ach50.low, high: brief.wall.ach50.high }))}
          {row(ut('buildPath.brief.hers'), ut('buildPath.brief.hersVal', { hers: brief.hers }))}
          {row(ut('buildPath.brief.cost'), `${money(brief.upfront.low)}–${money(brief.upfront.high)}`)}
          {row(ut('buildPath.brief.premium'), money(brief.premium))}
          {row(ut('buildPath.brief.saved', { n: brief.horizon }), money(brief.energySaved))}
          {row(ut('buildPath.brief.risks'), brief.topRisks.length ? brief.topRisks.map((x) => ut(`risk.hazard.${x.hazard}`)).join(', ') : ut('buildPath.brief.noRisks'))}
        </dl>
      </div>

      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.id} className="ds-card">
            <div className="flex gap-4">
              <span className="ds-figure flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-800 text-sm font-semibold text-on-primary">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-ink">{ut(`buildPath.step.${s.id}.title`)}</h3>
                <p className="mt-0.5 text-sm text-muted">{ut('buildPath.who')}: {ut(`buildPath.step.${s.id}.who`)}</p>
                <p className="mt-2 text-sm leading-relaxed text-body">{body(s)}</p>
                {s.links.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {s.links.map((l) => (
                      <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer" className="font-medium" onClick={() => trackOutbound(l.kind)}>{l.label} →</a></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Indicative>{ut('buildPath.note')}</Indicative>
    </section>
  )
}
