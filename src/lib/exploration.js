/**
 * Phase 2 "What should I look for?" — calculations.
 *
 * Everything is derived from swiss-cantonal-data.json so figures stay tied to
 * one indicative source. Outputs are clearly labelled as indicative ranges,
 * never live listings.
 */

import data from '../data/swiss-cantonal-data.json'
import { getCanton } from './cantons'

/** Per-m2 price band {low, mid, high} for a canton + property type. */
export function priceBand(cantonCode, propertyType) {
  const c = getCanton(cantonCode)
  if (!c) return null
  const ranges = c.property_price_ranges
  return propertyType === 'house'
    ? ranges.house_chf_per_m2
    : ranges.apartment_chf_per_m2
}

/**
 * "What does CHF X buy here?" — turn a budget into an implied living-area
 * range. A cheaper price/m2 buys more space, so the size band inverts the
 * price band.
 */
export function marketOverview(cantonCode, budget, propertyType) {
  const band = priceBand(cantonCode, propertyType)
  if (!band || !budget) return null
  return {
    pricePerM2: band,
    sizeM2: {
      // budget / high price-per-m2 = smallest home; / low = largest.
      low: Math.round(budget / band.high),
      mid: Math.round(budget / band.mid),
      high: Math.round(budget / band.low),
    },
    source: band.source || data.cantons[cantonCode].property_price_ranges.source,
  }
}

/** The single "headline" implied size we use to keep later phases consistent. */
export function impliedSize(cantonCode, budget, propertyType) {
  const band = priceBand(cantonCode, propertyType)
  if (!band || !budget) return 0
  return Math.max(1, Math.round(budget / band.mid))
}

/**
 * Energy-class running-cost table for a property of `sizeM2`.
 * Uses GEAK heating-cost coefficients (CHF/m2/year) from the dataset.
 */
export function energyClassTable(sizeM2) {
  const size = sizeM2 || 100
  return Object.values(data.energy_classes.classes).map((c) => {
    const perYear = c.typical_heating_cost_chf_per_m2_per_year
    return {
      label: c.label,
      description: c.description,
      perM2Year: perYear,
      annual: Math.round(perYear * size),
      tenYear: Math.round(perYear * size * 10),
      co2PerYear: Math.round(c.co2_kg_per_m2_per_year * size),
      notes: c.notes,
    }
  })
}

/**
 * Compare two energy classes over 10 years for a given size.
 * Defaults to the PRD's "A vs D" framing.
 */
export function energyDelta(sizeM2, betterClass = 'A', worseClass = 'D') {
  const table = energyClassTable(sizeM2)
  const a = table.find((r) => r.label === betterClass)
  const b = table.find((r) => r.label === worseClass)
  if (!a || !b) return null
  return {
    better: a,
    worse: b,
    annualSaving: b.annual - a.annual,
    tenYearSaving: b.tenYear - a.tenYear,
  }
}

/** Minergie standards explainer rows. */
export function minergieStandards() {
  return Object.values(data.minergie.standards).map((s) => ({
    label: s.label,
    description: s.description,
    buildPremiumPct: s.construction_cost_premium_pct,
    renovationPremiumPct: s.renovation_cost_premium_pct,
    energySavingPct: s.annual_energy_saving_pct_vs_unrenovated,
    resalePremiumPct: s.resale_premium_pct,
    url: s.url,
  }))
}

/** Canton subsidy picture: cantonal programme + federal baseline ranges. */
export function subsidyOverview(cantonCode) {
  const c = getCanton(cantonCode)
  if (!c) return null
  const fed = data.gebaeudeprogramm_federal
  // A canton row can in principle be added without its programme block; the
  // federal baseline is still useful on its own, so degrade rather than throw.
  const g = c.gebaeudeprogramm
  return {
    cantonal: {
      available: g?.available ?? false,
      url: g?.url ?? null,
      measures: g?.key_measures ?? [],
      notes: g?.notes ?? null,
    },
    federal: {
      url: fed.url,
      ranges: fed.typical_subsidy_ranges,
      eligibility: fed.eligibility,
    },
  }
}

export const SUSTAINABILITY_PRIORITIES = [
  {
    value: 'energy',
    label: 'Energy efficiency',
    blurb:
      'Lower running costs and a better GEAK class. The biggest lever on the ' +
      '10-year cost of owning.',
  },
  {
    value: 'solar',
    label: 'Solar potential',
    blurb:
      'Roof orientation and local sunshine. In sunny cantons this is a real ' +
      'financial asset, not just a green badge.',
  },
  {
    value: 'heating',
    label: 'Heating type',
    blurb:
      'Heat pump vs. oil/gas. Fossil systems carry rising cost and regulatory ' +
      'risk — replacement may become mandatory.',
  },
  {
    value: 'minergie',
    label: 'Minergie label',
    blurb:
      'A certified standard with a known cost premium and resale advantage. ' +
      'Some banks offer better conditions for it.',
  },
]
