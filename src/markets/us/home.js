/**
 * US Phases 3–4 — what a budget buys, what efficiency costs, the upgrade
 * configurator, and the three routes (upgrade / buy new certified / build).
 *
 * Pure logic over us-home-data.json (+ us-data.json for $/sq ft). Every
 * constant comes from data; figures are indicative ranges and the UI says so.
 *
 * Energy model, in one line: a home's annual energy cost = the state's average
 * energy cost per sq ft (EIA RECS, escalated to today) × size × (HERS ÷ 130),
 * treating the state's average home as a typical existing home (HERS ≈ 130).
 */
import home from './us-home-data.json'
import market from './us-data.json'

const E = home.energy
const H = home.hers
const M = home.measures

const stateHome = (code) => home.states[code] || null
const stateMarket = (code) => market.states[code] || null

/** Average energy cost per sq ft per year today, USD. */
export function energyCostPerSqft(stateCode) {
  const s = stateHome(stateCode)
  return s ? s.energy_usd_per_sqft_2020 * E.recs_to_today_factor : null
}

/** Annual energy cost of a home of `sqft` at a HERS score. */
export function annualEnergyCost(stateCode, sqft, hers) {
  const perSqft = energyCostPerSqft(stateCode)
  if (perSqft == null || !(sqft > 0)) return null
  return perSqft * sqft * (hers / H.typical_existing)
}

/** Size range a budget buys, from the state's $/sq ft band (cheap areas → more space). */
export function sizeFromBudget(stateCode, budget) {
  const st = stateMarket(stateCode)
  if (!st || !(budget > 0)) return null
  const b = st.price_per_sqft_usd
  return {
    low: Math.round(budget / b.high),
    mid: Math.round(budget / b.mid),
    high: Math.round(budget / b.low),
    pricePerSqft: b,
  }
}

/** 10-year running cost by HERS tier, plus the existing → ENERGY STAR delta. */
export function efficiencyTable(stateCode, sqft) {
  if (energyCostPerSqft(stateCode) == null || !(sqft > 0)) return null
  const rows = H.tiers.map((t) => {
    const annual = annualEnergyCost(stateCode, sqft, t.hers)
    return { ...t, annual: Math.round(annual), tenYear: Math.round(annual * 10) }
  })
  const existing = rows.find((r) => r.id === 'existing')
  const star = rows.find((r) => r.id === 'energyStar')
  return {
    rows,
    tenYearSaving: existing.tenYear - star.tenYear,
    annualSaving: existing.annual - star.annual,
  }
}

/**
 * Heat pump vs gas furnace: effect on the whole energy bill as a fraction
 * (positive = saves, negative = costs more). Cost per unit of delivered heat
 * from local prices: gas ÷ furnace efficiency vs electricity ÷ heat-pump COP.
 */
export function heatPumpEffect(stateCode) {
  const s = stateHome(stateCode)
  if (!s) return null
  const gasPerMmbtu = s.gas_usd_per_mcf / E.mmbtu_per_mcf / E.gas_furnace_efficiency
  const hpPerMmbtu = ((s.electricity_cents_per_kwh / 100) * E.kwh_per_mmbtu) / E.heat_pump_seasonal_cop
  const heatingChange = 1 - hpPerMmbtu / gasPerMmbtu
  return { pctOfTotal: heatingChange * E.heating_share_of_energy_cost, gasPerMmbtu, hpPerMmbtu }
}

function measureCost(m, sqft) {
  if (m.cost_usd_per_watt) {
    const c = m.cost_usd_per_watt * m.system_kw * 1000
    return { low: c, mid: c, high: c }
  }
  const k = m.scales_with_size ? sqft / M.reference_sqft : 1
  return {
    low: Math.round(m.cost_usd.low * k),
    mid: Math.round(((m.cost_usd.low + m.cost_usd.high) / 2) * k),
    high: Math.round(m.cost_usd.high * k),
  }
}

/** Annual saving in USD for one measure on a home with `baseline` annual cost. */
function measureSaving(m, stateCode, baseline) {
  const s = stateHome(stateCode)
  const price = s.electricity_cents_per_kwh / 100
  if (m.savings_pct_of_total != null) return { pct: m.savings_pct_of_total / 100, fixed: 0 }
  if (m.savings === 'heat_pump_vs_gas') return { pct: heatPumpEffect(stateCode).pctOfTotal, fixed: 0 }
  if (m.savings_kwh_per_year != null) return { pct: 0, fixed: m.savings_kwh_per_year * price }
  if (m.savings_usd_per_year) return { pct: 0, fixed: (m.savings_usd_per_year.low + m.savings_usd_per_year.high) / 2 }
  if (m.system_kw) {
    const kwh = m.system_kw * s.solar_kwh_per_kw
    const valueShare = m.self_consumption_share + (1 - m.self_consumption_share) * (s.solar_export_value_pct / 100)
    return { pct: 0, fixed: kwh * price * valueShare, kwh }
  }
  return { pct: 0, fixed: 0 }
}

/** Per-measure cost and stand-alone annual saving, for the toggle list. */
export function measureDetails(stateCode, sqft) {
  if (!stateHome(stateCode) || !(sqft > 0)) return []
  const baseline = annualEnergyCost(stateCode, sqft, H.typical_existing)
  return M.items.map((m) => {
    const sv = measureSaving(m, stateCode, baseline)
    return {
      id: m.id,
      group: m.group,
      cost: measureCost(m, sqft),
      annualSaving: Math.round(sv.pct * baseline + sv.fixed),
      note: m.note,
    }
  })
}

