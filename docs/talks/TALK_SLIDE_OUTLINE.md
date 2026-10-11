# Slide Outline — "Trust Is a Test Suite"
### Shipping Regulated Math with an AI Pair

Target length: 25 min (≈18 slides + Q&A). Format: story → problem → the one idea →
proof → generalize. Demo optional but high-impact at slide 9.

---

**1 — Title**
*Trust Is a Test Suite: Shipping Regulated Math with an AI Pair*
Your name · Plinthly · plinthly.homes
Subtitle: "I let an AI write Swiss mortgage law. Here's what kept it honest."

**2 — The hook (10 seconds of tension)**
Screenshot of Plinthly telling a user *"CHF 850,000 is out of reach right now."*
A bank's tool would've captured the lead. Mine tells the truth. The whole product is
that one word: honest.

**3 — Who I am / why this is unusual**
Domain: Swiss real estate. Not a career software engineer. Shipped a production app,
mostly AI-built. (Plant the credibility-through-honesty theme early.)

**4 — What Plinthly is (15 sec)**
Free, no-signup affordability tool. Reverse calculator + dream-price flow +
sustainability layer. 4 languages, 26 cantons, live in production.

**5 — The problem with AI + math**
LLMs write *plausible* math fluently. Plausible is fine for a chatbot. It is
disqualifying for a tool people make six-figure decisions against. And the rules are
genuinely nasty ↓

**6 — Exhibit A: the rules are unforgiving**
- ≥20% down, of which ≥10% must be *hard cash*
- 80% loan-to-value cap
- affordability tested at a **notional 5%** rate, not the real rate
- housing cost ≤ ⅓ of gross income
- Pillar 3a counts toward hard equity; Pillar 2 does **not**
- forward mode: bank lends against the *lower* of price vs valuation
One wrong constant = the product lies = it has no reason to exist.

**7 — The wrong fix: prompt harder**
"Be accurate." "Double-check the math." This does not scale and you can't verify it.
You cannot code-review your way to confidence in a number you don't independently know.

**8 — The one idea**
> Move trust from prose to tests.
> The AI may refactor the engine however it wants — as long as the conformance suite
> stays green.
Correctness becomes a *property of the repo*, not a property of the prompt.

**9 — The conformance suite (the heart of the talk / demo)**
Show `affordability.conformance.mjs`: 40 checks encoding the real rules. Each check is a
known-correct scenario → expected output. Run it live: green. Then show the AI rewriting
the engine internals and the suite still passing. The AI is free *inside the fence*.

**10 — Single source of truth**
All constants live in one JSON `mortgage_rules` block. The AI reads from it; it can't
sprinkle magic numbers. Show the block. This is what makes the tests *and* the AI safe.

**11 — Proof it works: the law changed mid-build**
Sept 2025: Swiss voters abolished the Eigenmietwert by referendum. Because rules are
config-driven, this was a config + copy edit, not code archaeology. The architecture
absorbed a real-world regulatory shock.

**12 — Bonus: trust as architecture, not promises**
Quick hits — the 5% stress rate is *never* wired to the market-rate slider; the AI
advisor stores zero data; the bank email can't auto-send. Invariants the AI can't
violate beat instructions you hope it remembers.

**13 — Zoom out: the mental model**
Give the AI a big sandbox and a strong fence.
- Fence = tests + single-source config + structural invariants
- Sandbox = everything inside it, where the AI moves fast
Speed and safety stop being a trade-off.

**14 — This generalizes**
Any high-stakes / regulated domain: finance, tax, health dosing, legal eligibility,
pricing, benefits. If you can write the rule as a check, you can let an AI build against
it. The pattern is domain-agnostic.

**15 — What it doesn't fix (be honest)**
Tests only cover rules you thought to encode. You still need the domain expertise to
know *which* cases matter. AI replaces the syntax, not the knowing.

**16 — Takeaways (the slide people photograph)**
1. Trust = a test suite, not a better prompt.
2. One source of truth for domain constants → the AI can't scatter magic numbers.
3. Encode values as invariants the AI structurally can't break.
4. Big sandbox, strong fence.

**17 — Closing**
A non-engineer shipped regulated math you can stake a reputation on — because the
reputation rests on the tests, not the AI. That's the unlock.

**18 — Thanks / links**
plinthly.homes · repo · contact · "happy to share the conformance-suite pattern."

---

### Delivery notes
- The live moment that lands: slide 9 — run the suite green, let the AI gut the engine,
  run it green again. That *shows* "big sandbox, strong fence" instead of asserting it.
- If non-technical-heavy room: soften slide 9 to a screenshot walkthrough, lean harder
  on slides 3, 11, 15 (the human/expertise story).
- Tight 5-min lightning version: slides 2, 6, 8, 9, 16.
