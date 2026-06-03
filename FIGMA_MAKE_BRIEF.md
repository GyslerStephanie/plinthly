# Designify — Figma Make build brief

A complete, precise specification to recreate the app in Figma Make (React + Tailwind).
Hand the **§0 prompt** to Figma Make first, then use the appendices to refine each phase.

---

## §0 — Paste-this-first prompt

> Build a client-side React + Tailwind web app called **Designify**, a Swiss
> sustainable real-estate explorer for first-time buyers. It's a **single-page,
> 4-phase guided flow** (no backend; all logic runs in the browser against a
> static JSON dataset). Phases: **1 Can I buy? → 2 What to look for → 3 My real
> options → 4 Action plan**, with a clickable stepper (you can jump back to any
> visited phase), Back/Continue buttons, and state encoded in the URL hash so any
> view is shareable. Four languages (EN/DE/FR/IT) via a header language switcher;
> show an amber "machine-translated — review recommended" banner for non-English.
> Swiss number formatting throughout: `CHF` prefix, apostrophe thousands
> separators (e.g. `CHF 1'250'000`), identical across all languages.
>
> Design system: clean, trustworthy, editorial. Primary **teal-700** (#0f766e),
> neutral **slate** scale, **amber** for warnings/"surprises", an **A–G energy
> colour scale** (emerald→green→lime→yellow→amber→orange→red). Font **Inter**.
> Rounded-2xl cards with subtle borders/shadows, uppercase letter-spaced section
> titles, tabular-nums for all figures. Mobile-responsive (cards stack; Phase 1 is
> a 2-column grid of form | results on desktop).
>
> Core principle: **honest before optimistic** — never overstate buying power,
> always round the max price *down*, and surface the second-order surprises
> first-time buyers get wrong. See the calculation reference for exact formulas.

---

## §1 — Global shell

- **Header**: square teal "D" logo + "Designify" + tagline "Swiss Sustainable
  Real Estate Explorer". Right side: trust badge "No selling · No sign-up · Just
  honest numbers" (hidden on small screens) + **language switcher** (select:
  EN/DE/FR/IT).
- **MT banner** (only when language ≠ EN): full-width amber strip, centered, e.g.
  "Automatische Übersetzung – fachliche Prüfung empfohlen."
- **Phase stepper**: numbered chips 1–4 with labels + arrows; current = teal
  filled, done = teal-tint, future/unreached = grey + disabled. Clicking a
  visited phase navigates to it.
- **Phase heading**: H1 title + one-paragraph blurb (per phase).
- **Footer**: small grey disclaimer — "Indicative estimates only — not financial,
  tax, or mortgage advice. Based on FINMA / Swiss Bankers Association
  self-regulation and publicly available cantonal data (2026-06). Always verify
  with a qualified advisor."
- **Bottom nav**: ← Back (disabled on Phase 1) and a Continue button whose label
  changes per phase ("Continue to exploration →", "See my real options →",
  "Build my action plan →"). Phase 1's Continue is gated until the calculator runs.
- A **print stylesheet** hides chrome (`.no-print`) so Phase 4 prints cleanly.

---

## §2 — Reusable components

- **Card** `{ title?, tone: default|teal|amber|slate }` — rounded-2xl, border,
  p-5, shadow-sm; title is uppercase, tracking-wide, slate-500.
- **Row** `{ label, value, sub?, strong? }` — flex space-between; value is
  tabular-nums, right-aligned; `sub` is a small grey qualifier.
- **Pill** `{ tone }`, **Indicative** (ⓘ + grey caption "Indicative ranges only…").
- **InfoTerm** — dotted-underline term that reveals a plain-language tooltip on
  hover/focus (every Swiss jargon term gets one the first time it appears).
- **MoneyField** — text input with `CHF` prefix, right-aligned tabular-nums,
  digits-only filtering.
- **Segmented** — pill button group (single select).
- **Bar / stacked bar**, **horizontal comparison bars**, **class badge** (A–G
  coloured square), simple **tables**.

---

## §3 — Data model (single static JSON)

