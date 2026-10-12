/**
 * Resilient-build explorer conformance — data shape, geometry, premiums
 * inside their house-share band, energy paths, the same-budget solver, and
 * the share-link round trip. Run: npm run test:resilience
 */
import {
  WALLS, ARCHETYPES, PRICE_PATHS, HORIZONS, getWall, defaultWallFor, geometry, escalationFor,
  energyPath, baseBuildCost, envelopePremium, archetypeColumn, sqftForBudget, compareBuilds,
} from '../src/markets/us/resilience/model.js'
import { annualEnergyCost } from '../src/markets/us/home.js'
import rd from '../src/markets/us/resilience/resilience-data.json' with { type: 'json' }
import home from '../src/markets/us/us-home-data.json' with { type: 'json' }
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

// ── 8. Share-link round trip ────────────────────────────────────────────────
const enc = encodeState({ market: 'us', canton: 'CO', buildOpen: '1', buildMode: 'budget', buildSqft: '2,000', buildBudget: '500,000', buildStoreys: '1', buildHorizon: '20', buildPath: 'high', buildWallD: 'icf', buildRetrofit: '1' })
const dec = decodeState(enc)
check('build keys survive the hash', dec.buildOpen === '1' && dec.buildMode === 'budget' && dec.buildSqft === '2000' && dec.buildBudget === '500000' && dec.buildStoreys === '1' && dec.buildHorizon === '20' && dec.buildPath === 'high' && dec.buildWallD === 'icf' && dec.buildRetrofit === '1')
check('mk still first in the hash', enc.startsWith('mk=us'))

console.log(`us-resilience conformance: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
