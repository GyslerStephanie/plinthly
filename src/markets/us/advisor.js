/**
 * US advisor — context, tools and prompt rules for the AI advisor in the US
 * market. Same contract as the Swiss advisor (src/lib/advisorTools.js,
 * src/lib/advisorContext.js): the model chooses WHICH calculation to run and
 * with WHAT inputs; the US engine produces every figure; the model only
 * narrates numbers it was handed.
 *
 * PURE. No React, no network. Model output is untrusted: every tool field is
 * whitelisted, coerced and range-checked; unknown tools/params are rejected.
 */
import data from './us-data.json'
import { calculateAffordability, US_RULES, DEFAULT_RATE } from './affordability.js'
import { dreamPlan } from './dream.js'
import { formatMoney } from '../../lib/format.js'
import us from './index.js'

const R = data.mortgage_rules
const STATE_CODES = Object.keys(data.states)
const usd = (n) => formatMoney(Math.round(Number(n) || 0), us)
const pct1 = (f) => Math.round(f * 1000) / 10

/* ------------------------------------------------------------------ context */

/**
 * What the advisor may know: computed figures only, nothing identifying.
 * @param {object} result  calculateAffordability() result (US).
 * @param {string} lang
 * @param {object|null} plan  dreamPlan() result when on Phase 2.
 */
export function buildUsAdvisorContext(result, lang, plan) {
  if (!result) return null
  return {
    market: 'us',
    lang,
    maxPrice: result.maxPrice,
    limit: result.limit, // cash | front_end | back_end
    income: result.inputs.grossIncome,
    savings: result.inputs.savings,
    monthlyDebts: result.inputs.monthlyDebts,
    state: result.inputs.state,
    downPct: result.rules.downPct,
    ratePct: result.rules.ratePct,
    rateAsOf: result.rules.rateAsOf,
    monthlyHousing: Math.round(result.monthlyCosts.total),
    cashNeeded: Math.round(result.downPaymentBreakdown.cashNeeded),
    housingRatioPct: pct1(result.ratios.housing),
    debtRatioPct: pct1(result.ratios.debt),
    pmi: result.flags.pmi,
    jumbo: result.flags.jumbo,
    lenderStretch: { at45: result.stretch.price, at50: result.stretch.maxPrice },
    dream: plan
      ? {
          price: plan.price,
          reachable: plan.reachable,
          cashGap: plan.levers.saveMore,
          incomeGap: plan.levers.earnMore,
          debtCutMonthly: plan.levers.cutDebt,
          monthlyHousing: Math.round(plan.monthly.total),
        }
      : null,
  }
}

/* -------------------------------------------------------------------- tools */

export const US_RECOMPUTE_TOOL = {
  name: 'recompute_us_affordability',
  description:
    "Re-run the user's US affordability calculation with one or more inputs changed, " +
    'to answer a "what if..." question. Every field is optional: omit anything that ' +
    "should stay as it is, and it is inherited from the user's current numbers. Returns " +
    'the new maximum price, which of the three lender tests limits it (cash, housing ' +
    'cost, total debt), cash needed at closing, the monthly housing cost, and the ' +
    "deltas against the user's current result. Use it whenever the user asks about a " +
    'change to income, savings, monthly debts, down payment, state, mortgage rate or HOA ' +
    'dues. Never estimate such a figure yourself.',
  input_schema: {
    type: 'object',
    properties: {
      grossIncome: { type: 'number', description: 'Annual gross household income, USD.' },
      savings: { type: 'number', description: 'Cash for down payment + closing costs, USD.' },
      monthlyDebts: { type: 'number', description: 'Monthly debt payments (car, student loans, cards), USD.' },
      downPct: { type: 'number', description: `Down payment, % of price, ${R.min_down_payment_pct}-90.` },
      state: { type: 'string', description: `State code. One of: ${STATE_CODES.join(', ')}.` },
      ratePct: { type: 'number', description: '30-year fixed mortgage rate, %, e.g. 6.5.' },
      hoaMonthly: { type: 'number', description: 'HOA dues, USD per month.' },
      label: { type: 'string', description: 'Short human label, max 40 chars, e.g. "Paying off the car".' },
    },
    required: [],
  },
}