```
meta { last_updated }
mortgage_rules { min_down_payment_pct 20, min_liquid_savings_pct 10,
  max_pillar2_pct 10, notional_interest_rate_pct 5, max_housing_cost_income_ratio 0.333,
  maintenance_cost_pct_of_value 1, amortization_target_pct 65, amortization_years 15 }
eigenmietwert { status: abolished_by_referendum, referendum_date 2025-09-28, ... }
cantons[CODE] {
  name_en, name_de, region,
  property_price_ranges { apartment_chf_per_m2{low,mid,high}, house_chf_per_m2{...},
    new_build_premium_pct, minergie_premium_pct, source },
  tax { cantonal_income_tax_rate_approx_pct, eigenmietwert_rate_pct_of_market_rent,
    eigenmietwert_status },
  gebaeueprogramm { available, url, key_measures[], notes }, minergie_context, market_notes }
energy_classes.classes[A..G] { typical_heating_cost_chf_per_m2_per_year, co2_kg_per_m2_per_year, description }
  // heating CHF/m²/yr: A5 B12 C22 D38 E58 F80 G110 ; CO2 kg/m²/yr: A2 B6 C12 D22 E35 F50 G70
minergie.standards { MINERGIE{construction_cost_premium_pct10, resale_premium_pct5},
  MINERGIE_P{15,8}, MINERGIE_A{20,12} }
renovation_cost_benchmarks.measures { roof_insulation{low80,mid150,high250 CHF/m² roof},
  facade_insulation{120,200,350 /m² facade}, window_replacement{800,1200,2000 per window},
  heat_pump_air_water{15000,25000,40000}, solar_pv{8000,15000,30000}, solar_thermal{8000,14000,22000},
  full_minergie_retrofit_apartment{500,900,1400 /m²}, full_minergie_retrofit_house{600,1100,1800 /m²} }
gebaeueprogramm_federal.typical_subsidy_ranges { insulation_chf_per_m2{low20,high60},
  heat_pump_replacement_chf{2000,8000}, solar_thermal_chf{1000,3500} }
build_cost_benchmarks.standards { standard_build{2800,3800,5000}, minergie{3200,4400,5800},
  minergie_p{3600,5000,6500}, minergie_a{4000,5500,7500} /m² BGF } + additional_costs{ architect 12-18%, engineer 5-10%, permits 2-5%, contingency 10-15% }
```
Ships with ~16 cantons (ZH, BE, VD, GE, BS, BL, AG, SG, LU, TI, GR, VS, FR, NE, SO, TG).

---

## §4 — PHASE 1 · "Can I buy?"  (2-col: form | results)

