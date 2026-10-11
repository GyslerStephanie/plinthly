# Talk Ideas — Building Plinthly with AI

Conference- and meetup-ready talk concepts, drawn from the real Plinthly build. Each
has a title, a one-line hook, an abstract you could submit to a CFP as-is, the
takeaways, and the best audience fit.

Audiences I'm targeting:
- **DOM** = non-technical / domain experts who want to build software with AI
- **CONF** = general dev conference / meetup (engineers building with LLMs)
- **TEAM** = engineering teams adopting AI workflows

The strongest single talk (and the one with a full slide outline in
`TALK_SLIDE_OUTLINE.md`) is **#1**.

---

## 1. "Trust Is a Test Suite: Shipping Regulated Math with an AI Pair" ⭐
**Hook:** I let an AI write Swiss mortgage law into a calculator — here's the one
practice that made it safe.

**Abstract.** LLMs are great at writing plausible math and terrible at being held
accountable for it. For a product whose entire value is *honesty* — telling a would-be
home buyer "not yet" when a bank's tool would generate a lead — plausible isn't good
enough. This talk shows how I built a production Swiss real-estate affordability engine
with AI by treating correctness as a testing problem, not a prompting problem. A
40-check conformance suite encodes the actual FINMA/Swiss Bankers Association rules; the
AI can refactor the engine however it likes as long as the suite stays green. I'll walk
through real regulatory edge cases (the notional 5% stress test, Pillar 2 vs 3a equity,
the lower-of-price-or-valuation rule), how config-driven rules survived an actual law
change mid-project, and why "the AI can edit anything the tests guard" is the mental
model that lets you ship LLM-written code you'd stake your reputation on.

**Takeaways:** (1) Move trust from prose to tests. (2) Single source of truth for domain
constants so the AI can't scatter magic numbers. (3) A pattern for AI-assisted work in
*any* regulated/high-stakes domain — finance, health, legal.

**Best for:** CONF, TEAM. Length: 20–30 min. Demo-friendly.

---

## 2. "I'm Not an Engineer. I Shipped a Production App Anyway."
**Hook:** A domain expert's honest field report on building real software with AI —
what it actually unlocks and where it still bites.

**Abstract.** I know Swiss real estate. I am not a professional software engineer. With
AI tooling I shipped a multilingual, production web app with a real regulatory engine,
analytics, and a serverless AI feature — through proper pull requests, not a no-code
toy. This is the unembellished story for other domain experts: the workflow that worked
(write the spec down first, let the AI build, gate it with tests), the moments AI made
me look smarter than I am, and the moments where not knowing the fundamentals genuinely
slowed me down. The honest thesis: AI doesn't replace knowing your domain cold — it
replaces needing to know the *syntax*. Your expertise is the moat; the AI is the
translator.

**Takeaways:** (1) The highest-leverage skill is writing a precise spec, not writing
code. (2) Where domain experts have an edge over engineers building the same thing.
(3) The specific places you still need to learn the fundamentals (or pair with someone
who has them).

**Best for:** DOM, CONF. Length: 20–25 min. Highly relatable / inspiring keynote energy.

---

## 3. "Context Is the Product: How Handoff Docs Kept a Solo Build Coherent for Weeks"
**Hook:** The most important files in my repo aren't code — they're the notes the AI
reads to remember what we decided.

**Abstract.** A solo, AI-assisted project that spans many sessions has one mortal
enemy: lost context. Every new session, the AI forgets the locked decisions, the half-
finished refactor, the "we deliberately did NOT do X." My answer was to treat context
as a first-class artifact: product briefs, a dream-price requirements spec, and a
living `SESSION_HANDOFF.md` that each session updates with git state, current focus,
locked decisions, and recommended build order. This talk is a practical system for
"AI memory you actually control" — what to write down, what to leave out, how a handoff
doc differs from documentation, and how this scales from solo work to onboarding
teammates (human or agent) onto a codebase.

