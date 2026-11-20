/**
 * Resilient-build explorer conformance — data shape, geometry, premiums
 * inside their house-share band, energy paths, the same-budget solver, and
 * the share-link round trip. Run: npm run test:resilience
 */
import {
  WALLS, ARCHETYPES, PRICE_PATHS, HORIZONS, getWall, defaultWallFor, geometry, escalationFor,
  energyPath, baseBuildCost, envelopePremium, archetypeColumn, sqftForBudget, compareBuilds,
  breakEven, pathsSideBySide, beyondEnergy, moistureRisk,
} from '../src/markets/us/resilience/model.js'
import { annualEnergyCost } from '../src/markets/us/home.js'
import rd from '../src/markets/us/resilience/resilience-data.json' with { type: 'json' }
import home from '../src/markets/us/us-home-data.json' with { type: 'json' }
import usData from '../src/markets/us/us-data.json' with { type: 'json' }
import { HAZARDS, ratingLevel, stateRisk, abbrForFips, hurricaneLossCut, hurricaneLoss } from '../src/markets/us/hazards/model.js'
import nri from '../src/markets/us/hazards/nri-states.json' with { type: 'json' }
import { encodeState, decodeState } from '../src/lib/share.js'

let pass = 0
let fail = 0
const near = (a, b, tol) => Math.abs(a - b) <= tol
function check(name, ok, detail = '') {
  if (ok) pass++
  else { fail++; console.error(`✗ ${name}${detail ? ' — ' + detail : ''}`) }
}
const eq = (name, got, want, tol = 0.5) => check(name, near(got, want, tol), `got ${got}, want ${want}`)
const STATES = Object.keys(home.states)

// ── 1. Data shape ───────────────────────────────────────────────────────────
check('eight wall assemblies', WALLS.length === 8)
for (const w of WALLS) {
  check(`${w.id}: has label, layers, thickness, R, ACH50`, !!w.label && w.layers.length >= 3 && w.thickness_in && w.r_whole_wall && w.ach50_typical)
  check(`${w.id}: R band ordered`, w.r_whole_wall.low <= w.r_whole_wall.high)
  if (!w.baseline) {
    check(`${w.id}: cost band and house-share band`, w.added_cost_per_sqft_wall_usd && w.premium_pct_of_house && w.added_cost_per_sqft_wall_usd.low <= w.added_cost_per_sqft_wall_usd.high)
    check(`${w.id}: at least one source`, w.sources.length >= 1)
    check(`${w.id}: hazard fit for the four hazards`, ['hurricane', 'wildfire', 'hail', 'flood'].every((h) => ['good', 'neutral', 'poor'].includes(w.hazard_fit[h])))
  }
}
check('four archetypes A–D', ARCHETYPES.map((a) => a.id).join('') === 'ABCD')
check('every archetype wall exists', ARCHETYPES.every((a) => (a.wall ? !!getWall(a.wall) : Object.values(a.wall_by_climate).every((id) => !!getWall(id)))))
check('D wall options all exist', ARCHETYPES.find((a) => a.id === 'D').wall_options.every((id) => !!getWall(id)))
check('HERS falls A → B → D', (() => { const h = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a.hers])); return h.A > h.C && h.C > h.B && h.B > h.D })())
check('A HERS = dataset typical existing', ARCHETYPES.find((a) => a.id === 'A').hers === home.hers.typical_existing)
check('every state has a climate bucket', STATES.every((s) => ['cold', 'mixed', 'hot'].includes(rd.state_climate[s])))
check('three price paths with sources', ['ref', 'high', 'low'].every((p) => typeof PRICE_PATHS[p].escalation_pct === 'number') && rd.price_paths.sources.length > 0)
check('horizons 10/20/30', HORIZONS.join(',') === '10,20,30')

// ── 2. Geometry and defaults ────────────────────────────────────────────────
eq('two-storey wall area = 0.9 × floor', geometry(2000, 2).wallSqft, 1800, 0)
eq('one-storey wall area = 1.2 × floor', geometry(2000, 1).wallSqft, 2400, 0)
eq('windows = 15% of floor', geometry(2000, 2).windowSqft, 300, 0)
check('D defaults to double-stud in CO, ICF in FL', defaultWallFor('D', 'CO') === 'double_stud' && defaultWallFor('D', 'FL') === 'icf')
check('A and B have fixed walls', defaultWallFor('A', 'TX') === 'older' && defaultWallFor('B', 'TX') === 'code2x6')
eq('custom escalation clamps to 20%', escalationFor(50), 0.2, 1e-9)
eq('ref path = data', escalationFor('ref'), rd.price_paths.ref.escalation_pct / 100, 1e-9)

