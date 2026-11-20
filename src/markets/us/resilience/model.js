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
  return { annualNow: Math.round(annual), annualExact: annual, years, cumulative: Math.round(cumulative), escalationPct: g * 100 }
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

/** Sum of (1+g)^k for k = 0..h-1: a first-year bill grown at g, over h years. */
function growthFactor(g, h) {
  if (Math.abs(g) < 1e-9) return h
  return (Math.pow(1 + g, h) - 1) / g
}

/** First-year energy bill of a column, unrounded when available. */
const yearOne = (col) => col.energy.annualExact ?? col.energy.annualNow

const BREAKEVEN_MIN = -0.1
const BREAKEVEN_MAX = 0.2

/**
 * Break-even energy-price rise: the yearly escalation at which the energy one
 * house saves over another, across the horizon, equals its extra up-front cost.
 * Pure energy: insurance, outages, comfort and resale are not in it.
 *
 * @returns {{ premium, annualSaving, pct: number|null, verdict: 'always'|'at'|'never'|'none' }}
 *   'always' = pays back even if prices fall 10% a year; 'never' = not even at
 *   20% a year; 'none' = no extra cost or no saving to compare.
 */
export function breakEven(cheaper, better, horizon) {
  if (!cheaper || !better || !cheaper.energy || !better.energy) return null
  const premium = better.upfront.mid - cheaper.upfront.mid
  const exactSaving = yearOne(cheaper) - yearOne(better)
  const annualSaving = Math.round(exactSaving)
  if (!(exactSaving > 0)) return { premium, annualSaving, pct: null, verdict: 'none' }
  if (premium <= 0) return { premium, annualSaving, pct: null, verdict: 'always' }
  const need = premium / exactSaving
  if (growthFactor(BREAKEVEN_MIN, horizon) >= need) return { premium, annualSaving, pct: null, verdict: 'always' }
  if (growthFactor(BREAKEVEN_MAX, horizon) < need) return { premium, annualSaving, pct: null, verdict: 'never' }
  let lo = BREAKEVEN_MIN
  let hi = BREAKEVEN_MAX
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2
    if (growthFactor(m, horizon) >= need) hi = m
    else lo = m
  }
  return { premium, annualSaving, pct: Math.round(hi * 1000) / 10, verdict: 'at' }
}

/**
 * The same pair under each named price path (low / reference / high): energy
 * over the horizon for both houses, the saving, and whether it covers the
 * extra up-front cost.
 */
export function pathsSideBySide(cheaper, better, horizon) {
  if (!cheaper || !better || !cheaper.energy || !better.energy) return null
  const premium = better.upfront.mid - cheaper.upfront.mid
  return ['low', 'ref', 'high'].map((id) => {
    const f = growthFactor(escalationFor(id), horizon)
    const a = Math.round(yearOne(cheaper) * f)
    const b = Math.round(yearOne(better) * f)
    return { id, label: rd.price_paths[id].label, escalationPct: rd.price_paths[id].escalation_pct, cheaperEnergy: a, betterEnergy: b, saved: a - b, premium, paysBack: a - b >= premium }
  })
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
    // Does the extra cost pay back on energy alone, and how do the price paths compare?
    payback: {
      bToD: byId.B && byId.D ? { breakEven: breakEven(byId.B, byId.D, h), paths: pathsSideBySide(byId.B, byId.D, h) } : null,
      aToC: byId.A && byId.C ? { breakEven: breakEven(byId.A, byId.C, h), paths: pathsSideBySide(byId.A, byId.C, h) } : null,
    },
    // Beyond energy: hazards, fire, moisture, insurance and the total with insurance.
    beyond: beyondEnergy(columns, stateCode, h),
  }
}

const HAZARDS = ['hurricane', 'wildfire', 'hail', 'flood']

/** Moisture and mould risk from the wall (dries outward?) and ventilation (ERV?). */
export function moistureRisk(wall, systems = []) {
  const score = (wall?.vapour_open ? 1 : 0) + (systems.includes('erv') ? 1 : 0)
  return rd.beyond_energy.moisture_rule.levels[String(score)]
}

/**
 * Holistic rows for each column, beyond energy. Ratings come from the wall
 * record; insurance is the state's average rate on the house's value (build
 * cost incl. envelope for new builds and the retrofit, base cost for the older
 * home), held flat over the horizon. Returns null when the state is unknown.
 */
export function beyondEnergy(columns, stateCode, horizon) {
  const rate = market.states?.[stateCode]?.insurance_rate_pct
  if (!columns?.length || !(rate > 0)) return null
  const B = rd.beyond_energy
  return {
    horizon,
    insuranceRatePct: rate,
    byId: Object.fromEntries(columns.map((c) => {
      const value = c.base.mid + (c.newBuild || c.retrofitOf ? c.premium.total.mid : 0)
      const insuranceAnnual = Math.round((value * rate) / 100)
      const insurance = insuranceAnnual * horizon
      const hazards = Object.fromEntries(HAZARDS.map((k) => [k, c.wall.hazard_fit?.[k] || 'neutral']))
      return [c.id, {
        hazards,
        fire: c.wall.noncombustible ? 'good' : 'poor',
        moisture: moistureRisk(c.wall, c.systems),
        mayQualifyDiscount: B.insurer_discount.qualifies_if_good.some((k) => hazards[k] === 'good'),
        insuredValue: Math.round(value),
        insuranceAnnual,
        insurance,
        totalWithInsurance: c.tco.mid + insurance,
      }]
    })),
  }
}
