/**
 * "From idea to keys" for the Swiss / Passive-grade house (archetype D):
 * a build brief from the comparison the visitor already made, and the steps
 * to realise it, each with who does it and official directories. Pure logic;
 * every figure comes from the resilience model, the home data or FEMA.
 */
import paths from './build-path.json'
import { compareBuilds } from './resilience/model.js'
import { optionBuild } from './home.js'
import { HAZARDS, ratingLevel, stateRisk } from './hazards/model.js'

const L = paths.links

/** The visitor's Swiss-grade house as a brief to hand to an architect or builder. */
export function swissBrief({ state, sqft = 2000, storeys = 2, horizon = 30, wallD } = {}) {
  const r = compareBuilds({ stateCode: state, mode: 'size', sqft, storeys, horizon, wallD })
  const D = r?.byId?.D
  const B = r?.byId?.B
  if (!D || !B) return null
  const risk = stateRisk(state)
  const topRisks = risk
    ? HAZARDS.map((h) => ({ hazard: h, level: ratingLevel(risk[h].rating) }))
        .filter((x) => x.level != null && x.level >= 3)
        .sort((a, b) => b.level - a.level)
    : []
  return {
    state,
    sqft: D.sqft,
    storeys: r.storeys,
    horizon: r.horizon,
    wall: { id: D.wall.id, label: D.wall.label, short: D.wall.short, r: D.wall.r_whole_wall, ach50: D.wall.ach50_typical, hazardFit: D.wall.hazard_fit },
    windows: D.windows,
    systems: D.systems,
    hers: D.hers,
    upfront: D.upfront,
    premium: D.upfront.mid - B.upfront.mid,
    energySaved: B.energy.cumulative - D.energy.cumulative,
    topRisks,
  }
}

/**
 * The steps from idea to keys. Each step: id, the links that serve it, and the
 * figures its copy needs (all from the brief or the home data).
 */
export function swissBuildPath(brief) {
  if (!brief) return []
  const b = optionBuild(brief.state, brief.sqft)
  const wallLinks = (paths.wall_links[brief.wall.id] || []).map((k) => L[k])
  const windOrHail = brief.topRisks.some((x) => x.hazard === 'hurricane' || x.hazard === 'tornado' || x.hazard === 'hail')
  const flood = brief.topRisks.some((x) => x.hazard === 'inlandFlood' || x.hazard === 'coastalFlood')
  return [
    { id: 'feasibility', vars: { premium: brief.premium, energySaved: brief.energySaved, horizon: brief.horizon }, links: [L.dsire] },
    { id: 'land', vars: {}, flags: { flood }, links: [L.fema_flood_map, ...(flood ? [L.noaa_slr] : [])] },
    { id: 'team', vars: {}, links: [L.phius_find_pro, L.phi_buildings, L.ph_accelerator] },
    { id: 'design', vars: { hers: brief.hers, achLow: brief.wall.ach50.low, achHigh: brief.wall.ach50.high }, flags: { windOrHail }, links: [L.phius, L.doe_efficient_new, ...(windOrHail ? [L.fortified] : [])] },
    { id: 'materials', vars: { wall: brief.wall.label }, links: [L.phi_components, L.phius_products, ...wallLinks] },
    {
      id: 'bids',
      vars: b ? { perSqftLow: b.perSqft.low, perSqftHigh: b.perSqft.high, softLow: b.softCosts.low, softHigh: b.softCosts.high, months: Math.round(b.timelineMonths) } : null,
      links: [L.energy_star_new, L.cfpb_home],
    },
    { id: 'verify', vars: { achLow: brief.wall.ach50.low, achHigh: brief.wall.ach50.high, hers: brief.hers }, links: [L.resnet_rater] },
  ]
}