// ── 3. Energy path ──────────────────────────────────────────────────────────
const ep = energyPath('TX', 2000, 130, 10, 'ref')
eq('year 1 = annual energy cost', ep.years[0], Math.round(annualEnergyCost('TX', 2000, 130)), 1)
eq('cumulative at 0% = 10 × annual', energyPath('TX', 2000, 130, 10, 0).cumulative, annualEnergyCost('TX', 2000, 130) * 10, 2)
check('high path costs more than low', energyPath('TX', 2000, 130, 30, 'high').cumulative > energyPath('TX', 2000, 130, 30, 'low').cumulative)
check('D uses a quarter of A\'s energy', near(energyPath('TX', 2000, 30, 10, 0).cumulative / energyPath('TX', 2000, 130, 10, 0).cumulative, 30 / 130, 0.01))

// ── 4. Premiums land inside the wall's house-share band ─────────────────────
for (const st of ['CO', 'TX', 'FL', 'MA']) {
  for (const sq of [1500, 2500, 3500]) {
    const b = envelopePremium(st, sq, 2, 'B')
    eq(`${st} ${sq}: code-built premium is zero`, b.total.mid, 0, 0)
    const d = envelopePremium(st, sq, 2, 'D')
    check(`${st} ${sq}: D wall share ${d.wallPctOfHouse}% within ${d.wall.id} band ${d.pctBand.low}–${d.pctBand.high}% (±0.5)`, d.pctInBand)
    check(`${st} ${sq}: D total premium ${d.pctOfHouse}% is a sane share of the house (3–30%)`, d.pctOfHouse >= 3 && d.pctOfHouse <= 30)
    for (const w of ['ext_mw', 'icf', 'aac', 'prefab_timber', 'sips']) {
      const x = envelopePremium(st, sq, 2, 'D', w)
      check(`${st} ${sq}: D/${w} wall share ${x.wallPctOfHouse}% within ${x.pctBand.low}–${x.pctBand.high}%`, x.pctInBand)
    }
  }
}
const c = envelopePremium('TX', 2000, 2, 'C')
check('retrofit C counts full heat-pump and HPWH cost', c.parts.systems.mid > rd.systems.erv_usd.high)
check('D counts the new-build increment only', envelopePremium('TX', 2000, 2, 'D').parts.systems.mid < c.parts.systems.mid)
check('triple-pane delta on windows for C and D, none for B', c.parts.windows.mid > 0 && envelopePremium('TX', 2000, 2, 'B').parts.windows.mid === 0)

// ── 5. Columns and total cost ───────────────────────────────────────────────
const colB = archetypeColumn('CO', 2000, 2, 30, 'ref', 'B')
const colD = archetypeColumn('CO', 2000, 2, 30, 'ref', 'D')
const colA = archetypeColumn('CO', 2000, 2, 30, 'ref', 'A')
eq('B upfront = base build cost', colB.upfront.mid, baseBuildCost('CO', 2000).mid, 1)
check('D upfront = base + premium', near(colD.upfront.mid, colB.upfront.mid + colD.premium.total.mid, 1))
check('A has no build cost', colA.upfront.mid === 0)
check('D energy < B energy < A energy over 30 years', colD.energy.cumulative < colB.energy.cumulative && colB.energy.cumulative < colA.energy.cumulative)
check('TCO = upfront + energy + maintenance', near(colD.tco.mid, colD.upfront.mid + colD.energy.cumulative + colD.maintenance, 1))
check('D carries the resale premium band', !!colD.resalePremiumPct && colB.resalePremiumPct === null)

// ── 6. Same-budget solver ───────────────────────────────────────────────────
const sB = sqftForBudget('CO', 500000, 2, 'B')
const sD = sqftForBudget('CO', 500000, 2, 'D')
eq('B at budget = budget ÷ mid $/sq ft', sB, Math.round(500000 / home.states.CO.build_cost_per_sqft.mid), 1)
check('D buys fewer square feet for the same budget', sD < sB && sD > sB * 0.8)
const dCost = baseBuildCost('CO', sD).mid + envelopePremium('CO', sD, 2, 'D').total.mid
check('D solver lands on the budget', near(dCost, 500000, 500))
check('retrofit archetype has no budget size', sqftForBudget('CO', 500000, 2, 'C') === null)