**Takeaways:** (1) A concrete handoff-doc template. (2) The difference between
documentation (for users) and handoff (for the next builder). (3) Why explicit
"locked decisions" and "out of scope" sections prevent the AI from re-litigating
settled choices.

**Best for:** TEAM, CONF. Length: 15–25 min. Great lightning or full talk.

---

## 4. "Design Without a Designer: Rebranding an App from a Written Handoff"
**Hook:** I described a design system in words and the AI applied it to components it
never touched.

**Abstract.** Halfway through, Plinthly got a full visual rebrand — "Digital
Naturalism" — and I'm not a designer either. The trick: describe the design system as
*rules*, not pictures. Tokens, a functional type scale, and hard constraints like
"status color only — no colored background larger than a badge." Because the rules
lived in the Tailwind theme and a written handoff, the AI propagated the new identity
across components I never opened. This talk covers turning taste into specifiable
constraints, the Figma-Make-to-code starting point, and why a *functional* color system
(color means status, never decoration) is both better design and easier for an AI to
apply consistently.

**Takeaways:** (1) Specify design as constraints an AI can enforce. (2) Token-driven
theming = global restyle without per-component edits. (3) Functional > decorative is an
AI-friendly design philosophy.

**Best for:** DOM, CONF. Length: 15–20 min. Visual, before/after demo.

---

## 5. "Honest by Architecture: Building Trust Properties You Can't Accidentally Break"
**Hook:** Some promises shouldn't be promises — they should be structurally impossible
to violate.

**Abstract.** Plinthly's pitch is "no selling, no sign-up, just honest numbers." Those
are easy words and easy to betray by accident. So I made them architectural: the 5%
qualification stress rate is *never* wired to the market-rate slider (the displayed
monthly cost moves; the qualifying math can't); the AI advisor captures zero data by
design; the bank-inquiry feature opens an email draft but is structurally incapable of
sending it. This talk is about encoding your product's values as invariants — and why
that's doubly important when an AI is editing the code, because an invariant the AI
can't violate is worth more than an instruction you hope it remembers.

**Takeaways:** (1) Turn product values into invariants, not guidelines. (2) Privacy-by-
architecture (client-only, URL-hash state) as a feature, not a limitation. (3) Why
structural constraints are the right way to collaborate with an AI on a trust-critical
product.

**Best for:** CONF, TEAM. Length: 20 min. Strong opinion / discussion-starter.

---

## 6. "When the Build Is Good but the Business Is Yellow"
**Hook:** I shipped something genuinely good. That doesn't mean it's a business — and
saying so is the talk.

**Abstract.** AI lowers the cost of building so much that the bottleneck moves entirely
to "should this exist as a business?" Plinthly is a real, polished product serving a
real need — and an honestly *yellow* business: a low-frequency need, a free-expectation
market, brutal incumbents. This talk uses the build as a case study in separating
"can I build it" (now almost always yes) from "is there a wedge" (the actual question),
and walks through the more credible paths that emerge — B2B/white-label, public-good /
cantonal-programme funding, or an audience asset that ladders toward a bigger goal.
A candid antidote to "I built it in a weekend therefore it's a startup."

**Takeaways:** (1) Cheap building makes validation, not engineering, the constraint.
(2) A framework for honest go/no-go on AI-built products. (3) Why "good product, no
wedge" is now the default outcome and what to do about it.

**Best for:** DOM, CONF. Length: 20–25 min. Refreshingly honest closing-slot talk.

---

## Quick picks

- **One talk to give:** #1 (*Trust Is a Test Suite*) — most technical substance, clearest
  takeaway, demos well, generalizes beyond real estate.
- **For a non-technical crowd:** #2 (*I'm Not an Engineer*).
- **For an internal eng-team brownbag:** #3 (*Context Is the Product*).
- **Lightning talk (5 min):** carve the conformance-suite story out of #1, or the
  handoff-doc template out of #3.
