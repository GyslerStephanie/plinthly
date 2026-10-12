# Feature spec: Resilient build explorer (US)

**Status:** 💡 Idea
**Branch:** `feature/us-resilience`
**Owner:** Stephanie
**Date:** 2026-10-12

Companion docs: [the pitch](../RESILIENT_BUILD_PITCH.md) (why, who, what winning
looks like) and [the Swiss envelope reference](../SWISS_ENVELOPE_US_REFERENCE.md)
(sources, layer drawings, companies). This spec is the part that gets built.

## Why (the problem)

A US owner planning a build or a deep renovation is shown one wall: the code
2x6 stick frame. Nobody puts a Swiss-grade envelope next to it with the cost,
the 30-year energy bill, and what survives a storm. Plinthly already has the
US energy, cost and insurance data and a retrofit configurator; this track
adds the comparison that the data was collected for.

## What (the solution)

A third entry point, **"Compare how to build"**, next to "Can I buy?" and the
rent-vs-buy Compare. No mortgage flow required.

1. **Inputs (one screen):** state (the 9 in the dataset), county or ZIP later
   for hazard; floor area or budget; new build or retrofit; horizon 10 / 20 /
   30 years; fuel today; energy price path (EIA reference / high / low, or a
   slider for annual escalation).
2. **Five archetypes, side by side.** Each archetype is a *wall assembly* plus
   a windows, ventilation and heating package. The user can swap the wall
   inside an archetype (e.g. archetype D with ICF instead of double-stud) and
   the numbers recompute.
3. **The signature scenario:** "same budget, smaller and better". The budget
   fixed, the explorer finds the floor area each archetype affords and shows
   both houses over the horizon.
4. **Outputs:** per-year and cumulative energy under the chosen path; total
   cost of ownership (build premium, energy, maintenance, insurance, expected
   hazard loss); insurance line with FORTIFIED / hardening discount where a
   programme exists; mould and moisture risk score; comfort, carbon, resale as
   secondary rows; share link; printable brief ending in "talk to Stephanie".
5. **Advisor tools:** `run_build_comparison`, `explain_wall_assembly`.

Phase 1 of the build ships items 1 to 3 plus the energy and cost outputs.
Hazard, insurance and the mould score are phase 2 (see the pitch).

## The wall assemblies (the data this spec adds)

Every assembly is one record in `src/markets/us/resilience/resilience-data.json
→ wall_assemblies`. Nothing below is hard-coded in the engine. All costs are
2026 USD, hard cost only, **(est.) until sourced**; the `sources` array on each
record is where the sourcing lands.

| id | Name | Swiss equivalent | Layers, outside → inside | Thickness | Whole-wall R | Typical ACH50 | Added cost, $/sq ft wall | Premium, % of house | Minergie-P as drawn | Climate fit |
|---|---|---|---|---|---|---|---|---|---|---|
| `code2x6` | Code 2x6 stick frame (baseline) | none | siding · WRB · OSB · 2x6 R-20 batt · gypsum | 7 in | R-16 to R-18 | 3.0 | 0 (base wall $18–30) | 0 | no | all |
| `older` | Pre-2000 stick frame (retrofit start) | none | siding · building paper · sheathing · 2x4 R-11 batt or empty · gypsum | 5 in | R-9 to R-11 | 7 to 10 | n/a | n/a | no | all |
| `ext_mw` | 2x6 + exterior mineral wool | Hinterlüftete Fassade | cladding · ventilated strapping · 3–4 in Rockwool CB80 · WRB/air barrier on plywood · 2x6 dense-pack · Intello · gypsum | 11–12 in | R-30 to R-36 | 1.0 to 1.5 | 8 to 15 | 3 to 6 | close; yes at 5 in board | all; the retrofit wall |
| `double_stud` | Double-stud, dense-pack cellulose | Holzrahmenbau (site-built) | siding · strapping · vapour-open WRB · taped plywood · 2x4 + gap + 2x4, 12 in cellulose · Intello · gypsum | 13–14 in | R-40 to R-45 | 0.6 to 1.0 | 3 to 6 | 2 to 4 | yes | zones 4–7 |
| `icf` | Insulated concrete forms | Beton + Dämmung | stucco/veneer · 2.5 in EPS · 6–8 in concrete · 2.5 in EPS · gypsum (+2–3 in ext. mineral wool for P) | 11–16 in | R-22 to R-24; R-35 to R-48 with XR35 / added wool | 0.6 to 1.0 | 10 to 18 | 5 to 10 | with added insulation | all; hurricane, wildfire |
| `aac` | Autoclaved aerated concrete | Ytong / Hebel Backstein | render (+2–4 in mineral wool for P) · 8–12 in AAC block · plaster | 9–16 in | R-11 to R-17 block; R-25 to R-33 with wool | 0.6 to 1.0 | 12 to 20 | 5 to 12 | with 3–4 in wool | hot-humid, hurricane first |
| `prefab_timber` | Prefab timber panel or CLT + wood fibre | Holzbau (prefab) | cladding · ventilated · 2–6 in wood-fibre board · 10–14 in frame panel or 3.5–4 in CLT · service cavity · gypsum | 14–20 in | R-35 to R-50 | 0.3 to 0.6 | 15 to 40 | 5 to 35 | yes | all |
| `sips` | Structural insulated panels | none (closest: Holzbau) | cladding · rainscreen · WRB · OSB · 6.5–12 in EPS core · OSB · gypsum | 8–13 in | R-25 to R-45 | 0.6 to 1.0 | 8 to 14 | 5 to 10 | with added insulation | not wildfire zones |