export const US_PRICE_TOOL = {
  name: 'check_home_price',
  description:
    'Test a specific home price against the user\'s US numbers: whether it passes each ' +
    'lender test (cash, housing cost, total debt), the monthly housing cost at that price, ' +
    'and — if it does not pass — the concrete levers that would close the gap (save more, ' +
    'earn more, cut monthly debt, put less down, or aim lower). Use it for any "can I ' +
    'afford $X?" or "what would it take to buy at $X?" question. Optional fields change ' +
    'the user\'s inputs for this check only.',
  input_schema: {
    type: 'object',
    properties: {
      price: { type: 'number', description: 'Home price to test, USD.' },
      grossIncome: { type: 'number', description: 'Annual gross household income, USD.' },
      savings: { type: 'number', description: 'Cash for down payment + closing, USD.' },
      monthlyDebts: { type: 'number', description: 'Monthly debt payments, USD.' },
      downPct: { type: 'number', description: `Down payment, %, ${R.min_down_payment_pct}-90.` },
      state: { type: 'string', description: `State code. One of: ${STATE_CODES.join(', ')}.` },
      ratePct: { type: 'number', description: 'Mortgage rate, %.' },
      label: { type: 'string', description: 'Short human label, max 40 chars.' },
    },
    required: ['price'],
  },
}

export const US_ADVISOR_TOOLS = [US_RECOMPUTE_TOOL, US_PRICE_TOOL]

const LIMITS = {
  price: 50_000_000,
  grossIncome: 10_000_000,
  savings: 50_000_000,
  monthlyDebts: 200_000,
  hoaMonthly: 20_000,
}
const CLAMPS = {
  downPct: { min: R.min_down_payment_pct, max: 90 },
  ratePct: { min: 1, max: 15 },
}
const NUMERIC = ['price', ...Object.keys(LIMITS).filter((k) => k !== 'price'), ...Object.keys(CLAMPS)]

/** Whitelist + coerce + range-check a US tool payload from the model. */
export function sanitiseUsInput(raw, allowed) {
  const errors = []
  const input = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, input, errors: ['Tool input must be an object.'] }
  }
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) errors.push(`Unknown parameter "${key}" — ignored.`)
  }
  for (const field of NUMERIC) {
    if (!allowed.includes(field)) continue
    const v0 = raw[field]
    if (v0 === undefined || v0 === null || v0 === '') continue
    const value = typeof v0 === 'string' ? Number(v0.replace(/[$,\s%]/g, '')) : Number(v0)
    if (!Number.isFinite(value)) { errors.push(`"${field}" must be a number.`); continue }
    if (value < 0) { errors.push(`"${field}" cannot be negative.`); continue }
    if (CLAMPS[field]) {
      const c = Math.min(CLAMPS[field].max, Math.max(CLAMPS[field].min, value))
      if (c !== value) errors.push(`${field} clamped to ${c}.`)
      input[field] = c
      continue
    }
    if (value > LIMITS[field]) { errors.push(`"${field}" is implausibly large — ignored.`); continue }
    input[field] = value
  }
  if (allowed.includes('state') && raw.state !== undefined && raw.state !== null && raw.state !== '') {
    const code = String(raw.state).trim().toUpperCase()
    if (!STATE_CODES.includes(code)) errors.push(`State "${raw.state}" is not in the dataset. Available: ${STATE_CODES.join(', ')}.`)
    else input.state = code
  }
  if (raw.label !== undefined && raw.label !== null) input.label = String(raw.label).slice(0, 40)
  return { input, errors }
}

const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0

/** The app's US form values (strings) → engine input. */
function engineInput(values) {
  const v = values || {}
  return {
    grossIncome: num(v.grossIncome),
    savings: num(v.savings),
    monthlyDebts: num(v.monthlyDebts),
    downPct: num(v.downPct) || undefined,
    state: v.region || undefined,
    rate: num(v.ratePct) ? num(v.ratePct) / 100 : undefined,
    hoaMonthly: num(v.hoaMonthly),
  }
}

