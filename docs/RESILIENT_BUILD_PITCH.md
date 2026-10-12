# Plinthly Resilient — pitch and build plan

_Working name. Draft 2 on 2026-10-12. Figures marked (est.) are hypotheses, not sourced data._

## The thesis

**The American dream does not have to be built large. It can be built well.**

The typical US house has grown by roughly half in floor area since the 1970s while its envelope has barely changed: stick frame, batt insulation, double-pane glass, asphalt shingles, a gas furnace. It is cheap to build and expensive to own. It leaks heat, it grows mould, and it is the first thing to go in a hurricane, hailstorm or wildfire.

Switzerland settled this decades ago. Minergie and SIA standards, mass walls, triple glazing, 0.6 air changes per hour, houses that are smaller and last longer. Plinthly already models that side for Swiss buyers. This track brings the argument to the US in the language a US owner understands: dollars per square foot, monthly cost, and what is still standing in 30 years.

## What winning looks like

This is not a product to scale. The win is one person who uses the explorer, sees the numbers, and chooses to build or retrofit to a Swiss-grade envelope. One to five such people over a few years would make the track a success, and each of them is a client, a case study and a quiet argument that quality beats size.

The explorer is a tool of soft influence. It should be free, shareable, honest and a little beautiful, so that the climate-minded person who was never going to pay still comes away with a different idea of what a good house is.

## The product

**Entry point: "Compare how to build."** A third door next to "Can I buy?" and the rent-vs-buy comparison, reachable without going through the mortgage flow.

### The signature scenario: same budget, smaller and better

Put two houses side by side at the same all-in budget:

- A 2,800 sq ft code-built stick-frame house.
- A 1,800 sq ft Swiss-grade house: Minergie-P or PHIUS envelope, mass or CLT structure, triple glazing, heat pump and ERV, no combustion.

Then show 10, 20 and 30 years of energy under three price paths, insurance in the chosen state, expected hazard loss for the county, a mould and moisture risk score, and total cost of ownership. Nobody else shows this comparison, and it is where the cultural argument lives.

### Inputs, five minutes

1. State, then county or ZIP for hazard.
2. Budget, or home size and whether this is a new build or a retrofit.
3. Time horizon: 10, 20 or 30 years.
4. Fuel today: electricity, natural gas, heating oil, propane.
5. Energy price path: EIA reference, high-price, low-price, or a slider for annual escalation.

### Five build archetypes

| Archetype | What it is | Air-tightness | Wall R |
|---|---|---|---|
| A. Older existing home | Pre-2000 stick frame | 7 to 10 ACH50 | R-11 |
| B. Code-built new home | 2021 IECC stick frame | ~3 ACH50 | R-20 |
| C. Deep envelope retrofit | Exterior continuous insulation, air sealing, triple-pane, heat pump | ~1.5 ACH50 | R-30+ |
| D. Swiss / Passive-grade new build | Minergie-P or PHIUS, ICF, masonry or CLT, ERV, no combustion | ≤0.6 ACH50 | R-40+ |
| E. Resilience package on B, C or D | FORTIFIED Roof/Home, wildfire hardening, flood vents or elevation | n/a | n/a |

### Outputs on one screen

- Energy per year and cumulative over the horizon, with the A-vs-D gap called out.
- Total cost of ownership: build or retrofit premium, energy, insurance, maintenance, expected hazard loss.
- Insurance: state baseline, estimated discount for FORTIFIED or wildfire hardening where a programme exists, a flag where insurers are retreating.
- Expected annual loss from the FEMA National Risk Index for the county, and how the archetype changes it.
- Moisture and mould risk as a qualitative score (climate zone × wall assembly × ventilation).
- Comfort, carbon and resale premium as secondary rows.
- A shareable link and a printable brief the owner can hand to a builder, lender or insurance agent.

The AI advisor runs scenarios on this model as it does on the rent-vs-buy comparison today.

### What it is not

No structural engineering, no product-level quotes, no regional labour rates, no paid placement. Archetypes with ranges and sources, as Plinthly does now. The indicative framing and the "take this to a professional" step stay.

