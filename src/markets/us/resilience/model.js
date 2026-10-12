/**
 * Resilient-build explorer (US) — phase 1: envelope archetypes × energy price
 * paths × horizon, on energy and cost. Pure logic over resilience-data.json
 * and the existing US home data/engine. Every constant comes from data; the
 * UI labels everything indicative.
 *
 * In one line: a house is a wall assembly plus a windows and systems package.
 * Its build premium = wall area × added wall cost + window area × (triple −
 * double) + systems; its energy = the existing HERS model under a price path.
 *
 * Spec: docs/specs/RESILIENT_BUILD_SPEC.md
 */
import rd from './resilience-data.json'
import market from '../us-data.json'
import { annualEnergyCost, upgradeLedger, homeData } from '../home.js'

export const RESILIENCE_METHODOLOGY = 1

export const WALLS = rd.wall_assemblies
export const ARCHETYPES = rd.archetypes
export const PRICE_PATHS = rd.price_paths
export const HORIZONS = [10, 20, 30]
export const resilienceData = rd

const R = market.mortgage_rules
const mid = (b) => (b.low + b.high) / 2
const band = (low, high) => ({ low, mid: (low + high) / 2, high })
const add = (a, b) => ({ low: a.low + b.low, mid: a.mid + b.mid, high: a.high + b.high })
const scale = (b, k) => ({ low: b.low * k, mid: b.mid * k, high: b.high * k })
const roundBand = (b) => ({ low: Math.round(b.low), mid: Math.round(b.mid), high: Math.round(b.high) })

export const getWall = (id) => WALLS.find((w) => w.id === id) || null
export const getArchetype = (id) => ARCHETYPES.find((a) => a.id === id) || null
const stateHome = (code) => homeData.states[code] || null

/** Default Swiss-grade wall for a state's climate bucket. */
export function defaultWallFor(archetypeId, stateCode) {
  const a = getArchetype(archetypeId)
  if (!a) return null
  if (a.wall) return a.wall
  const climate = rd.state_climate[stateCode] || 'mixed'
  return a.wall_by_climate[climate]
}

/** Exterior wall and window areas from floor area (data-driven factors). */
export function geometry(sqft, storeys = 2) {
  const f = rd.geometry.wall_area_factor[String(storeys)] ?? rd.geometry.wall_area_factor['2']
  return {
    wallSqft: Math.round(sqft * f),
    windowSqft: Math.round((sqft * rd.geometry.window_area_pct) / 100),
    wallAreaFactor: f,
    windowAreaPct: rd.geometry.window_area_pct,
  }
}

/** Annual escalation (fraction) for a price path id or a custom percentage. */
export function escalationFor(pricePath) {
  if (typeof pricePath === 'number') return Math.max(-0.1, Math.min(0.2, pricePath / 100))
  const p = rd.price_paths[pricePath] || rd.price_paths.ref
  return p.escalation_pct / 100
}

/** Energy per year over the horizon under a price path, plus the cumulative total. */
export function energyPath(stateCode, sqft, hers, horizon, pricePath) {
  const annual = annualEnergyCost(stateCode, sqft, hers)
  if (annual == null) return null
  const g = escalationFor(pricePath)
  const years = []
  let cumulative = 0
  for (let y = 1; y <= horizon; y++) {
    const v = annual * Math.pow(1 + g, y - 1)
    cumulative += v
    years.push(Math.round(v))
  }
  return { annualNow: Math.round(annual), years, cumulative: Math.round(cumulative), escalationPct: g * 100 }
}

/** Base construction cost band for the state (existing data, land excluded). */
export function baseBuildCost(stateCode, sqft) {
  const s = stateHome(stateCode)
  if (!s || !(sqft > 0)) return null
  const per = s.build_cost_per_sqft
  return { low: per.low * sqft, mid: per.mid * sqft, high: per.high * sqft, perSqft: per }
}

