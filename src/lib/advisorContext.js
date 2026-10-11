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

/**
 * Context for the advisor when it is mounted on the Compare dashboard.
 *
 * Same privacy posture as buildAdvisorContext: computed figures only, nothing
 * identifying. It describes WHAT IS ON SCREEN so the model can talk about the
 * comparison the user is actually looking at — but every figure it quotes must
 * still come back from a `run_compare_scenario` tool result, not from here.
 *
 * @param {string} scenario  Active scenario id.
 * @param {object} inputs    Current Compare inputs.
 * @param {number} year      Selected horizon.
 * @param {object} onScreen  `{ a, b, hA, hB, costLens }` as currently rendered.
 * @param {string} lang
 */
export function buildCompareAdvisorContext(scenario, inputs, year, onScreen, lang) {
  if (!onScreen) return null
  return {
    lang,
    surface: 'compare',
    scenario,
    year,
    // Only the inputs that drive the model — no personal identifiers exist here.
    inputs: {
      price: inputs.price,
      cash: inputs.cash,
      rentMonthly: inputs.rentMonthly,
      savingMonthly: inputs.savingMonthly,
      mortgageRatePct: inputs.mortgageRatePct,
      investReturnPct: inputs.investReturnPct,
      appreciationPct: inputs.appreciationPct,
      rentInflationPct: inputs.rentInflationPct,
      downPaymentPct: inputs.downPaymentPct,
      maintenancePct: inputs.maintenancePct,
      marginalTaxPct: inputs.marginalTaxPct,
      regime: inputs.regime,
      trueCost: !!inputs.trueCost,
      buyInYear: inputs.buyInYear,
    },
    onScreen: {
      sideA: { key: onScreen.hA, value: Math.round(onScreen.a) },
      sideB: { key: onScreen.hB, value: Math.round(onScreen.b) },
      lens: onScreen.costLens ? 'cumulative cost — LOWER is better' : 'net worth — HIGHER is better',
    },
  }
}
