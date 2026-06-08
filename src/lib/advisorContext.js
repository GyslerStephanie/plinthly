/**
 * Builds the compact, non-identifying context object the AI advisor narrates.
 * Contains the user's computed figures (income, equity, gaps) — no name/email,
 * nothing that identifies them. The user opts in once (consent gate) before this
 * is ever sent. Numbers come from the deterministic engine; the LLM only narrates.
 */
export function buildAdvisorContext(result, lang, dream) {
  if (!result) return null
  const lever = result.pillar3aLever
  return {
    lang,
    maxPrice: result.maxPrice,
    bindingConstraint: result.bindingConstraint,
    hardEquity: result.inputs.hardEquity,
    income: result.inputs.grossIncome,
    downPct: result.rules.downPct,
    canton: result.inputs.canton,
    pillar3a: lever
      ? {
          contribution: lever.contribution,
          max: lever.max,
          gap: lever.gap,
          taxSaving: Math.round(lever.taxSaving),
        }
      : null,
    dream: dream || null, // { price, qualifies, equityGap, incomeGap, effectiveDown }
  }
}