/** Rebate status for the state's IRA Home Energy Rebates program. */
export function rebateStatus(stateCode) {
  const s = stateHome(stateCode)
  return s ? s.ira_rebates : null
}

/**
 * Upgrade ledger for a selection of measures on an existing home.
 * Percentage savings compound; fixed-dollar savings add. Rebates are NOT
 * netted off: they're income-limited and the programs' status varies, so the
 * ledger reports them separately as "up to, if eligible and the program is open".
 */
export function upgradeLedger(stateCode, sqft, selectedIds) {
  if (!stateHome(stateCode) || !(sqft > 0)) return null
  const chosen = M.items.filter((m) => selectedIds.includes(m.id))
  const baseline = annualEnergyCost(stateCode, sqft, H.typical_existing)
  let remaining = 1
  let fixed = 0
  const cost = { low: 0, mid: 0, high: 0 }
  const capped = {}
  for (const m of chosen) {
    const sv = measureSaving(m, stateCode, baseline)
    remaining *= 1 - sv.pct
    fixed += sv.fixed
    const c = measureCost(m, sqft)
    cost.low += c.low
    cost.mid += c.mid
    cost.high += c.high
    if (m.hear_cap_group) capped[m.hear_cap_group] = (capped[m.hear_cap_group] || 0) + c.mid
  }
  const afterAnnual = Math.max(0, baseline * remaining - fixed)
  // Rounded once, so every figure derived from it matches what the UI shows.
  const annualSaving = Math.round(baseline - afterAnnual)
  const caps = M.hear_caps_usd
  const potentialRebate = Math.min(
    caps.household_total,
    Object.entries(capped).reduce((sum, [group, spend]) => sum + Math.min(spend, caps[group] || 0), 0),
  )
  const status = rebateStatus(stateCode)
  const hp = selectedIds.includes('heatpump') ? heatPumpEffect(stateCode) : null
  return {
    selected: chosen.map((m) => m.id),
    cost,
    baselineAnnual: Math.round(baseline),
    afterAnnual: Math.round(afterAnnual),
    annualSaving,
    monthlySaving: Math.round(annualSaving / 12),
    tenYearSaving: Math.round(annualSaving * 10),
    paybackYears: annualSaving > 0 ? cost.mid / annualSaving : null,
    heatPumpRaisesBill: hp ? hp.pctOfTotal < 0 : false,
    rebates: {
      status: status.status,
      program: status.program,
      url: status.url,
      note: status.note,
      upTo: status.status === 'open' ? Math.round(potentialRebate) : 0,
      upToIfOpen: Math.round(potentialRebate),
    },
  }
}

/** Route B — buy a new ENERGY STAR / Zero Energy Ready home at the same budget. */
export function optionNewCertified(stateCode, budget, sqft) {
  const t = efficiencyTable(stateCode, sqft)
  if (!t || !(budget > 0)) return null
  const C = home.certified_homes
  return {
    premium: {
      low: Math.round((budget * C.build_premium_pct.low) / 100),
      high: Math.round((budget * C.build_premium_pct.high) / 100),
    },
    annualSaving: t.annualSaving,
    tenYearSaving: t.tenYearSaving,
    resalePremiumPct: C.resale_premium_pct,
    existingAnnual: t.rows.find((r) => r.id === 'existing').annual,
    certifiedAnnual: t.rows.find((r) => r.id === 'energyStar').annual,
  }
}

export const DEFAULT_MEASURES = M.default_selection
export const MEASURE_IDS = M.items.map((m) => m.id)
export const homeData = home

/** Route C — build on a lot. Construction only: land is not in the dataset. */
export function optionBuild(stateCode, sqft) {
  const s = stateHome(stateCode)
  if (!s || !(sqft > 0)) return null
  const B = home.build
  const per = s.build_cost_per_sqft
  const cost = { low: per.low * sqft, mid: per.mid * sqft, high: per.high * sqft }
  return {
    perSqft: per,
    cost,
    softCosts: { low: Math.round((cost.mid * B.soft_costs_pct.low) / 100), high: Math.round((cost.mid * B.soft_costs_pct.high) / 100) },
    efficientPremium: {
      low: Math.round((cost.mid * B.efficient_premium_pct.zerh.low) / 100),
      high: Math.round((cost.mid * B.efficient_premium_pct.zerh.high) / 100),
    },
    timelineMonths: B.timeline_months,
    landIncluded: false,
  }
}

/**
 * "More ways to make your home sustainable": water, outdoors, envelope and
 * systems measures beyond the energy ledger, with the state's rainwater rule
 * and landscape rebate. Display data only: no savings are modelled here, so
 * nothing in it feeds the routes or the plan's figures.
 *
 * @returns {{ groups: Array<{id, items: Array}>, state: object, notes: string } | null}
 */
export function sustainabilityFor(stateCode) {
  const S = homeData.sustainability
  const st = S.states[stateCode]
  if (!st) return null
  const groups = S.groups.map((g) => ({
    id: g,
    items: Object.entries(S.measures)
      .filter(([, m]) => m.group === g)
      .map(([id, m]) => ({ id, ...m, goodFit: m.best_in.includes(stateCode) }))
      // Climate fits first, data order otherwise (sort is stable).
      .sort((a, b) => Number(b.goodFit) - Number(a.goodFit)),
  }))
  return { groups, state: st, notes: S.notes, lastChecked: S.last_checked }
}
