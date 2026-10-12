# Product analytics

Plinthly uses Vercel Web Analytics (cookieless) for pageviews plus a small set
of custom events fired through `track()` in `src/lib/track.js`. That file's
header comment is the canonical event list; this page explains why each event
exists and how to read them.

> **Plan check.** Custom events in Vercel Web Analytics may need a paid plan
> (Pro or above, depending on your account). Pageviews work on every plan.
> Before relying on these numbers, open the project's Analytics tab in Vercel
> and confirm that the Events panel shows data. If it doesn't, check your plan.

## The three questions

Every event answers one of these. If a proposed event answers none, don't add it.

1. **Expand.** Where should Plinthly go next? (which countries, which US states)
2. **Improve.** Where do people get stuck or lose interest, and what helps them
   understand? (phase drop-off, what limits the result, learn layer use)
3. **Convert.** Do people take a real next step? (lenders, rebate programs,
   counselors, guides, sharing, feedback)

## Privacy rules (hard)

- Event names plus small **categorical** props only.
- **Never** financial inputs, amounts, prices, or buckets of income/savings.
- **Never** free text or anything typed (the feedback message stays out).
- **Never** a URL. External links are recorded by kind (`trackOutbound(kind)`).
- Fine: country/state/canton codes, phase numbers, ids, enums, booleans.
- Enforced in code: `track()` drops any prop that isn't a string of at most 40
  characters, a finite number or a boolean. `scripts/track.conformance.mjs`
  (`npm run test:track`) checks this.
- The `<Analytics>` component strips the URL hash, which holds the visitor's
  numbers, before any pageview is sent.

## Events

Every event also carries `market` (`ch` | `us`), the market active when it
fired.

| Event | Props | Where fired | Question |
|---|---|---|---|
| `onboarding_completed` | `persona`, `focus` | App, onboarding done | Improve |
| `onboarding_skipped` | none | App, landing or onboarding skip | Improve |
| `country_confirmed` | `detected` (browser-guessed ISO code, or `none`), `chosen` (market id) | App `chooseCountry` from CountryConfirm | Expand, Improve (is detection right?) |
| `market_requested` | `country` (ISO code or `other`) | CountryConfirm, "My country isn't listed" | Expand |
| `phase_viewed` | `phase` (1 to 5) | App, once per phase per page load, when not under the front door | Improve |
| `calculation_completed` | none | App, first own-numbers result (once) | Improve, Convert |
| `result_limited_by` | `constraint`: `cash` \| `income` \| `debt` | App, with the first own-numbers result (once) | Improve |
| `dream_price_opened` | none | App, entering Phase 2 (once) | Improve |
| `region_selected` | `market`, `region` (state or canton code) | App: US Phase 1 form and Phase 3/4 pickers; Swiss Phase 1 form, Phase 3 exploration. User changes only, never restore or defaults | Expand, Improve |
| `region_requested` | `market: 'us'`, `region` (USPS code) | UsPhase1, "My state isn't listed" | Expand |
| `compare_opened` | `source`: `phase1` \| `dream` \| `onboarding` \| `other` | App `openCompare` | Improve |
| `compare_scenario_selected` | `scenario` (scenario id) | CompareView tabs and the save/invest nudge (not advisor what-ifs) | Improve |
| `learn_toast` | `action`: `dismissed` \| `ask` \| `link` | LearnToast | Improve |
| `glossary_opened` | `term` (glossary id) | GlossaryTerm (id-based terms only; InfoTerm text is never sent) | Improve |
| `how_it_works_opened` | `card`: `phase1` \| `compare` | HowItWorks `<details>` onToggle | Improve |
| `language_changed` | `from`, `to` (language codes) | LocaleMenu | Expand (language demand) |
| `advisor_opened` | none | AdvisorFab (once) | Improve |
| `advisor_message_sent` | `mode`: `chat` \| `plan` | AdvisorFab | Improve |
| `advisor_tool_run` | `tool`, `ok` | AdvisorFab | Improve |
| `advisor_scenario_applied` | none | AdvisorFab | Improve |
| `result_shared` | `method`: `link` \| `pdf` | Swiss Phase 1 result (pdf), Phase 5 plan in both markets (link, pdf) | Convert |
| `outbound_click` | `kind`: `lender` \| `rebate` \| `counselor` \| `guide` \| `other` | see below | Convert |
| `feedback_submitted` | `goal` (categorical) | FeedbackSection (Swiss Phase 5) | Convert |

`outbound_click` kinds:

- `lender`: Swiss bank finder links and the bank email inquiry (BankInquiry).
- `rebate`: rebate, incentive and buyer-assistance programs. Swiss
  Gebäudeprogramm (Phase 3 and the action plan); US IRA rebates, utility
  programs, DSIRE, landscape rebates, state first-time buyer programs.
- `counselor`: HUD housing counselors (US plan).
- `guide`: learning guides. CFPB Loan Estimate, ENERGY STAR, DOE, glossary
  "Learn more", "How is this calculated?" links, "New to mortgages?" links.
- `other`: anything else (Swiss cantonal planning portal, HERS rater finder).

Notes for reading the data:

- `country_confirmed` fires before the market switches, so its `market` is the
  previous market. Use `chosen`.
- `once` events are per page load, not per visitor. A reload counts again.
- `result_limited_by` mapping: Swiss `bindingConstraint` `equity` is `cash`,
  `income` is `income`. US `limit` `cash` is `cash`, `front_end` (28% housing
  test) is `income`, `back_end` (36% total-debt test, binds only when other
  debts bite) is `debt`.

## Funnels

Read each funnel filtered by `market`.

**Switzerland (`market = ch`)**

1. Pageview
2. `onboarding_completed` or `onboarding_skipped`
3. `country_confirmed` with `chosen = ch` (front door only)
4. `phase_viewed` 1
5. `calculation_completed`
6. `phase_viewed` 2 (Dream price)
7. `phase_viewed` 3 (Exploration)
8. `phase_viewed` 4 (Options)
9. `phase_viewed` 5 (Action plan)
10. Convert: `outbound_click` (`lender`, `rebate`), `result_shared`, `feedback_submitted`

**United States (`market = us`)**

1. Pageview
2. `onboarding_completed` or `onboarding_skipped`
3. `country_confirmed` with `chosen = us`
4. `phase_viewed` 1
5. `calculation_completed` (own numbers, not the example)
6. `phase_viewed` 2 to 5, as above
7. Convert: `outbound_click` (`counselor`, `rebate`, `guide`), `result_shared`

Side journeys, both markets: `compare_opened` then `compare_scenario_selected`;
learn layer (`learn_toast`, `glossary_opened`, `how_it_works_opened`); advisor
(`advisor_opened`, `advisor_message_sent`).

## Weekly review checklist

1. Confirm events are still arriving (Vercel Analytics, Events tab). A sudden
   zero usually means a deploy broke a handler or the plan changed.
2. Funnel per market: biggest drop between consecutive steps. Note it, compare
   with last week.
3. `result_limited_by`: share of `cash` vs `income` vs `debt`. Does the copy
   and the next-step advice match the most common limit?
4. Expand: top `market_requested` countries and `region_requested` states.
   Anything consistently on top is a candidate for the roadmap.
5. `country_confirmed`: how often `detected` differs from `chosen`, or is `none`.
6. Learn layer: which `glossary_opened` terms lead, and whether
   `how_it_works_opened` rises on a phase with drop-off.
7. Compare: `compare_opened` by `source`, most picked `compare_scenario_selected`.
8. Convert: `outbound_click` by kind, `result_shared` by method.
9. Write one line in the team notes: what changed, what to try next.