### Inputs (left)
Gross household income/yr · Liquid savings · 2nd pillar (optional) · **Combined
equity** (read-only = savings+pillar2) · **Down payment %** (default 20, clamp
20–90) · Canton (with inline micro-stat "Apartments ≈ CHF X/m² · cantonal tax ≈
Y%") · Household size (note: "not used in the FINMA formula") · Employment
(Employed/Self-employed/Mixed; self-employed shows a caution note).

### Outputs (right) — all recompute live after first run
1. **Headline**: max purchase price + "Viable/Not viable" pill + one line saying
   which ceiling holds it ("Held by your income ceiling…").
2. **Two-ceilings chart**: horizontal bars for the equity ceiling vs income
   ceiling on a shared scale, tagged Binding/Slack, a dashed marker at the
   achievable price, the slack hatched with a "+CHF gap" label, and a sentence
   on what unlocks the gap.
3. **The stake (down payment)**: stacked bar cash / 2nd pillar / mortgage, rows
   for each, "X% of price" / "X% loan-to-value" subs, and the note about the 10%
   real-cash rule. **Pension surprise**: if entered pillar2 > usable amount, an
   amber callout "you entered CHF X, but only CHF Y (10% of price) can count…".
4. **⅓ rule (annual cost)**: progress bar "33.0% used / 33.3% ceiling" + rows
   (notional interest, amortization, maintenance, total, ceiling). **Reality-rate
   surprise** (teal callout): "banks stress-test at a notional 5% (CHF A/yr); at
   an illustrative ~1.5% today you'd actually pay ≈ CHF B/yr — about CHF C/mo."
5. **Price ladder**: table of nearby prices (±, 100k steps) showing Down ·{down%},
   Cash ≥10%, Mortgage ·{ltv%}, tagged Within reach / Your ceiling / Beyond.
6. **Tax note (Eigenmietwert)**: explainer + abolition status + **variance
   surprise** "rates still vary widely by canton (≈ R% here) — that variance
   alone can shift affordability between cantons."
7. **Reverse "dream price" calculator**: input a target (e.g. CHF 2,400,000) →
   shows income needed, equity (down) needed, of-which cash, mortgage, each with
   a "+CHF gap" vs the user's current situation (or "✓ covered").
8. **Renovation reflection** (only if Phase 3 renovate is chosen): "Planning to
   renovate too?" → max ceiling − net upgrade = effective property budget.

---

## §5 — PHASE 2 · "What to look for?"

Inputs: Budget (prefilled from Phase 1 max) · Canton · Property type
(Apartment/House) · Condition (Existing/New) · Sustainability priority
(Energy/Solar/Heating/Minergie, each with a blurb).

Outputs:
- **Market overview**: "What CHF X buys in {canton}" → implied size band (m²) and
  price/m² band. (size = budget ÷ price/m²; range = budget/high … budget/low.)
- **Energy rating cost (10-yr)**: GEAK A–G table — per-year and 10-year heating
  cost (= class coeff × implied size × 10) + CO₂/yr; highlighted A-vs-D delta.
- **Subsidies in {canton}**: Gebäudeprogramm measures + federal subsidy ranges +
  link to the cantonal programme.
- **Minergie table**: standards with build premium / energy saving / resale uplift.

(Long cantonal "market notes", energy/Minergie descriptions stay English by design.)

---

## §6 — PHASE 3 · "My real options"

1. **Comparison table** (top — the key piece): the *same* budget/canton/size runs
   through all three routes side by side. Columns: Route | Get-in cost | Energy
   class | 10-yr heating | Trade-off. Rows are **clickable** (set the chosen
   option; highlight). Note: "All three are computed from your CHF X budget in
   {canton} (≈ N m²) — not generic ranges."
   - **Renovate** get-in = budget + retrofit **net cost** (from the configurator);
     class = configurator result; heat = classCoeff × size × 10. Trade-off "Most control".
   - **Buy new** = budget × (1 + minergie_premium%); class B; "Move-in ready".
   - **Build** = minergie build CHF/m² × size; "+ land" flag; class B; "Max effort".
2. **Option A — Buy & renovate**: cost range, less subsidies, net cost, 10-yr
   running-cost (class E → C), then the **Retrofit configurator** (see §7).
3. **Option B — Buy new/Minergie**: new-build & Minergie premiums on the budget,
   10-yr heating saving, resale uplift, canton availability signal.
4. **Option C — Build**: build cost per m² by standard (Standard / Minergie /
   Minergie-P / Minergie-A) × size; soft-cost bullets (architect/engineer/
   permits/contingency); planning terms (Nutzungszone, Ausnützungsziffer) with
   tooltips; "land is separate, not in this dataset" flag; cantonal portal link.

---

## §7 — Retrofit configurator (inside Option A) + live impact ledger

Toggle measures, ledger recomputes live. **Measures** (envelope: roof, façade,
windows; systems: heat pump, solar PV, solar thermal). Defaults selected: roof,
façade, windows, heat pump. Each measure has a **total cost** (sizing rule below),
**subsidy**, and a **per-m²/yr energy reduction** `dCost` (and `dCo2`):

| id | total cost (size S m²) | subsidy | dCost | dCo2 |
|---|---|---|---|---|
| roof | 150 × 0.5S | 40 × 0.5S | 7 | 4 |
| facade | 200 × 1.0S | 40 × 1.0S | 12 | 7 |
| windows | max(4, round(S/14)) × 1200 | 0 | 6 | 3 |
| heatpump | 25000 | 5000 | 16 | 18 |
| pv | 15000 | 0 | 4 | 3 |
| solarthermal | 14000 | 2250 | 4 | 2 |

**Ledger** (baseline = class E: 58 CHF/m²/yr, 35 kg CO₂/m²/yr):
- `newPerM2 = max(5, 58 − Σ dCost)`; `newCo2PerM2 = max(0, 35 − Σ dCo2)`
- `newClass` = the class whose heating coeff is the lowest that is ≥ newPerM2
  (A5,B12,C22,D38,E58,F80,G110)
- `totalCost = Σ cost`; `subsidy = Σ subsidy`; `netCost = max(0, total − subsidy)`
- `annualSaving = (58 − newPerM2) × S`; `tenYearSaving = ×10`; `monthly = /12`
- `payback = netCost / annualSaving` (years)
- `valueUplift = price × resale%`, where resale% by class: A 12, B 8, C 5, else 0
- Display: GEAK trajectory **E → newClass** (A–G coloured scale), running cost
  before→after, CO₂ before→after (t/yr), total/subsidy/net, 10-yr saving,
  payback, value uplift, "≈ CHF X/mo saved". Label everything indicative.

The chosen measures persist into the URL and flow to Phase 4 + Phase 1.

---

## §8 — PHASE 4 · "Action plan"

- **Recap card**: max price · status (Ready / Not yet) · target canton · budget ·
  pills (property type, condition, chosen option). If renovate chosen, a
  **"Modelled upgrade" strip**: `E→C · net CHF X · ≈ CHF Y/mo saved`.
- **Generated 3–5 step plan** (ordered most-blocking-first):
  1. If not viable → "Close your equity gap" (with months-to-save estimate) or
     "Grow income"; else → "Get a non-binding mortgage indication (up to CHF max)".
  2. If canton has a programme → "Check {canton} subsidies" (+ link).
  3. Option-specific: renovate → "Get 3 quotes" *with the modelled net/class/mo*;
     new → "Confirm the Minergie certificate"; build → "Verify what the plot allows".
  4. Always → "Pressure-test the numbers with someone neutral".
- **Share/export**: "Copy shareable link" (URL-encoded state) + "Download / print
  as PDF" (window.print with the print stylesheet). Link is primary.

---

## §9 — Calculation reference (exact)

Constants: down `d` (fraction, default .20, clamp .20–.90), ltv = 1−d, notional
.05, maintenance .01, liquid .10, pillar2cap .10, ratio .333, amortTarget .65,
amortYears 15.

```
housingCostFraction(d) = 0.05*(1−d) + max(0, (1−d) − 0.65)/15 + 0.01
// Phase 1
priceFromLiquid       = savings / 0.10
priceFromTotalEquity  = (savings + pillar2) / d
equityMax             = min(priceFromLiquid, priceFromTotalEquity)
affordabilityMax      = (0.333 * income) / housingCostFraction(d)
maxPrice              = floor(min(equityMax, affordabilityMax) / 10000) * 10000
binding               = affordabilityMax <= equityMax ? 'income' : 'equity'
downPayment           = maxPrice * d
mortgage              = maxPrice * (1−d)
pillar2Used           = min(pillar2, maxPrice*0.10, downPayment)
cashUsed              = downPayment − pillar2Used
annualInterest        = mortgage * 0.05
annualAmortization    = max(0, (1−d) − 0.65)/15 * maxPrice
annualMaintenance     = maxPrice * 0.01
incomeShare           = (interest+amort+maint) / income      // cap rule: ≤ 0.333
viable                = maxPrice >= 200000 AND savings > 0
// Reverse calc, target T at down d
annualCost   = housingCostFraction(d) * T
incomeNeeded = annualCost / 0.333
downNeeded   = T * d ; minCash = T * 0.10 ; mortgage = T * (1−d)
// Reality-rate surprise
realInterestYr = mortgage * 0.015 ; realInterestMo = realInterestYr/12
```
**Rounding:** always floor the max price *down* to the nearest 10'000. Numbers
format as `CHF` + de-CH apostrophe grouping in every language.

---

## §10 — State, i18n, sharing

- **State** lives in two objects: Phase-1 inputs (income, savings, pillar2,
  downPct, canton, household, employment) and exploration (budget, canton,
  propertyType, condition, sustainability, chosenOption, measures). Plus current
  phase. Recompute on every change once Phase 1 has run.
- **URL hash** encodes everything for shareable/restorable links (short keys:
  gi, sv, p2, dn, ct, hs, em, bg, pt, cd, su, op, ms, ph). Language persists in
  localStorage.
- **i18n**: a `t(key, vars)` lookup over an EN/DE/FR/IT dictionary with English
  fallback; strings support `{var}` interpolation, `**bold**`, and `[[term]]`
  (renders an InfoTerm tooltip). German is authored; FR/IT machine-translated
  (hence the banner). Data-derived prose (cantonal notes, energy/Minergie
  descriptions, canton names) stays English by design.

---

## §11 — Things to preserve (the product's spine)

1. **Honest before optimistic** — round down, show the binding ceiling, surface
   the surprises (notional-rate gap, pension-drawdown limit, Eigenmietwert variance).
2. **Quantify sustainability, never greenwash** — every green feature shows CHF /
   kWh-equivalent / CO₂ / subsidy / payback, not just a label.
3. **One comparison, not three explainers** — Phase 3's table must show the same
   personalised numbers across all routes simultaneously.
4. **No selling** — no broker/mortgage affiliate links; trust is the product.
5. **Swiss-specific** — every rule, subsidy, and reference is CH-specific.