/** Tool overrides → engine input fields. */
function applyOverrides(base, o) {
  const next = { ...base }
  for (const k of ['grossIncome', 'savings', 'monthlyDebts', 'downPct', 'hoaMonthly']) if (o[k] !== undefined) next[k] = o[k]
  if (o.state !== undefined) next.state = o.state
  if (o.ratePct !== undefined) next.rate = o.ratePct / 100
  return next
}

/** Tool overrides → the app's form-value keys (for "Apply to my inputs"). */
function toFormOverrides(o) {
  const out = {}
  for (const k of ['grossIncome', 'savings', 'monthlyDebts', 'downPct', 'ratePct', 'hoaMonthly']) if (o[k] !== undefined) out[k] = o[k]
  if (o.state !== undefined) out.region = o.state
  return out
}

function summarise(r) {
  return {
    maxPrice: r.maxPrice,
    limit: r.limit,
    viable: r.viable,
    cashNeeded: Math.round(r.downPaymentBreakdown.cashNeeded),
    downPayment: Math.round(r.downPaymentBreakdown.total),
    closingCosts: Math.round(r.downPaymentBreakdown.closingCosts),
    loan: Math.round(r.downPaymentBreakdown.mortgage),
    monthlyHousing: Math.round(r.monthlyCosts.total),
    pmiMonthly: Math.round(r.monthlyCosts.pmi),
    housingRatioPct: pct1(r.ratios.housing),
    debtRatioPct: pct1(r.ratios.debt),
    lenderStretch: { at45: r.stretch.price, at50: r.stretch.maxPrice },
    jumbo: r.flags.jumbo,
    downPct: r.rules.downPct,
    ratePct: r.rules.ratePct,
  }
}

const REMINDER = 'Quote only the figures in this result, in USD. Do not compute or extrapolate new ones.'

/**
 * Run a US tool call. `values` are the app's current US form values.
 * @returns {{ok:boolean, content:object, scenario?:object}}
 */
export function runUsAdvisorTool(name, rawInput, values) {
  const base = engineInput(values)
  if (name === US_RECOMPUTE_TOOL.name) {
    const allowed = Object.keys(US_RECOMPUTE_TOOL.input_schema.properties)
    const { input, errors } = sanitiseUsInput(rawInput, allowed)
    const { label, ...overrides } = input
    if (!Object.keys(overrides).length) {
      return { ok: false, content: { error: 'Could not run that scenario.', detail: [...errors, 'No usable change was supplied — nothing to recompute.'] } }
    }
    const current = calculateAffordability(base)
    const scenario = calculateAffordability(applyOverrides(base, overrides))
    return {
      ok: true,
      scenario: {
        label: label || null,
        target: 'phase1',
        overrides: toFormOverrides(overrides),
        maxPrice: scenario.maxPrice,
        headline: usd(scenario.maxPrice),
      },
      content: {
        changed: overrides,
        current: summarise(current),
        scenario: summarise(scenario),
        delta: { maxPrice: scenario.maxPrice - current.maxPrice, limitChanged: scenario.limit !== current.limit },
        note: errors.length ? errors : undefined,
        currency: 'USD',
        reminder: REMINDER,
      },
    }
  }
  if (name === US_PRICE_TOOL.name) {
    const allowed = Object.keys(US_PRICE_TOOL.input_schema.properties)
    const { input, errors } = sanitiseUsInput(rawInput, allowed)
    if (!input.price) return { ok: false, content: { error: 'A home price is required.', detail: errors } }
    const { price, label, ...overrides } = input
    const plan = dreamPlan(applyOverrides(base, overrides), price)
    const c = plan.check
    return {
      ok: true,
      content: {
        price,
        label: label || undefined,
        changed: Object.keys(overrides).length ? overrides : undefined,
        reachable: plan.reachable,
        tests: {
          cash: { ok: c.cash.ok, needed: Math.round(c.cash.needed), have: Math.round(c.cash.have), gap: Math.round(c.cash.gap) },
          housingCost: { ok: c.frontEnd.ok, pctOfIncome: pct1(c.frontEnd.ratio), limitPct: R.front_end_ratio_pct },
          totalDebt: { ok: c.backEnd.ok, pctOfIncome: pct1(c.backEnd.ratio), limitPct: R.back_end_ratio_pct },
        },
        monthlyHousing: Math.round(plan.monthly.total),
        levers: plan.levers.lowerDown
          ? { ...plan.levers, lowerDown: { downPct: plan.levers.lowerDown.downPct, passes: plan.levers.lowerDown.passes } }
          : plan.levers,
        maxPriceToday: plan.maxPriceToday,
        note: errors.length ? errors : undefined,
        currency: 'USD',
        reminder: REMINDER,
      },
    }
  }
  return { ok: false, content: { error: `Unknown tool "${name}". Available: ${US_ADVISOR_TOOLS.map((t) => t.name).join(', ')}.` } }
}

