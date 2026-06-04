# Feature handoff: "Key Takeaways" summary card

## Goal
Add a computed TL;DR summary card to the top of the affordability results in the
**designify** app (Vite + React + Tailwind). It distills the 7 detail cards into
3–4 one-line takeaways, placed **right after the headline card, before all detail
cards**.

## Files to change
1. `src/components/AffordabilityResult.jsx` — add the component + render it.
2. `src/i18n/translations.js` — add `tk*` keys to the `result` block in **all four**
   language objects (en/de/fr/it). Anchor each insert on that language's unique
   `monthStress:` line.

## Data sources (already available in the `result` object)
- `result.viable` (bool), `result.maxPrice`, `result.bindingConstraint` (`'income'` | `'equity'`)
- `result.downPaymentBreakdown` → `{ total, mortgage, ltv }`
- `result.rules` → `{ notionalRatePct, minLiquidPct }`
- `result.shortfall` → `{ targetPrice, ... }` (only when not viable)
- Helpers (same file/module): `monthlyCostsAtRate(price, mortgage, rate, ltv)` →
  `{ total, totalNotional }`; `chf()`, `pct()` from `../lib/format`;
  `shortfallMessage(t, sf)` (local).
- `rate` is component state (`DEFAULT_MARKET_RATE`, 1.5%) — pass it in so the
  "real cost" line matches the Monthly Cost card.

## Component (in AffordabilityResult.jsx)
- Import `renderRich` alongside `T`: `import { T, renderRich } from './Trans'`
  (renderRich turns `**bold**` into `<strong>`).
- Add a `TakeawayItem` (teal `✓` circle + `<li>` text) and a
  `KeyTakeaways({ result, rate })` that builds an `items` array:
  - **Viable:** `tkCeiling` (price), `tkLeverIncome`/`tkLeverEquity`
    (by `bindingConstraint`), `tkUpfront` (down total + `maxPrice * minLiquidPct/100`
    cash), `tkMonthly` (`mc.total` real, `mc.totalNotional` stress, `notional`=pct).
  - **Not viable:** `tkNotViable` (target price) + `shortfallMessage(t, result.shortfall)`.
  - Render inside `<Card title={t('result.tkTitle')}>` with a `<ul className="space-y-2.5">`.
- Render `<KeyTakeaways result={result} rate={rate} />` immediately after the closing
  of the headline `{result.viable ? (...) : (...)}` block.

### Reference implementation
```jsx
/** A single bullet in the Key Takeaways summary — teal check + rich text. */
function TakeawayItem({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold leading-none text-white">
        ✓
      </span>
      <span className="text-sm leading-relaxed text-slate-700">{children}</span>
    </li>
  )
}

function KeyTakeaways({ result, rate }) {
  const { t } = useI18n()
  const { downPaymentBreakdown: dp } = result
  const notionalPct = pct(result.rules.notionalRatePct / 100)
  const minCash = result.maxPrice * (result.rules.minLiquidPct / 100)

  const items = []
  if (result.viable) {
    const mc = monthlyCostsAtRate(result.maxPrice, dp.mortgage, rate, dp.ltv)
    items.push(renderRich(t('result.tkCeiling', { price: chf(result.maxPrice) })))
    items.push(
      t(result.bindingConstraint === 'income' ? 'result.tkLeverIncome' : 'result.tkLeverEquity'),
    )
    items.push(renderRich(t('result.tkUpfront', { down: chf(dp.total), cash: chf(minCash) })))
    items.push(
      renderRich(
        t('result.tkMonthly', {
          realMo: chf(mc.total),
          stressMo: chf(mc.totalNotional),
          notional: notionalPct,
        }),
      ),
    )
  } else {
    items.push(renderRich(t('result.tkNotViable', { target: chf(result.shortfall?.targetPrice ?? 200000) })))
    items.push(shortfallMessage(t, result.shortfall))
  }

  return (
    <Card title={t('result.tkTitle')}>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <TakeawayItem key={i}>{it}</TakeawayItem>
        ))}
      </ul>
    </Card>
  )
}
```

## i18n keys (add to `result` in every language)
EN reference (translate for de=formal "Sie", fr=formal "Votre", it=informal "tu").
Use typographic apostrophes (’) so the strings stay safely inside single-quoted JS.
```
tkTitle:      'Key takeaways',
tkCeiling:    'You can afford up to **{price}**.',
tkLeverIncome:'You’re capped by income — more earnings, not more savings, lifts this.',
tkLeverEquity:'You’re capped by your deposit — more savings lifts this.',
tkUpfront:    'Bring **{down}** up front — at least **{cash}** of it in real cash.',
tkMonthly:    'Real cost ≈ **{realMo}/mo** today; you had to qualify at the {notional} stress test (**{stressMo}/mo**).',
tkNotViable:  'A {target} home doesn’t add up yet — see what would change it below.',
```

## Verification
- Dev server: `npm run dev --prefix /Users/stephaniegysler/designify`
  (the project's `.claude/launch.json` has a `designify` preset on port 5180).
- Fill income/savings/pillar, submit, confirm the "Key takeaways" card appears at
  result index 1 (right after the headline), 4 bullets, bold amounts rendered,
  no console errors.

## Status
Already implemented in the current working tree (not committed as of 2026-06-04).
This handoff is for re-implementing from scratch or reviewing.
Optional follow-up: mirror the card into the Figma file `ymuhxn8muuvvxROPTlIGHO`
(Plinthly — Affordability Result) under the headline card.
