/**
 * US Phases 3–5 conformance — energy model, upgrade ledger, the three routes,
 * the action plan, and the shape of us-home-data.json (sourced, every state).
 * Run: npm run test:us-home
 */
import {
  energyCostPerSqft, annualEnergyCost, sizeFromBudget, efficiencyTable, heatPumpEffect,
  measureDetails, upgradeLedger, optionNewCertified, optionBuild, DEFAULT_MEASURES, MEASURE_IDS,
} from '../src/markets/us/home.js'
import { buildUsActionPlan } from '../src/markets/us/plan.js'
import { calculateAffordability } from '../src/markets/us/affordability.js'
import home from '../src/markets/us/us-home-data.json' with { type: 'json' }
import market from '../src/markets/us/us-data.json' with { type: 'json' }

let pass = 0
let fail = 0
const near = (a, b, tol) => Math.abs(a - b) <= tol
function check(name, ok, detail = '') {
  if (ok) pass++
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`) }
}
const eq = (name, got, want, tol = 0.5) => check(name, near(got, want, tol), `got ${got}, want ${want}`)
const STATES = ['CA', 'NY', 'TX', 'FL', 'WA', 'MA', 'CO', 'IL', 'GA']
const F = home.energy.recs_to_today_factor

// ── 1. Energy model ──────────────────────────────────────────────────────────
eq('TX cost/sq ft = RECS × escalation', energyCostPerSqft('TX'), 1.04 * F, 1e-9)
eq('cost scales with HERS (130 → 65 halves it)', annualEnergyCost('TX', 2000, 65), annualEnergyCost('TX', 2000, 130) / 2, 1e-6)
eq('typical existing home = state average', annualEnergyCost('MA', 1000, 130), 1.32 * F * 1000, 1e-6)
const t = efficiencyTable('TX', 1800)
check('table: five tiers, best last', t.rows.length === 5 && t.rows[0].id === 'existing' && t.rows[4].id === 'zerh')
check('table: costs fall as HERS falls', t.rows.every((r, i, a) => i === 0 || r.annual <= a[i - 1].annual))
eq('table: ENERGY STAR saving = existing − certified', t.annualSaving, t.rows[0].annual - t.rows[3].annual, 0)
check('unknown state → null', energyCostPerSqft('ZZ') === null && efficiencyTable('ZZ', 1000) === null)

// ── 2. What a budget buys ────────────────────────────────────────────────────
const sz = sizeFromBudget('TX', 315000)
eq('size mid = budget ÷ mid $/sq ft', sz.mid, Math.round(315000 / market.states.TX.price_per_sqft_usd.mid), 0)
check('size: cheap areas buy more', sz.low <= sz.mid && sz.mid <= sz.high)

// ── 3. Heat pump vs gas, per state ──────────────────────────────────────────
// Hand check, TX: gas $19.42/Mcf ÷ 1.037 ÷ 0.95 = $19.71/MMBtu heat;
// heat pump 15.88¢ × 293.07 ÷ 2.8 = $16.62 → heating 15.7% cheaper × 35% share.
eq('TX heat pump ≈ +5.5% of the bill', heatPumpEffect('TX').pctOfTotal * 100, 5.5, 0.1)
check('CA heat pump raises the bill vs gas (33.6¢ power)', heatPumpEffect('CA').pctOfTotal < 0)
check('CO heat pump raises the bill vs cheap gas', heatPumpEffect('CO').pctOfTotal < 0)
check('GA heat pump saves', heatPumpEffect('GA').pctOfTotal > 0)

// ── 4. Upgrade ledger ───────────────────────────────────────────────────────
const md = measureDetails('TX', 1800)
check('every measure listed', md.length === MEASURE_IDS.length)
check('attic scales with size', measureDetails('TX', 3800).find((m) => m.id === 'attic').cost.mid > md.find((m) => m.id === 'attic').cost.mid)
check('heat pump cost does not scale with size', measureDetails('TX', 3800).find((m) => m.id === 'heatpump').cost.mid === md.find((m) => m.id === 'heatpump').cost.mid)
eq('solar cost = $3/W × 8 kW', md.find((m) => m.id === 'solar').cost.mid, 24000, 0)
eq('HPWH saving = 2,750 kWh × TX price', md.find((m) => m.id === 'hpwh').annualSaving, 2750 * 0.1588, 0.5)
const none = upgradeLedger('TX', 1800, [])
check('no measures → no cost, no saving', none.cost.mid === 0 && none.annualSaving === 0 && none.paybackYears === null)
const led = upgradeLedger('TX', 1800, DEFAULT_MEASURES)
check('default plan saves money in TX', led.annualSaving > 0 && led.afterAnnual < led.baselineAnnual)
eq('monthly = annual ÷ 12', led.monthlySaving, led.annualSaving / 12, 0.5)
eq('payback = cost ÷ annual saving', led.paybackYears, led.cost.mid / led.annualSaving, 1e-6)
// Percentage savings compound: attic (11%) + thermostat (4%) = 1 − 0.89 × 0.96
const two = upgradeLedger('TX', 1800, ['attic', 'thermostat'])
eq('percentage savings compound', two.annualSaving, two.baselineAnnual * (1 - 0.89 * 0.96), 1)
check('CA heat pump flagged as raising the bill', upgradeLedger('CA', 1500, ['heatpump']).heatPumpRaisesBill === true)
check('bill never goes negative (big solar)', upgradeLedger('CA', 900, ['solar']).afterAnnual === 0)

// Rebates: never netted off; amount only when the state program is open.
check('TX rebates: not launched → $0 shown', led.rebates.status === 'not_launched' && led.rebates.upTo === 0)
check('CO rebates: open → amount shown', upgradeLedger('CO', 1800, DEFAULT_MEASURES).rebates.upTo > 0)
const caps = home.measures.hear_caps_usd
const co = upgradeLedger('CO', 1800, ['heatpump', 'hpwh', 'attic', 'walls'])
check('rebates respect per-item caps', co.rebates.upTo <= caps.heatPump + caps.hpwh + caps.insulation)
check('insulation measures share one cap', co.rebates.upTo === Math.min(caps.household_total, Math.min(14000, caps.heatPump) + Math.min(3750, caps.hpwh) + caps.insulation))
check('CA waitlist → $0 shown', upgradeLedger('CA', 1500, DEFAULT_MEASURES).rebates.upTo === 0)

// ── 5. Routes B and C ───────────────────────────────────────────────────────
const n = optionNewCertified('TX', 315000, 1800)
eq('new: premium low = 0.3% of budget', n.premium.low, 945, 0)
eq('new: saving matches the table', n.annualSaving, efficiencyTable('TX', 1800).annualSaving, 0)
const b = optionBuild('TX', 2000)
eq('build: mid = $145 × 2,000', b.cost.mid, 290000, 0)
check('build: land never included', b.landIncluded === false)
check('build: soft costs 10–20% of mid', b.softCosts.low === 29000 && b.softCosts.high === 58000)

// ── 6. Action plan ──────────────────────────────────────────────────────────
const viable = calculateAffordability({ grossIncome: 120000, savings: 80000, monthlyDebts: 600, downPct: 10, state: 'TX', rate: 0.074 })
for (const option of ['upgrade', 'new', 'build', undefined]) {
  const plan = buildUsActionPlan({ result: viable, state: 'TX', budget: 315000, option, measures: DEFAULT_MEASURES })
  check(`plan (${option || 'no route'}): 3–5 steps`, plan.length >= 3 && plan.length <= 5)
  check(`plan (${option || 'no route'}): every link is https`, plan.every((s) => s.links.every((l) => /^https:\/\//.test(l.url))))
  check(`plan (${option || 'no route'}): no CHF / canton / pillar`, !/CHF|canton|pillar/i.test(JSON.stringify(plan)))
}
check('plan: viable buyer starts with pre-approval', buildUsActionPlan({ result: viable, state: 'TX', budget: 315000 })[0].title.startsWith('Get pre-approved'))
const poor = calculateAffordability({ grossIncome: 90000, savings: 5000, downPct: 10, state: 'TX', rate: 0.074 })
check('plan: unviable buyer starts with the gap', buildUsActionPlan({ result: poor, state: 'TX', budget: 150000 })[0].tone === 'amber')
check('plan: the state program is named', buildUsActionPlan({ result: viable, state: 'GA', budget: 300000 })[1].body.includes('Georgia Dream'))

// ── 7. Data file ────────────────────────────────────────────────────────────
for (const c of STATES) {
  const s = home.states[c]
  check(`${c}: energy prices`, s.electricity_cents_per_kwh > 5 && s.gas_usd_per_mcf > 5 && s.energy_usd_per_sqft_2020 > 0)
  check(`${c}: solar yield`, s.solar_kwh_per_kw > 900 && s.solar_kwh_per_kw < 2000)
  check(`${c}: rebate status is known`, ['open', 'waitlist', 'paused', 'not_launched', 'unclear'].includes(s.ira_rebates.status) && /^https:\/\//.test(s.ira_rebates.url))
  check(`${c}: programs with links`, s.programs.length > 0 && s.programs.every((p) => /^https:\/\//.test(p.url)))
  check(`${c}: build cost band`, s.build_cost_per_sqft.low < s.build_cost_per_sqft.mid && s.build_cost_per_sqft.mid < s.build_cost_per_sqft.high)
  check(`${c}: first-time buyer program`, s.buyer_programs.length > 0 && /^https:\/\//.test(s.buyer_programs[0].url))
  check(`${c}: net metering note`, typeof s.net_metering === 'string' && s.net_metering.length > 10)
}
check('every section cites sources', ['energy', 'hers', 'certified_homes', 'measures', 'federal_incentives', 'build'].every((k) => home[k].sources && home[k].sources.length))
check('HERS tiers sorted worst → best', home.hers.tiers.every((t2, i, a) => i === 0 || t2.hers < a[i - 1].hers))
check('default measures exist', DEFAULT_MEASURES.every((id) => MEASURE_IDS.includes(id)))

console.log(`\nUS home conformance: ${pass} passed, ${fail} failed (${pass + fail} checks)`)
if (fail > 0) process.exit(1)
console.log('✓ All checks passed.')