/**
 * Envelope and systems premium for an archetype over the code baseline.
 * Returns the parts and the total as {low, mid, high}, plus the cross-check
 * against the wall's premium-share band (the UI flags a miss).
 */
export function envelopePremium(stateCode, sqft, storeys, archetypeId, wallId) {
  const a = getArchetype(archetypeId)
  const wall = getWall(wallId || defaultWallFor(archetypeId, stateCode))
  if (!a || !wall || !(sqft > 0)) return null
  const g = geometry(sqft, storeys)
  const zero = band(0, 0)
  const wallCost = wall.added_cost_per_sqft_wall_usd
    ? band(wall.added_cost_per_sqft_wall_usd.low * g.wallSqft, wall.added_cost_per_sqft_wall_usd.high * g.wallSqft)
    : zero
  const W = rd.windows
  const windows =
    a.windows === 'triple'
      ? band((W.triple_per_sqft_usd.low - W.double_per_sqft_usd.low) * g.windowSqft, (W.triple_per_sqft_usd.high - W.double_per_sqft_usd.high) * g.windowSqft)
      : zero
  let systems = zero
  const S = rd.systems
  if (a.systems.includes('erv')) systems = add(systems, band(S.erv_usd.low, S.erv_usd.high))
  if (a.new_build) {
    if (a.systems.includes('heatpump')) systems = add(systems, band(S.heatpump_new_build_increment_usd.low, S.heatpump_new_build_increment_usd.high))
    if (a.systems.includes('hpwh')) systems = add(systems, band(S.hpwh_new_build_increment_usd.low, S.hpwh_new_build_increment_usd.high))
  } else {
    // Retrofit: the full measure cost, from the existing upgrade ledger.
    const ids = a.systems.filter((id) => id !== 'erv')
    if (ids.length) {
      const led = upgradeLedger(stateCode, sqft, ids)
      if (led) systems = add(systems, led.cost)
    }
  }
  const total = add(add(wallCost, windows), systems)
  const base = baseBuildCost(stateCode, sqft)
  const pct = (v) => (base ? Math.round((v / base.mid) * 1000) / 10 : null)
  // The wall's house-share band describes the WALL; windows and systems come on
  // top. The cross-check compares like with like and the UI flags a miss.
  const bandPct = wall.premium_pct_of_house
  const wallPct = pct(wallCost.mid)
  const check = bandPct && wallPct != null ? wallPct >= bandPct.low - 0.5 && wallPct <= bandPct.high + 0.5 : true
  return {
    wall,
    geometry: g,
    parts: { wall: roundBand(wallCost), windows: roundBand(windows), systems: roundBand(systems) },
    total: roundBand(total),
    pctOfHouse: pct(total.mid),
    wallPctOfHouse: wallPct,
    pctBand: bandPct,
    pctInBand: check,
  }
}

/**
 * One archetype column: upfront cost, energy over the horizon, maintenance and
 * total cost of ownership. `sqft` is the house being compared; for a retrofit
 * (A, C) there is no build cost, only the premium for C.
 */
export function archetypeColumn(stateCode, sqft, storeys, horizon, pricePath, archetypeId, wallId) {
  const a = getArchetype(archetypeId)
  const prem = envelopePremium(stateCode, sqft, storeys, archetypeId, wallId)
  const base = baseBuildCost(stateCode, sqft)
  const energy = a ? energyPath(stateCode, sqft, a.hers, horizon, pricePath) : null
  if (!a || !prem || !base || !energy) return null
  const upfront = a.new_build ? add(base, prem.total) : prem.total
  // Maintenance on the home's value; build cost stands in for value (land excluded),
  // the same for every column so the comparison is driven by envelope and energy.
  const maintenanceAnnual = (base.mid * R.maintenance_pct_of_value) / 100
  const maintenance = Math.round(maintenanceAnnual * horizon)
  const tco = { low: upfront.low + energy.cumulative + maintenance, mid: upfront.mid + energy.cumulative + maintenance, high: upfront.high + energy.cumulative + maintenance }
  const C = homeData.certified_homes
  return {
    id: a.id,
    label: a.label,
    sub: a.sub,
    newBuild: !!a.new_build,
    retrofitOf: a.retrofit_of || null,
    wall: prem.wall,
    wallOptions: a.wall_options || null,
    windows: a.windows,
    systems: a.systems,
    hers: a.hers,
    sqft,
    base: roundBand(base),
    premium: prem,
    upfront: roundBand(upfront),
    energy,
    maintenance,
    tco: roundBand(tco),
    resalePremiumPct: a.id === 'D' ? C.resale_premium_pct : null,
  }
}