Record shape (one example):

```json
{
  "id": "double_stud",
  "label": "Double-stud wall, dense-pack cellulose",
  "swiss_equivalent": "Holzrahmenbau, site-built",
  "layers": ["siding", "strapping (rainscreen)", "vapour-open WRB", "taped plywood (air barrier)", "2x4 outer wall", "gap", "2x4 inner wall, 12 in dense-pack cellulose", "smart vapour retarder", "gypsum"],
  "thickness_in": { "low": 13, "high": 14 },
  "r_whole_wall": { "low": 40, "high": 45 },
  "ach50_typical": { "low": 0.6, "high": 1.0 },
  "added_cost_per_sqft_wall_usd": { "low": 3, "high": 6 },
  "premium_pct_of_house": { "low": 2, "high": 4 },
  "minergie_p_as_drawn": true,
  "climate_zones": [4, 5, 6, 7],
  "retrofit_capable": false,
  "hazard_fit": { "hurricane": "neutral", "wildfire": "poor", "hail": "neutral", "flood": "neutral" },
  "vapour_open": true,
  "noncombustible": false,
  "note": "Cheapest route to R-40+. Needs a dense-pack installer who has done a 12 in cavity.",
  "sources": [
    "https://www.finehomebuilding.com/project-guides/framing/thick-walls-faster-cheaper-better-insulated",
    "https://www.greenbuildingadvisor.com/question/cost-of-a-double-stud-wall-with-dense-packed-cellulose"
  ]
}
```

## The archetypes (what the user sees first)

| Archetype | Wall (default) | Windows | Ventilation | Heat | HERS-equivalent (est.) |
|---|---|---|---|---|---|
| A · Older existing home | `older` | double-pane, aged | none (leaky) | gas furnace | 130 (dataset `hers.typical_existing`) |
| B · Code-built new | `code2x6` | double-pane, U-0.30 | exhaust fan | gas furnace or basic heat pump | 58 (2021 IECC new build) |
| C · Deep envelope retrofit | `ext_mw` on `older` | triple-pane replacement | ERV | heat pump + HPWH | 60 to 70 |
| D · Swiss / Passive-grade new build | `double_stud` (cold) or `icf` / `aac` (hot) | triple-pane tilt-turn, U-0.14 | ERV | heat pump + HPWH, optional floor heating | 25 to 35 (PHIUS without solar) |
| E · Resilience package | any of B, C, D | impact-rated where hurricane | as base | as base | as base |

The HERS-equivalents are the bridge to the existing energy model (`home.js
annualEnergyCost(state, sqft, hers)`), so phase 1 needs no new energy physics.
They live in `resilience-data.json → archetypes[].hers` with the reasoning in
`notes`, and get replaced by a wall-by-wall heat-loss model in a later version.

## How the numbers work

Inputs: `state`, `sqft` (or `budget`), `storeys` (1 or 2, default 2), `horizon`
(10 | 20 | 30), `pricePath` (`ref` | `high` | `low` | `{escalationPct}`),
`archetype`, optional `wallId` override, `retrofit` flag.

