# Plinthly Resilient — product pitch and build strategy

_Working name. Draft 2026-10-12. Figures marked (est.) are hypotheses to validate, not sourced data._

## One line

A free scenario explorer that shows a US homeowner what a tighter, Swiss-grade building envelope costs today and saves over 10, 20 and 30 years in energy, insurance and rebuilds, compared with the stick-frame box that is the US default.

## The problem

- **The US default house is built for 1975 energy and 1975 weather.** 2x6 stick framing, batt insulation, double-pane windows, asphalt shingles, a gas furnace. It is cheap to build and expensive to own: leaky, moisture-prone, and the first thing to go in a hurricane, hailstorm or wildfire.
- **Energy prices are volatile and every quote assumes they are flat.** A builder's "payback" uses today's gas price. Nobody shows a homeowner the 30-year bill under a high-oil or high-electricity path.
- **Insurance is becoming the real cost of ownership.** Premiums in Florida, Texas, Colorado and California already rival property tax. Insurers are leaving markets, non-renewing, and pricing hazard per house. Resilience is starting to earn discounts (IBHS FORTIFIED in hurricane states, wildfire hardening in California) but owners do not know that or how much.
- **Nobody sells the comparison.** Builders sell what they know how to build. Suppliers sell their product. Energy auditors sell audits. No neutral tool puts build quality, energy path, hazard and insurance on one 30-year table.

Switzerland solved the envelope question decades ago (Minergie, SIA standards, mass walls, triple glazing, 0.6 air changes per hour). Plinthly already models that side. The gap is translating it for a US buyer who thinks in $/sq ft and monthly payment.

## The product

**Entry point: "Compare how to build."** A third door next to "Can I buy?" and the rent-vs-buy comparison, reachable without going through the mortgage flow.

**Inputs (five minutes, all optional beyond the first three):**
1. State, then county or ZIP for hazard.
2. Home size and type: existing home to retrofit, or new build.
3. Time horizon: 10, 20 or 30 years.
4. Fuel mix today: electricity, natural gas, heating oil, propane.
5. Energy price path: EIA reference, high-price, low-price, or a user slider for annual escalation.

**Five build archetypes, side by side:**

| Archetype | What it is | Air-tightness | Wall R |
|---|---|---|---|
| A. Older existing home | Pre-2000 stick frame | 7 to 10 ACH50 | R-11 |
| B. Code-built new home | 2021 IECC stick frame | ~3 ACH50 | R-20 |
| C. Deep envelope retrofit | Exterior continuous insulation, air sealing, triple-pane, heat pump | ~1.5 ACH50 | R-30+ |
| D. Swiss / Passive-grade new build | Minergie-P or PHIUS, ICF, masonry or CLT, ERV, no combustion | ≤0.6 ACH50 | R-40+ |
| E. Resilience package on top of B, C or D | FORTIFIED Roof/Home, wildfire hardening, flood vents or elevation | n/a | n/a |

**Outputs on one screen:**
- Energy cost per year and cumulative over the horizon, under the chosen price path, with the A-vs-D gap called out.
- Total cost of ownership: build or retrofit premium, energy, insurance, maintenance, expected hazard loss.
- Insurance line: state baseline premium, estimated discount for FORTIFIED or hardening where a programme exists, flag where insurers are retreating.
- Expected annual loss from the FEMA National Risk Index for the county, and how the archetype changes it.
- Moisture and mould risk as a qualitative score (climate zone × wall assembly × ventilation).
- Comfort, carbon and resale premium as secondary rows.
- A shareable link and a printable "resilience brief" an owner can hand to a builder, lender or insurance agent.

The AI advisor runs scenarios on this model the same way it does on the rent-vs-buy comparison today.

## Who it is for

1. **Owners of multiple homes or high-value homes in hazard states** (FL, TX, CO, CA, NC, LA). They already feel insurance pain and can fund a better build. Primary paying segment.
2. **People about to build or do a major renovation** who want a neutral second opinion before signing a builder's spec.
3. **The curious and climate-minded** who will play, share and feed the waitlist. Volume segment, free forever.
4. Later, **professionals**: architects, PHIUS builders, insurance agents and lenders who want to show clients the numbers. B2B tier.

The honest limit: most US buyers optimise for monthly payment and will not pay for this. The free tier serves them and earns reach. Revenue comes from segments 1, 2 and 4.

## Why now

- Federal energy credits ended after 2025 and IRA rebate rollout is uneven, so owners need to see payback without subsidy.
- 2024 and 2025 were record years for insured losses; several states are in open insurance crises.
- IBHS FORTIFIED, PHIUS and the 2021 IECC give the tool recognised standards to anchor to, so it is not inventing a scale.
- Plinthly already has the engines, data and brand position ("an honest picture before you talk to brokers, banks or builders").

## Business model

**Free: the scenario explorer.** Everything above, no account. This is the acquisition engine, like the mortgage calculator.

**Revenue layer 1: partner referrals.** Suppliers of exactly the things archetypes C, D and E need, shown next to the relevant line with clear "partner" labelling and a referral link or quote request:
- Windows: triple-pane makers (Alpen, Zola, European imports).
- Insulation and air sealing: mineral wool, exterior CI systems, aerobarrier.
- Structure: ICF (Nudura, Fox Blocks), CLT, SIP makers.
- Certified builders and raters: PHIUS, HERS, FORTIFIED evaluators.
- Resilience: impact windows, Class 4 roofing, ember-resistant vents.
Typical lead fees in building products run $50 to $300 per qualified lead or 2 to 8 percent affiliate (est.). Ranking stays independent and the disclosure is explicit, or the "honest" brand dies.