/**
 * Floor area a budget buys for a new-build archetype: solve base(sqft) +
 * premium(sqft) = budget by bisection (cost is monotone in sqft).
 */
export function sqftForBudget(stateCode, budget, storeys, archetypeId, wallId) {
  const a = getArchetype(archetypeId)
  if (!a || !a.new_build || !(budget > 0) || !stateHome(stateCode)) return null
  const costAt = (s) => {
    const b = baseBuildCost(stateCode, s)
    const p = envelopePremium(stateCode, s, storeys, archetypeId, wallId)
    return b.mid + p.total.mid
  }
  let lo = 100
  let hi = 20000
  if (costAt(lo) > budget) return null
  if (costAt(hi) < budget) return hi
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2
    if (costAt(m) > budget) hi = m
    else lo = m
  }
  return Math.round(lo)
}

/**
 * The comparison. Mode 'size': every column at the same floor area. Mode
 * 'budget': new builds sized to the budget (the "same budget, smaller and
 * better" scenario); retrofit columns use the code-built house's size.
 */
export function compareBuilds({ stateCode, mode = 'size', sqft, budget, storeys = 2, horizon = 30, pricePath = 'ref', wallD, retrofit = false }) {
  if (!stateHome(stateCode)) return null
  const h = HORIZONS.includes(Number(horizon)) ? Number(horizon) : 30
  const st = Number(storeys) === 1 ? 1 : 2
  const wallForD = wallD && getArchetype('D').wall_options.includes(wallD) ? wallD : defaultWallFor('D', stateCode)
  let refSqft = sqft
  let sized = null
  if (mode === 'budget') {
    if (!(budget > 0)) return null
    sized = {
      B: sqftForBudget(stateCode, budget, st, 'B'),
      D: sqftForBudget(stateCode, budget, st, 'D', wallForD),
    }
    refSqft = sized.B
  }
  if (!(refSqft > 0)) return null
  const ids = retrofit ? ['A', 'C', 'B', 'D'] : ['B', 'D', 'A', 'C']
  const columns = ids
    .map((id) => {
      const s = sized && sized[id] ? sized[id] : refSqft
      return archetypeColumn(stateCode, s, st, h, pricePath, id, id === 'D' ? wallForD : undefined)
    })
    .filter(Boolean)
  const byId = Object.fromEntries(columns.map((c) => [c.id, c]))
  const gap = byId.A && byId.D ? byId.A.energy.cumulative - byId.D.energy.cumulative : null
  return {
    methodology: RESILIENCE_METHODOLOGY,
    stateCode,
    mode,
    horizon: h,
    storeys: st,
    pricePath,
    escalationPct: escalationFor(pricePath) * 100,
    refSqft,
    budget: mode === 'budget' ? budget : null,
    sized,
    wallD: wallForD,
    columns,
    byId,
    energyGapAtoD: gap,
    bVsD: byId.B && byId.D ? {
      premium: byId.D.upfront.mid - byId.B.upfront.mid,
      energySaved: byId.B.energy.cumulative - byId.D.energy.cumulative,
      tcoDelta: byId.D.tco.mid - byId.B.tco.mid,
      sqftDelta: byId.D.sqft - byId.B.sqft,
    } : null,
  }
}