// ── 7. compareBuilds ────────────────────────────────────────────────────────
const cmp = compareBuilds({ stateCode: 'CO', mode: 'size', sqft: 2000, horizon: 30, pricePath: 'ref' })
check('size mode: four columns, B first', cmp.columns.length === 4 && cmp.columns[0].id === 'B')
check('size mode: all columns same sqft', cmp.columns.every((x) => x.sqft === 2000))
check('bVsD premium positive, energy saved positive', cmp.bVsD.premium > 0 && cmp.bVsD.energySaved > 0)
const cmpB = compareBuilds({ stateCode: 'CO', mode: 'budget', budget: 500000, horizon: 30, pricePath: 'high', wallD: 'icf' })
check('budget mode: D smaller than B', cmpB.byId.D.sqft < cmpB.byId.B.sqft && cmpB.sized.B === cmpB.byId.B.sqft)
check('budget mode: wall override honoured', cmpB.byId.D.wall.id === 'icf' && cmpB.wallD === 'icf')
check('invalid wall override falls back to climate default', compareBuilds({ stateCode: 'FL', mode: 'size', sqft: 1800, wallD: 'nope' }).wallD === 'icf')
check('retrofit ordering puts A, C first', compareBuilds({ stateCode: 'CO', mode: 'size', sqft: 2000, retrofit: true }).columns[0].id === 'A')
check('unknown state → null', compareBuilds({ stateCode: 'ZZ', mode: 'size', sqft: 2000 }) === null)
check('bad horizon → 30', compareBuilds({ stateCode: 'CO', mode: 'size', sqft: 2000, horizon: 17 }).horizon === 30)

// ── 7b. Payback: break-even escalation and the three price paths ───────────
{
  const h = 30
  const r = compareBuilds({ stateCode: 'NY', mode: 'size', sqft: 2000, horizon: h, pricePath: 'ref' })
  const be = r.payback.bToD.breakEven
  check('break-even found for NY Swiss-grade at 30 yrs', be.verdict === 'at' && be.pct > -10 && be.pct < 20, JSON.stringify(be))
  // At the break-even rise, the energy saved over the horizon equals the premium.
  const g = be.pct / 100
  const factor = Math.abs(g) < 1e-9 ? h : (Math.pow(1 + g, h) - 1) / g
  check('saving at break-even ≈ premium', near(be.annualSaving * factor, be.premium, be.premium * 0.01 + 50), `${be.annualSaving * factor} vs ${be.premium}`)
  const paths = r.payback.bToD.paths
  check('three price paths, low → high', paths.map((p) => p.id).join() === 'low,ref,high')
  check('saving grows with the price path', paths[0].saved < paths[1].saved && paths[1].saved < paths[2].saved)
  check('reference path matches the main comparison', near(paths[1].saved, r.bVsD.energySaved, 2))
  check('paysBack agrees with break-even', paths.every((p) => p.paysBack === (p.escalationPct >= be.pct - 0.05)))
  check('longer horizon lowers the break-even', compareBuilds({ stateCode: 'NY', mode: 'size', sqft: 2000, horizon: 20 }).payback.bToD.breakEven.pct > be.pct)
  check('10 yrs in CO: never pays back on energy alone', compareBuilds({ stateCode: 'CO', mode: 'size', sqft: 2000, horizon: 10 }).payback.bToD.breakEven.verdict === 'never')
  check('same budget (no premium) → always', compareBuilds({ stateCode: 'CO', mode: 'budget', budget: 500000, horizon: 30 }).payback.bToD.breakEven.verdict === 'always')
  check('retrofit pair present', r.payback.aToC && r.payback.aToC.breakEven && r.payback.aToC.paths.length === 3)
  check('breakEven null-safe', breakEven(null, null, 30) === null && pathsSideBySide(null, null, 30) === null)
}