**Revenue layer 2: Pro.** Saved projects, the printable resilience brief with sources, multi-home portfolio view, county-level hazard. Suggested pricing to test: $19 per brief or $12 per month (est.).

**Revenue layer 3: B2B.** White-label or API for insurers (resilience discount justification), lenders (green or resilient mortgage products), and builder marketing. Only after the free tool has traffic and the data is defensible.

## Inside Plinthly or separate?

**Recommendation: build it inside Plinthly as a third track, with its own entry point. Spin out only on evidence.**

Why inside:
- The US retrofit configurator, state energy prices, HERS tiers, insurance rates, the compare model, share links, learn layer and advisor tools already exist. A separate product rebuilds 60 percent of this.
- One brand, one domain, one data refresh pipeline, one analytics and feedback loop.
- The self-builder and investor tracks are stubbed entry points in the current onboarding. This is the self-builder track, done properly.
- Cross-sell both ways: a mortgage user sees "what if you built tighter," a build user sees "can you afford it."

What separate would buy, and why it is not worth it yet:
- A name that signals resilience and insurance rather than mortgages. Solve with a dedicated landing route and copy, not a second product.
- A B2B audience (insurers, builders) that may not want a consumer brand. Revisit when there is a B2B conversation to have.

Spin-out triggers: a partner or B2B deal wants its own domain; the resilience track reaches half of Plinthly's traffic; or the data layer becomes a product on its own.

Code shape, so it stays a module: engine and data under the US market folder (`src/markets/us/resilience/`), components under `components/us/`, a new onboarding branch, two or three advisor tools, one conformance suite. No new dependencies.

## Roadmap

**Weeks 0 to 2: validate before building.**
- Ten conversations: five owners in hazard states with a second home or a planned build, two PHIUS or FORTIFIED builders, two insurance agents, one lender.
- Landing route inside Plinthly with the pitch and a waitlist. Measure signups.
- Lock the five archetypes and the data source for every number.

**Weeks 3 to 6: MVP, energy and envelope.**
- Energy price paths: EIA state prices (already in the data) × EIA Annual Energy Outlook reference, high and low cases × horizon.
- Archetype comparison for energy and total cost. Reuse the retrofit configurator for archetype C.
- Share link, print view, advisor scenarios.
- Ship behind the new entry point. Watch scenarios run and share rate.

**Weeks 7 to 10: resilience and insurance.**
- FEMA National Risk Index by county, hazard-specific expected annual loss.
- Insurance baseline from the existing state data, FORTIFIED and wildfire-hardening discounts where programmes exist, insurer-retreat flags.
- Moisture and mould score by climate zone and assembly.
- The printable resilience brief.

**Weeks 11 to 14: partners and Pro.**
- Partner directory with ten suppliers approached, first referral agreements, tracked links.
- Pro gate on the brief and saved projects.
- First B2B conversations using real usage numbers.

**Metrics that decide the next step:** scenarios run per visitor, share rate, waitlist to active, partner click-through, briefs bought. A kill or pivot review at week 14.

## Data sources to use

- EIA: state electricity, gas, heating oil and propane prices; Annual Energy Outlook price cases.
- RECS and HERS reference points (already in Plinthly) for consumption by tier.
- FEMA National Risk Index for county hazard and expected annual loss.
- NOAA billion-dollar disaster database for the narrative.
- IBHS FORTIFIED standards and state discount tables; California Safer from Wildfires framework.
- PHIUS and Minergie-P for archetype D targets; 2021 IECC for archetype B.
- NAHB and RSMeans or state cost benchmarks (already in Plinthly) for build premiums; PHIUS and ICF industry studies for the premium range (5 to 15 percent, est.).
- NerdWallet and Insurify state premiums (already in Plinthly), with the known disagreement for FL, TX and CO shown as a range.

## Risks and open questions

- **Data confidence.** County hazard is coarse and build premiums vary wildly. Show ranges and sources on every line, as Plinthly does now.
- **Liability.** This is not engineering or insurance advice. Keep the indicative framing and the "take this to a professional" step.
- **Referral conflict.** The moment ranking follows fees the brand is gone. Independent ranking, labelled partners, no pay-to-rank.
- **Small paying niche.** If segment 1 does not convert, the B2B route is the backup, and the free tool still grows Plinthly.
- **Scope creep.** Resist modelling structural engineering, specific products or regional labour. Archetypes, not quotes.
- **Open:** Does the first version include new build only or retrofit too? (Recommend both, since the configurator exists.) Which three states first? (Recommend FL, TX, CO: worst insurance, three different hazards.)

## The pitch in three sentences

Climate risk has turned the house itself into the biggest line in the cost of owning it, and the US default build was never designed for that. Plinthly Resilient lets anyone compare a code-built box, a deep retrofit and a Swiss-grade envelope on energy, insurance, hazard loss and total cost over 30 years, free, with sources. It earns by connecting the people who act on those numbers with the windows, insulation, structure and builders that deliver them, and by selling the brief they take to their lender and insurer.