export const isUsToolName = (name) => US_ADVISOR_TOOLS.some((t) => t.name === name)

/* ------------------------------------------------------------------- prompt */

/** System-prompt lines for US buyers, worded from us-data.json. */
export function usPromptRules() {
  return [
    "You are Plinthly's home-affordability advisor for first-time home buyers in the United States.",
    `US rules the calculator uses: max price is the LOWEST of three lender tests — (1) cash: savings must cover the down payment plus ~${R.closing_costs_pct_of_price.typical}% closing costs; (2) housing cost (principal & interest, property tax, insurance, PMI under ${R.pmi.no_pmi_at_down_pct}% down, HOA) at most ${R.front_end_ratio_pct}% of gross monthly income; (3) housing plus other monthly debts at most ${R.back_end_ratio_pct}%. ` +
      `Those are the comfortable guideline; Fannie Mae allows total debts up to ${R.back_end_stretch_ratio_pct}% with strong credit and reserves and ${R.back_end_max_ratio_pct}% through Desktop Underwriter ("lenderStretch" in the context). The old 43% QM cap no longer applies — never cite it. ` +
      `Minimum down payment ${R.min_down_payment_pct}% for first-time buyers (Fannie Mae / Freddie Mac programs). PMI can be cancelled on request at ${R.pmi.cancel_request_ltv_pct}% of the original value and ends automatically at ${R.pmi.auto_terminate_ltv_pct}%. Loans above ${usd(R.conforming_limits.baseline_usd)} are jumbo in most counties (high-cost ceiling ${usd(R.conforming_limits.high_cost_ceiling_usd)}). ` +
      `The default rate is the Freddie Mac weekly 30-year average (${R.default_rate.thirty_year_pct}%, week of ${R.default_rate.week_of}) — not a quote; credit score changes the real rate.`,
    'You are NOT a licensed advisor. Frame everything as illustrative. When you give a plan, end by suggesting a HUD-approved housing counseling agency (free or low-cost) and comparing Loan Estimates from at least three lenders.',
    'Use USD figures. Never mention Swiss rules, CHF, cantons or pillars. Write plainly and never use long dashes (—); use commas, colons or full stops instead.',
  ]
}

export function usToolsPrompt() {
  return 'TOOLS: you have `recompute_us_affordability` (what-ifs on income, savings, monthly debts, down payment, state, rate, HOA), `check_home_price` (test a specific price and get the levers that would close any gap) and `explain_term` (what a word means, from the vetted glossary, with a learn-more link). CALL THEM; do not estimate or define terms from memory. Pass only the fields that change; the rest are inherited. Scenario figures may come ONLY from a tool result in this conversation.'
}

export function usPlanTask() {
  return 'TASK: produce a short, structured roadmap to the dream price — the cash gap and how long saving would take, any income or debt lever, whether a smaller down payment helps, and a realistic alternative price. Use only context numbers and tool results.'
}

export { DEFAULT_RATE, US_RULES }