// ── 7c. Beyond energy: hazards, moisture, insurance ──────────────────────────
{
  const r = compareBuilds({ stateCode: 'FL', mode: 'size', sqft: 2000, horizon: 30, pricePath: 'ref' })
  const b = r.beyond
  check('beyond present for every column', b && r.columns.every((c) => b.byId[c.id]))
  check('ICF Swiss-grade in FL: hurricane strong, fire-safe', b.byId.D.hazards.hurricane === 'good' && b.byId.D.fire === 'good')
  check('older home: weak on every hazard', Object.values(b.byId.A.hazards).every((v) => v === 'poor'))
  check('moisture rule: vapour-open + ERV = low', moistureRisk({ vapour_open: true }, ['erv']) === 'low')
  check('moisture rule: one of two = moderate', moistureRisk({ vapour_open: false }, ['erv']) === 'moderate' && moistureRisk({ vapour_open: true }, []) === 'moderate')
  check('moisture rule: none = higher', moistureRisk({ vapour_open: false }, []) === 'higher')
  const rate = usData.states.FL.insurance_rate_pct
  check('insurance = state rate × value × years', near(b.byId.B.insurance, Math.round((b.byId.B.insuredValue * rate) / 100) * 30, 1))
  check('older home insured on base cost', b.byId.A.insuredValue === Math.round(r.byId.A.base.mid))
  check('total with insurance = TCO + insurance', r.columns.every((c) => b.byId[c.id].totalWithInsurance === c.tco.mid + b.byId[c.id].insurance))
  check('discount: ICF may qualify, code-built not', b.byId.D.mayQualifyDiscount && !b.byId.B.mayQualifyDiscount)
  check('unknown state → beyondEnergy null', beyondEnergy(r.columns, 'ZZ', 30) === null)
}

// ── 7d. Climate risk: FEMA NRI state table and the hurricane loss cut ─────────
{
  check('NRI: 50 states + DC present', ['AL','AK','AZ','CA','CO','FL','NY','TX','WY','DC'].every((s) => stateRisk(s)) && Object.keys(nri.states).length >= 51)
  check('NRI: every state has the five hazards', Object.values(nri.states).every((s) => HAZARDS.every((h) => s[h] && typeof s[h].rating === 'string')))
  check('NRI: Florida hurricane is Very High', stateRisk('FL').hurricane.rating === 'Very High' && ratingLevel('Very High') === 4)
  check('NRI: Colorado hurricane not applicable', ratingLevel(stateRisk('CO').hurricane.rating) === null)
  check('NRI: loss rates are fractions', Object.values(nri.states).every((s) => HAZARDS.every((h) => s[h].buildingLossRate >= 0 && s[h].buildingLossRate < 0.05)))
  check('FIPS 12 is Florida, 08 Colorado', abbrForFips('12') === 'FL' && abbrForFips(8) === 'CO')
  const cut = hurricaneLossCut()
  check('loss cut = 1 − (1−freq)(1−sev), 62–84%', near(cut.low, 0.6175, 1e-9) && near(cut.high, 0.844, 1e-9))
  const l = hurricaneLoss('FL', 330000, 386600, 30, true)
  check('FL typical loss = value × rate', l.typical.perYear === Math.round(330000 * stateRisk('FL').hurricane.buildingLossRate))
  check('FL resistant loss below typical', l.resistant.perYear.high < l.typical.perYear && l.resistant.perYear.low < l.resistant.perYear.high)
  check('30-year total = yearly × 30 (rounding)', Math.abs(l.typical.total - l.typical.perYear * 30) <= 30)
  const noCut = hurricaneLoss('FL', 330000, 386600, 30, false)
  check('wall not strong → no cut', noCut.resistant.perYear.low === noCut.resistant.perYear.high && noCut.resistant.perYear.low === Math.round(386600 * stateRisk('FL').hurricane.buildingLossRate))
  check('no hurricane exposure → null', hurricaneLoss('CO', 330000, 386600, 30) === null)
}

// ── 8. Share-link round trip ────────────────────────────────────────────────
const enc = encodeState({ market: 'us', canton: 'CO', buildOpen: '1', buildMode: 'budget', buildSqft: '2,000', buildBudget: '500,000', buildStoreys: '1', buildHorizon: '20', buildPath: 'high', buildWallD: 'icf', buildRetrofit: '1' })
const dec = decodeState(enc)
check('build keys survive the hash', dec.buildOpen === '1' && dec.buildMode === 'budget' && dec.buildSqft === '2000' && dec.buildBudget === '500000' && dec.buildStoreys === '1' && dec.buildHorizon === '20' && dec.buildPath === 'high' && dec.buildWallD === 'icf' && dec.buildRetrofit === '1')
check('mk still first in the hash', enc.startsWith('mk=us'))

console.log(`us-resilience conformance: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