## Who it is for

- **The one person.** Someone planning a build or a major renovation, often in a hazard state (FL, TX, CO, CA, NC, LA), with the means to choose quality over size and tired of the insurance bill. They are the client.
- **The climate-minded.** People who will run scenarios, share the link and change how they talk about houses. They are the influence.
- **Builders, architects and agents** who meet the first group. They are the referral path, both ways.

## How it earns, if it earns

Not affiliate fees and not a Pro tier. The explorer is free and stays free, with nothing in it ranked or placed for money.

Revenue, when it comes, is a person: the serious owner who writes "I want this, who builds it?" That becomes design consulting, owner's representation, or an introduction to a Swiss or PHIUS builder, paid directly. A simple "talk to Stephanie" step at the end of the brief is the entire sales funnel.

If a supplier or builder later wants to be listed, list them because they are good and say so plainly. Nothing else.

## Inside Plinthly, as a third track

The US retrofit configurator, state energy prices, HERS tiers, insurance rates, the compare model, share links, learn layer and advisor tools already exist. The self-builder track is a stubbed entry point in today's onboarding; this is that track, done properly. One brand, one data pipeline, one feedback loop.

Code shape: engine and data under `src/markets/us/resilience/`, components under `components/us/`, a new onboarding branch, two or three advisor tools, one conformance suite. No new dependencies.

## Build plan

The plan ends when the tool is live and in front of ten people who might care. No kill review, no growth targets.

**Step 1, a week: write the argument.** The landing route inside Plinthly with the thesis, the same-budget comparison described in words, and a way to leave an email. Share it with ten people. This is the cheapest version of the whole idea and tells you whether the framing lands.

**Step 2, about a month: the explorer.** Energy price paths from EIA state prices (already in the data) and the Annual Energy Outlook cases. The five archetypes on energy and total cost, reusing the retrofit configurator for archetype C. The same-budget scenario. Share link and advisor scenarios.

**Step 3, about a month: hazard and insurance.** FEMA National Risk Index by county. Insurance baseline from the state data, FORTIFIED and wildfire-hardening discounts where they exist, insurer-retreat flags. The mould and moisture score. The printable brief with sources, ending in "talk to Stephanie."

**Step 4, ongoing: put it in front of people.** Ten direct shares, two or three builder or architect conversations, one post that tells the "build well, not large" story. Then wait for the one email.

**Signals worth noticing:** the brief gets printed, a scenario link gets shared, a builder says "can I use this with clients," one person writes.

## Data sources

- EIA: state electricity, gas, heating oil and propane prices; Annual Energy Outlook price cases.
- RECS and HERS reference points (already in Plinthly) for consumption by tier.
- FEMA National Risk Index for county hazard and expected annual loss; NOAA billion-dollar disaster database for the narrative.
- IBHS FORTIFIED standards and state discount tables; California Safer from Wildfires.
- PHIUS and Minergie-P for archetype D; 2021 IECC for archetype B.
- NAHB, RSMeans and the state cost benchmarks already in Plinthly for build premiums; PHIUS and ICF studies for the premium range, 5 to 15 percent (est.).
- NerdWallet and Insurify state premiums (already in Plinthly), with the FL, TX and CO disagreement shown as a range.
- US Census Characteristics of New Housing for the floor-area-over-time story.

## Risks

- **Data confidence.** County hazard is coarse and premiums vary widely. Ranges and sources on every line.
- **Liability.** Not engineering or insurance advice. Keep the indicative framing.
- **Preaching.** The tool must stay neutral in tone and let the numbers carry the argument, or the people it is meant to reach will close the tab.
- **Scope creep.** Archetypes, not quotes. Resist modelling specific products.

## The pitch in three sentences

Climate risk has made the house itself the biggest line in the cost of owning it, and the US default build was never designed for that. Plinthly Resilient lets anyone compare a code-built box, a deep retrofit and a Swiss-grade envelope on energy, insurance, hazard loss and total cost over 30 years, free and with sources, including the house most people never consider: smaller, tighter and built to last. It exists to change what a few people think a good house is, and to find the one who wants to build it.
