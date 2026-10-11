/**
 * US dream price — "what would it take to buy THIS home?"
 *
 * Runs the three US tests (cash, front-end, back-end) against a typed price
 * and turns every failure into a concrete lever: save more, earn more, cut
 * monthly debt, put less down (if that still passes the ratios), or aim lower.
 * Adds a savings timeline for the cash gap and the 30-year payoff schedule at
 * the dream price. Pure logic: the UI only renders what this returns.
 */
import data from './us-data.json'
import { calculateAffordability, checkSpecificProperty, US_RULES } from './affordability.js'
import { mortgagePayoff } from './mortgagePayoff.js'

const D = data.dream

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return isFinite(n) && n > 0 ? n : 0
}

/**
 * @param {object} input       Same shape as calculateAffordability's input.
 * @param {number} dreamPrice  The home price to test, USD.
 * @param {object} [opts]
 * @param {number} [opts.extraMonthly] Voluntary extra principal for the payoff schedule.
 */
export function dreamPlan(input, dreamPrice, { extraMonthly = 0 } = {}) {
  const price = num(dreamPrice)
  if (!price) return null
  const today = calculateAffordability(input)
  const check = checkSpecificProperty({ ...input, price })
  const req = check.requirements
  const monthlyIncome = num(input.grossIncome) / 12
  const monthlyDebts = num(input.monthlyDebts)
  const housing = req.monthly.total

  // Lever: cut monthly debt. Only helps when the back-end test is the one that
  // fails AND the front-end passes; capped at the debts the buyer actually has.
  let debtCut = null
  if (!check.backEnd.ok && check.frontEnd.ok) {
    const need = housing + monthlyDebts - US_RULES.BACK_END * monthlyIncome
    if (need <= monthlyDebts + 1e-6) debtCut = Math.ceil(need)
  }

  // Lever: put less down (frees cash for closing). Find the largest down
  // payment the savings cover, at or above the program minimum, then re-run the
  // ratio tests at that LTV (more loan + PMI makes them harder).
  let lowerDown = null
  if (!check.cash.ok) {
    const closing = req.closingCosts / price
    const affordableDown = num(input.savings) / price - closing
    const pctDown = Math.floor(affordableDown * 100)
    if (pctDown >= US_RULES.MIN_DOWN * 100 && pctDown < Math.round(req.downFrac * 100)) {
      const alt = checkSpecificProperty({ ...input, price, downPct: pctDown })
      lowerDown = { downPct: pctDown, passes: alt.passes, monthly: alt.requirements.monthly.total, pmi: alt.requirements.monthly.pmi }
    }
  }

  const savingsScenarios = check.cash.gap > 0
    ? D.savings_scenarios_usd_per_month.map((perMonth) => ({ perMonth, months: Math.ceil(check.cash.gap / perMonth) }))
    : []

  const payoff = mortgagePayoff({ price, loan: req.mortgage, rate: req.monthly.rate, extraMonthly })

  return {
    price,
    reachable: check.passes,
    maxPriceToday: today.maxPrice,
    check,
    monthly: req.monthly,
    cash: { needed: req.cashNeeded, have: num(input.savings), gap: check.cash.gap, downPayment: req.downPayment, closingCosts: req.closingCosts },
    progress: {
      price: Math.min(1, today.maxPrice / price),
      cash: req.cashNeeded > 0 ? Math.min(1, num(input.savings) / req.cashNeeded) : 1,
    },
    levers: {
      saveMore: check.cash.gap > 0 ? Math.ceil(check.cash.gap) : null,
      earnMore: check.incomeGap > 0 ? Math.ceil(check.incomeGap) : null,
      cutDebt: debtCut,
      lowerDown,
      aimFor: today.maxPrice > 0 && today.maxPrice < price ? today.maxPrice : null,
    },
    savingsScenarios,
    payoff,
    flags: req.flags,
  }
}

/** Balance milestones (every N years) for a compact payoff table. */
export function payoffMilestones(payoff, every = D.payoff_milestone_years) {
  if (!payoff) return []
  return payoff.yearly.filter((r) => r.year > 0 && (r.year % every === 0 || r.balance <= 0.5))
}
