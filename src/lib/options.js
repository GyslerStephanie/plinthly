/**
 * Phase 3 "What are my real options?" — calculations for the three paths:
 *   A) Buy existing & renovate to Minergie
 *   B) Buy new / Minergie-certified
 *   C) Build on a plot
 *
 * All cost benchmarks come from swiss-cantonal-data.json. Figures are
 * indicative ranges; the UI labels them as such and never implies precision
 * the data can't support.
 */

import data from '../data/swiss-cantonal-data.json'
import { getCanton } from './cantons'
import { priceBand } from './exploration'

// Energy-class assumptions used for 10-year running-cost comparisons.
// A typical unrenovated existing home sits around class E; a Minergie retrofit
// or new Minergie build lands around class C.
const CLASS_UNRENOVATED = 'E'
const CLASS_MINERGIE = 'C'

function heatingCostPerM2(classLabel) {
  return data.energy_classes.classes[classLabel]
    .typical_heating_cost_chf_per_m2_per_year
}

/** 10-year heating cost for a size at a given energy class. */
function tenYearHeating(sizeM2, classLabel) {
  return Math.round(heatingCostPerM2(classLabel) * sizeM2 * 10)
}

/**
 * Option A — Buy existing and renovate to Minergie standard.
 */
export function optionRenovate(cantonCode, sizeM2, propertyType) {
  const size = sizeM2 || 100
  const reno = data.renovation_cost_benchmarks.measures
  const retrofit =
    propertyType === 'house'
      ? reno.full_minergie_retrofit_house
      : reno.full_minergie_retrofit_apartment

  const cost = {
    low: Math.round(retrofit.low * size),
    mid: Math.round(retrofit.mid * size),
    high: Math.round(retrofit.high * size),
  }

  // Federal subsidy baseline: insulation per m2 (treated area ≈ living area as a
  // rough proxy) + a heat-pump replacement grant. Cantonal top-ups extend this.
  const fed = data.gebaeudeprogramm_federal.typical_subsidy_ranges
  const subsidy = {
    low: Math.round(fed.insulation_chf_per_m2.low * size + fed.heat_pump_replacement_chf.low),
    high: Math.round(fed.insulation_chf_per_m2.high * size + fed.heat_pump_replacement_chf.high),
  }

  const netCost = {
    low: Math.max(0, cost.low - subsidy.high),
    mid: Math.max(0, cost.mid - (subsidy.low + subsidy.high) / 2),
    high: Math.max(0, cost.high - subsidy.low),
  }

  const runningCost = {
    unrenovatedClass: CLASS_UNRENOVATED,
    minergieClass: CLASS_MINERGIE,
    unrenovatedTenYear: tenYearHeating(size, CLASS_UNRENOVATED),
    minergieTenYear: tenYearHeating(size, CLASS_MINERGIE),
    tenYearSaving:
      tenYearHeating(size, CLASS_UNRENOVATED) - tenYearHeating(size, CLASS_MINERGIE),
  }

  return { size, cost, subsidy, netCost, runningCost }
}

/**
 * Option B — Buy new / Minergie-certified instead of existing.
 * Premiums are expressed on the budget (the price of the equivalent existing
 * home the user could buy in Phase 2).
 */
export function optionNewBuild(cantonCode, budget, sizeM2) {
  const c = getCanton(cantonCode)
  if (!c || !budget) return null
  const ranges = c.property_price_ranges
  const size = sizeM2 || 100

  const newBuildPremiumPct = ranges.new_build_premium_pct
  const minergiePremiumPct = ranges.minergie_premium_pct

  const newBuildPremium = Math.round((budget * newBuildPremiumPct) / 100)
  const minergiePremium = Math.round((budget * minergiePremiumPct) / 100)

  // Long-term advantage vs. a typical existing (class E) home: a new Minergie
  // build (~class C) saves running cost every year.
  const tenYearSaving =
    tenYearHeating(size, CLASS_UNRENOVATED) - tenYearHeating(size, CLASS_MINERGIE)

  return {
    newBuildPremiumPct,
    minergiePremiumPct,
    newBuildPremium,
    minergiePremium,
    newBuildPrice: budget + newBuildPremium,
    minergiePrice: budget + minergiePremium,
    tenYearSaving,
    availabilitySignal: c.minergie_context,
    marketNotes: c.market_notes,
    resalePremiumPct: data.minergie.standards.MINERGIE.resale_premium_pct,
  }
}

/**
 * Option C — Build on a plot.
 * Build cost only — land is NOT in the dataset, so we say so honestly rather
 * than inventing a number.
 */
export function optionBuild(cantonCode, sizeM2) {
  const size = sizeM2 || 120
  const b = data.build_cost_benchmarks
  const standards = [
    { key: 'standard_build', label: 'Standard build' },
    { key: 'minergie', label: 'Minergie' },
    { key: 'minergie_p', label: 'Minergie-P' },
    { key: 'minergie_a', label: 'Minergie-A (net zero)' },
  ].map((s) => {
    const r = b.standards[s.key]
    return {
      label: s.label,
      perM2: r,
      total: {
        low: Math.round(r.low * size),
        mid: Math.round(r.mid * size),
        high: Math.round(r.high * size),
      },
    }
  })

  const add = b.additional_costs
  return {
    size,
    standards,
    landIncluded: false,
    softCosts: {
      architectPct: add.architect_fees_pct_of_build_cost,
      engineerPct: add.engineer_fees_pct_of_build_cost,
      permitsPct: add.permits_and_fees_pct,
      contingencyPct: add.contingency_pct,
    },
    // A rough land-price signal from the canton's per-m2 *built* price band,
    // explicitly flagged as a proxy, not a land valuation.
    landProxy: priceBand(cantonCode, 'house'),
    planningPortal: getCanton(cantonCode)?.gebaeudeprogramm?.url ?? null,
    notes: b.notes,
  }
}