1. **Geometry.** `wallSqft = sqft × wall_area_factor[storeys]` (data; default 1.2
   for one storey, 0.9 for two) and `windowSqft = sqft × window_area_pct` (data;
   default 15 %). Same convention as `retrofit.js` (roof ≈ 50 % of living area).
2. **Build cost.** Base = `build.cost_per_sqft[state].mid × sqft` (existing data).
   Envelope premium = `wallSqft × wall.added_cost_per_sqft_wall.mid`
   + `windowSqft × (windows.triple_per_sqft − windows.double_per_sqft)`
   + `erv.cost` + `heatpump.cost` (from `measures.items`, already in data).
   Cross-check: the premium must land inside `wall.premium_pct_of_house`; if it
   does not, the UI shows the range and flags the geometry assumption.
   Retrofit (C): premium only, applied to an `older` house the user already owns.
3. **Energy.** `annualEnergyCost(state, sqft, archetype.hers)` from `home.js`,
   escalated per year by the price path: EIA AEO reference / high / low price
   cases per fuel, stored in `resilience-data.json → price_paths` with source
   and vintage, or the user's flat escalation. Cumulative over the horizon.
4. **Same-budget scenario.** Solve `sqft` for each archetype so that
   `base + premium = budget` (monotone in `sqft`, bisection). Show both houses.
5. **Total cost of ownership (phase 1)** = build or retrofit cost + cumulative
   energy + maintenance (`mortgage_rules.maintenance_pct`, existing). Phase 2
   adds insurance (state baseline × hazard discount) and expected annual loss
   (FEMA NRI by county).
6. **Resale** uses `certified_homes.resale_premium_pct` (existing) for D; others 0.

Every constant comes from `resilience-data.json` or the existing
`us-home-data.json`; the engine holds no numbers.

## Where it lives

- **Logic:** `src/markets/us/resilience/model.js` (geometry, premium, energy
  path, same-budget solver); reuses `home.js`, `compare.js` helpers.
- **Data:** `src/markets/us/resilience/resilience-data.json` (`wall_assemblies`,
  `archetypes`, `windows`, `price_paths`, `geometry`, `sources`).
- **UI:** `src/components/us/ResilienceExplore.jsx` (inputs + five columns),
  `ResilienceWallPicker.jsx` (layer drawing + the table above as cards),
  `ResilienceBrief.jsx` (print view). New onboarding branch in
  `components/Onboarding/` routes "I'm building or renovating" here.
- **Advisor:** two tools in `lib/advisorTools.js`, mock in `advisorMock.js`.
- **Learn:** glossary entries for ACH50, whole-wall R, continuous insulation,
  ERV, Minergie-P, PHIUS, FORTIFIED, AAC, ICF, CLT.
- **Tests:** `scripts/us-resilience.conformance.mjs` (data shape, every
  assembly has sources and ranges, premium lands inside the house-percent
  range for 1,500 / 2,500 / 3,500 sq ft, solver converges, share-link
  round-trip).

## Invariants to respect

- [x] No financial input sent off-device
- [x] AI advisor narrates numbers, never computes them
- [x] Rate/ratio constants come from data, not code
- [x] New `lib/` logic has a conformance check in `scripts/`
- [ ] New strings added for all four locales — US is English-only by design

## Done when…

- [ ] A visitor can pick a state, a size or budget and a horizon, and see the
      five archetypes with build premium, cumulative energy and total cost
- [ ] Swapping the wall inside an archetype recomputes everything
- [ ] "Same budget, smaller and better" shows the two floor areas
- [ ] Every wall card shows layers, thickness, R, ACH50, cost range, Swiss
      equivalent and a source link
- [ ] Share link restores the whole state; print brief ends in a contact step
- [ ] Advisor can run the comparison and explain a wall
- [ ] `npm run test:all` passes; `plinthly-qa` run, no Blockers or Majors
- [ ] `FEATURES.md` row flipped to ✅ Shipped

## Out of scope

Structural engineering, product-level quotes, regional labour rates, roof and
foundation assemblies as selectable items (fixed per archetype in v1), county
hazard and insurance (phase 2), a wall-by-wall heat-loss model (later), paid
placement of any kind.
