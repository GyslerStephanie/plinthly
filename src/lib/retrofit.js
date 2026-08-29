/**
 * Phase 3 / Option A — retrofit configurator model.
 *
 * Turns the static "renovate to Minergie" estimate into an itemized, live model:
 * the user toggles individual measures and we recompute the GEAK trajectory,
 * running cost, CO₂, total cost, subsidies, net cost, simple payback, and an
 * estimated resale-value uplift.
 *
 * Everything is grounded in swiss-cantonal-data.json:
 *  - per-measure costs    → renovation_cost_benchmarks.measures
 *  - subsidies            → gebaeudeprogramm_federal.typical_subsidy_ranges
 *  - energy/CO₂ per class  → energy_classes.classes
 *  - resale uplift        → minergie.standards.*.resale_premium_pct
 *
 * The per-measure energy/CO₂ deltas and the area sizing rules are modelled
 * assumptions (documented below), so the UI labels the whole thing indicative.
 */

import data from '../data/swiss-cantonal-data.json'

const CLASS_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

const HEAT = Object.fromEntries(
  CLASS_ORDER.map((c) => [c, data.energy_classes.classes[c].typical_heating_cost_chf_per_m2_per_year]),
)
const CO2 = Object.fromEntries(
  CLASS_ORDER.map((c) => [c, data.energy_classes.classes[c].co2_kg_per_m2_per_year]),
)

// A typical unrenovated existing home — the configurator's starting point.
export const BASELINE_CLASS = 'E'

// Resale-value uplift once the retrofit reaches a Minergie-grade class.
const RESALE_PREMIUM_PCT = {
  A: data.minergie.standards.MINERGIE_A.resale_premium_pct, // 12
  B: data.minergie.standards.MINERGIE_P.resale_premium_pct, // 8
  C: data.minergie.standards.MINERGIE.resale_premium_pct, // 5
}

const M = data.renovation_cost_benchmarks.measures
const SUB = data.gebaeudeprogramm_federal.typical_subsidy_ranges

/**
 * Measure catalogue. `cost(size)` and `subsidy(size)` derive a total CHF for the
 * archetype property from the dataset benchmarks via simple, transparent sizing
 * rules. `dCost` / `dCo2` are the per-m²/yr reductions each measure contributes
 * (modelled, indicative). `group` drives the UI sections.
 */
export const RETROFIT_MEASURES = [
  {
    id: 'roof',
    group: 'envelope',
    cost: (s) => Math.round(M.roof_insulation.mid * 0.5 * s), // ~50% of living area as roof area
    subsidy: (s) => Math.round(((SUB.insulation_chf_per_m2.low + SUB.insulation_chf_per_m2.high) / 2) * 0.5 * s),
    dCost: 7,
    dCo2: 4,
  },
  {
    id: 'facade',
    group: 'envelope',
    cost: (s) => Math.round(M.facade_insulation.mid * 1.0 * s),
    subsidy: (s) => Math.round(((SUB.insulation_chf_per_m2.low + SUB.insulation_chf_per_m2.high) / 2) * 1.0 * s),
    dCost: 12,
    dCo2: 7,
  },
  {
    id: 'windows',
    group: 'envelope',
    cost: (s) => Math.max(4, Math.round(s / 14)) * M.window_replacement.mid,
    subsidy: () => 0,
    dCost: 6,
    dCo2: 3,
  },
  {
    id: 'heatpump',
    group: 'systems',
    cost: () => M.heat_pump_air_water.mid,
    subsidy: () => Math.round((SUB.heat_pump_replacement_chf.low + SUB.heat_pump_replacement_chf.high) / 2),
    dCost: 16,
    dCo2: 18, // large CO₂ cut — replaces fossil heating
  },
  {
    id: 'pv',
    group: 'systems',
    cost: () => M.solar_pv.mid,
    subsidy: () => 0, // federal PV one-time grant not in this dataset
    dCost: 4,
    dCo2: 3,
  },
  {
    id: 'solarthermal',
    group: 'systems',
    cost: () => M.solar_thermal.mid,
    subsidy: () => Math.round((SUB.solar_thermal_chf.low + SUB.solar_thermal_chf.high) / 2),
    dCost: 4,
    dCo2: 2,
  },
]

/** The class whose coefficient is the lowest that still covers `coeff`. */
function classFromHeating(coeff) {
  for (const c of CLASS_ORDER) {
    if (HEAT[c] >= coeff) return c
  }
  return 'G'
}

/** Per-measure cost/subsidy for a given size, for display in the toggle list. */
export function measureDetails(size) {
  const s = size || 100
  return RETROFIT_MEASURES.map((m) => ({
    id: m.id,
    group: m.group,
    cost: m.cost(s),
    subsidy: m.subsidy(s),
    dCost: m.dCost,
  }))
}

/**
 * Compute the live impact ledger.
 * @param {number} size      Living area m² (archetype from Phase 2).
 * @param {number} price     Property price (Phase 2 budget) — for value uplift.
 * @param {string[]} selectedIds  Selected measure ids.
 */
export function computeLedger(size, price, selectedIds) {
  const s = size || 100
  const selected = new Set(selectedIds)
  const chosen = RETROFIT_MEASURES.filter((m) => selected.has(m.id))

  const basePerM2 = HEAT[BASELINE_CLASS]
  const baseCo2PerM2 = CO2[BASELINE_CLASS]

  const sumDCost = chosen.reduce((a, m) => a + m.dCost, 0)
  const sumDCo2 = chosen.reduce((a, m) => a + m.dCo2, 0)

  const newPerM2 = Math.max(HEAT.A, basePerM2 - sumDCost)
  const newCo2PerM2 = Math.max(0, baseCo2PerM2 - sumDCo2)
  const newClass = chosen.length ? classFromHeating(newPerM2) : BASELINE_CLASS

  const totalCost = chosen.reduce((a, m) => a + m.cost(s), 0)
  const totalSubsidy = chosen.reduce((a, m) => a + m.subsidy(s), 0)
  const netCost = Math.max(0, totalCost - totalSubsidy)

  const annualSaving = Math.round((basePerM2 - newPerM2) * s)
  const tenYearSaving = annualSaving * 10
  const monthlySaving = Math.round(annualSaving / 12)
  const paybackYears = annualSaving > 0 ? netCost / annualSaving : null

  const premiumPct = RESALE_PREMIUM_PCT[newClass] || 0
  const valueUplift = price ? Math.round((price * premiumPct) / 100) : 0

  return {
    baselineClass: BASELINE_CLASS,
    newClass,
    classOrder: CLASS_ORDER,
    runningCost: { basePerM2, newPerM2, baseAnnual: Math.round(basePerM2 * s), newAnnual: Math.round(newPerM2 * s) },
    co2: { baseTons: +((baseCo2PerM2 * s) / 1000).toFixed(1), newTons: +((newCo2PerM2 * s) / 1000).toFixed(1) },
    totalCost,
    totalSubsidy,
    netCost,
    annualSaving,
    monthlySaving,
    tenYearSaving,
    paybackYears,
    premiumPct,
    valueUplift,
    selectedCount: chosen.length,
  }
}

/** Sensible default selection: the typical envelope + heat-pump Minergie path. */
export const DEFAULT_MEASURES = ['roof', 'facade', 'windows', 'heatpump']

/**
 * Resolve the active measure list from the persisted `explore.measures` string.
 * `undefined` (never touched) → the default path; an explicit '' → none.
 */
export function selectedMeasures(measuresStr) {
  if (measuresStr == null) return DEFAULT_MEASURES
  return String(measuresStr)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}
