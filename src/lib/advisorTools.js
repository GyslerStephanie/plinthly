/**
 * Advisor agent tools — the bridge between the LLM and the deterministic engine.
 *
 * Per docs/specs/ADVISOR_AGENT_SPEC.md: the model chooses WHICH calculation to
 * run and with WHAT inputs; this module runs it against `affordability.js` and
 * hands back the figures. The model never computes a number — it only ever
 * quotes one that came back from here.
 *
 * PURE. No React, no network, no app state. Everything it needs is passed in,
 * which is what makes it testable from scripts/agent.conformance.mjs.
 *
 * SECURITY POSTURE: model output is untrusted input. Nothing here spreads a raw
 * tool payload into the engine — every field is whitelisted, coerced, and range
 * checked, and an unknown tool or param is a rejection, never a pass-through.
 */

import { calculateAffordability } from './affordability.js'
import { summarize, SCENARIOS, MAX_YEARS, COMPARE_DEFAULTS } from './compare/model.js'
import data from '../data/swiss-cantonal-data.json'
import { US_ADVISOR_TOOLS, isUsToolName, runUsAdvisorTool } from '../markets/us/advisor.js'

const CANTON_CODES = Object.keys(data.cantons)

/** Fields the model may vary. Anything else is rejected. */
const NUMERIC_FIELDS = ['grossIncome', 'savings', 'pillar3a', 'pillar2', 'downPct']
const ALLOWED_FIELDS = [...NUMERIC_FIELDS, 'canton', 'label']

/** Sanity ceilings. Not regulatory — just "this is not a real household" guards. */
const LIMITS = {
  grossIncome: 10_000_000,
  savings: 50_000_000,
  pillar3a: 50_000_000,
  pillar2: 50_000_000,
  downPct: { min: 20, max: 90 },
}

export const RECOMPUTE_TOOL = {
  name: 'recompute_affordability',
  description:
    "Re-run the user's Swiss affordability calculation with one or more inputs " +
    'changed, to answer a "what if..." question. Every field is optional: omit ' +
    'anything that should stay as it is now, and it is inherited from the ' +
    "user's current profile. Returns the new maximum purchase price, which " +
    'constraint binds, the down-payment and annual-cost breakdowns, and the ' +
    "deltas against the user's current result. Use this whenever the user asks " +
    'about a change to their income, savings, Pillar 3a, 2nd pillar, ' +
    'down-payment percentage, or canton. Never estimate such a figure yourself.',
  input_schema: {
    type: 'object',
    properties: {
      grossIncome: { type: 'number', description: 'Annual gross household income, CHF.' },
      savings: { type: 'number', description: 'Hard cash savings, CHF. Hard equity.' },
      pillar3a: { type: 'number', description: 'Pillar 3a balance, CHF. Hard equity.' },
      pillar2: { type: 'number', description: '2nd pillar (BVG) available to pledge, CHF. Soft equity — counts toward the 20% only, never the 10% floor.' },
      downPct: { type: 'number', description: 'Down-payment percentage, 20-90.' },
      canton: { type: 'string', description: `Canton code. One of: ${CANTON_CODES.join(', ')}.` },
      label: { type: 'string', description: 'Short human label for this scenario, max 40 chars, e.g. "Buying together".' },
    },
    required: [],
  },
}

/* ==========================================================================
 * Compare surface — the scenario dashboard (lib/compare/model.js)
 * ========================================================================== */

const SCENARIO_IDS = SCENARIOS.map((s) => s.id)

/** Compare inputs the model may vary, with plausibility ceilings. */
const COMPARE_NUMERIC = {
  price: 100_000_000,
  cash: 50_000_000,
  rentMonthly: 200_000,
  savingMonthly: 200_000,
  income: 10_000_000,
  mortgageRatePct: 25,
  investReturnPct: 30,
  appreciationPct: 30,
  rentInflationPct: 30,
  incomeGrowthPct: 30,
  marginalTaxPct: 60,
  downPaymentPct: 90,
  maintenancePct: 10,
  buyInYear: MAX_YEARS,
}
const COMPARE_FIELDS = [...Object.keys(COMPARE_NUMERIC), 'regime', 'trueCost', 'scenarioId', 'year', 'label']

export const COMPARE_TOOL = {
  name: 'run_compare_scenario',
  description:
    'Run one of the rent-vs-buy comparison scenarios on the Compare dashboard ' +
    'and return the result at a given horizon: where each side lands, the ' +
    'difference, and the break-even year. Use it both to ANSWER questions about ' +
    'what the scenarios show ("which is ahead at year 10?", "what would it take ' +
    'for renting to win?") and to try a change the user asks about ("what if the ' +
    'mortgage rate were 3%?"). Every input is optional and inherited from what ' +
    'is currently on the dashboard. Never estimate these figures yourself — the ' +
    'model is the only source.',
  input_schema: {
    type: 'object',
    properties: {
      scenarioId: { type: 'string', description: `Which comparison to run. One of: ${SCENARIO_IDS.join(', ')}. Defaults to the one on screen.` },
      year: { type: 'number', description: `Horizon in years, 1-${MAX_YEARS}.` },
      price: { type: 'number', description: 'Purchase price, CHF.' },
      cash: { type: 'number', description: 'Liquid cash available at the start, CHF. Both sides start from this same amount.' },
      rentMonthly: { type: 'number', description: 'Monthly rent of the comparable home, CHF.' },
      savingMonthly: { type: 'number', description: 'Monthly amount saved/invested, CHF.' },
      income: { type: 'number', description: 'Annual gross income, CHF.' },
      mortgageRatePct: { type: 'number', description: 'Mortgage interest rate, %.' },
      investReturnPct: { type: 'number', description: 'Expected annual investment return, %.' },
      appreciationPct: { type: 'number', description: 'Annual property appreciation, %.' },
      rentInflationPct: { type: 'number', description: 'Annual rent inflation, %.' },
      incomeGrowthPct: { type: 'number', description: 'Annual income growth, %.' },
      marginalTaxPct: { type: 'number', description: 'Marginal income tax rate, %.' },
      downPaymentPct: { type: 'number', description: 'Down payment, % of price (Swiss minimum 20).' },
      maintenancePct: { type: 'number', description: 'Maintenance + ancillary costs, % of value per year.' },
      buyInYear: { type: 'number', description: 'For the buy_later scenario: the year the purchase happens.' },
      regime: { type: 'string', description: "Tax regime: 'old' (Eigenmietwert) or 'new' (post-2025 referendum)." },
      trueCost: { type: 'boolean', description: 'rent_vs_buy only: include the opportunity cost of capital tied up in the home.' },
      label: { type: 'string', description: 'Short human label for this scenario, max 40 chars.' },
    },
    required: [],
  },
}

export const ADVISOR_TOOLS = [RECOMPUTE_TOOL, COMPARE_TOOL]

/**
 * The tools that make sense on a given surface. Sending the model a tool it
 * cannot usefully call just invites a wrong call, so each screen offers only its
 * own: Phase 1 recomputes affordability, Compare runs scenarios.
 */
export function toolsFor(surface, market = 'ch') {
  if (market === 'us') return US_ADVISOR_TOOLS
  if (surface === 'compare') return [COMPARE_TOOL]
  return [RECOMPUTE_TOOL]
}

const isToolName = (name) => ADVISOR_TOOLS.some((tool) => tool.name === name)

/** Whitelist + coerce + range-check a Compare payload from the model. */
export function sanitiseCompareInput(raw) {
  const errors = []
  const input = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, input, errors: ['Tool input must be an object.'] }
  }

  for (const key of Object.keys(raw)) {
    if (!COMPARE_FIELDS.includes(key)) errors.push(`Unknown parameter "${key}" — ignored.`)
  }

  for (const [field, max] of Object.entries(COMPARE_NUMERIC)) {
    if (raw[field] === undefined || raw[field] === null || raw[field] === '') continue
    const value = typeof raw[field] === 'string' ? Number(raw[field].replace(/['\s,]/g, '')) : Number(raw[field])
    if (!Number.isFinite(value)) { errors.push(`"${field}" must be a number.`); continue }
    if (value < 0) { errors.push(`"${field}" cannot be negative.`); continue }
    if (value > max) { errors.push(`"${field}" is outside the plausible range (max ${max}) — ignored.`); continue }
    input[field] = value
  }

  if (raw.scenarioId !== undefined && raw.scenarioId !== null && raw.scenarioId !== '') {
    const id = String(raw.scenarioId).trim()
    if (!SCENARIO_IDS.includes(id)) errors.push(`Unknown scenario "${raw.scenarioId}". Available: ${SCENARIO_IDS.join(', ')}.`)
    else input.scenarioId = id
  }

  if (raw.year !== undefined && raw.year !== null && raw.year !== '') {
    const year = Number(raw.year)
    if (!Number.isFinite(year)) errors.push('"year" must be a number.')
    else {
      input.year = Math.min(MAX_YEARS, Math.max(1, Math.round(year)))
      if (input.year !== year) errors.push(`Horizon clamped to ${input.year} years.`)
    }
  }

  if (raw.regime !== undefined && raw.regime !== null && raw.regime !== '') {
    const regime = String(raw.regime).trim().toLowerCase()
    if (regime !== 'old' && regime !== 'new') errors.push(`"regime" must be "old" or "new".`)
    else input.regime = regime
  }

  if (typeof raw.trueCost === 'boolean') input.trueCost = raw.trueCost

  if (raw.label !== undefined && raw.label !== null) input.label = String(raw.label).slice(0, 40)

  // A Compare call with no change is still valid: it means "tell me what the
  // dashboard currently shows", which is a question worth answering.
  return { ok: true, input, errors }
}

/** Run one Compare scenario and describe it against what is currently on screen. */
function runCompareTool(rawInput, compareCtx) {
  const ctx = compareCtx || {}
  const baseInputs = { ...COMPARE_DEFAULTS, ...(ctx.inputs || {}) }
  const baseScenario = ctx.scenario || SCENARIO_IDS[0]
  const baseYear = Math.min(MAX_YEARS, Math.max(1, Number(ctx.year) || 10))

  const { input, errors } = sanitiseCompareInput(rawInput)
  const { label, scenarioId, year, ...overrides } = input

  const useScenario = scenarioId || baseScenario
  const useYear = year || baseYear
  const merged = { ...baseInputs, ...overrides }

  const base = summarize(baseScenario, baseInputs, baseYear)
  const next = summarize(useScenario, merged, useYear)
  const changedKeys = Object.keys(overrides)

  // Which side is winning depends on the lens: cost scenarios compare CUMULATIVE
  // COST (lower wins), the others compare NET WORTH (higher wins). `summarize()`
  // exports an `aheadKey` that ignores this — it is unused by the dashboard,
  // which computes its own winner, so we do the same rather than change the
  // compare model (invariant 5). Getting it backwards would invert the advice.
  const winnerOf = (sum) => (sum.costLens ? (sum.a < sum.b ? sum.hA : sum.hB) : sum.diff >= 0 ? sum.hA : sum.hB)

  const shape = (sum, scn, yr) => ({
    scenario: scn,
    year: yr,
    sideA: { key: sum.hA, value: Math.round(sum.a) },
    sideB: { key: sum.hB, value: Math.round(sum.b) },
    gap: Math.abs(Math.round(sum.diff)),
    ahead: winnerOf(sum),
    breakEvenYear: sum.breakEven,
    lens: sum.costLens ? 'cumulative cost — LOWER is better' : 'net worth — HIGHER is better',
  })

  return {
    ok: true,
    scenario: changedKeys.length || scenarioId || year
      ? {
          label: label || null,
          target: 'compare',
          overrides: { ...overrides, ...(scenarioId ? { scenarioId } : {}), ...(year ? { year } : {}) },
          aheadKey: winnerOf(next),
          gap: Math.abs(Math.round(next.diff)),
        }
      : null,
    content: {
      changed: changedKeys.reduce((acc, k) => ({ ...acc, [k]: { from: baseInputs[k], to: overrides[k] } }), {}),
      onScreen: shape(base, baseScenario, baseYear),
      result: shape(next, useScenario, useYear),
      deltaVsOnScreen: Math.round(next.diff - base.diff),
      note: errors.length ? errors : undefined,
      currency: 'CHF',
      reminder: 'Quote only the figures in this result. Do not compute or extrapolate new ones.',
    },
  }
}

/**
 * Whitelist + coerce + range-check a scenario payload from the model.
 * @returns {{ok: boolean, input: object, errors: string[]}}
 */
export function sanitiseScenarioInput(raw) {
  const errors = []
  const input = {}
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, input, errors: ['Tool input must be an object.'] }
  }

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_FIELDS.includes(key)) errors.push(`Unknown parameter "${key}" — ignored.`)
  }

  for (const field of NUMERIC_FIELDS) {
    if (raw[field] === undefined || raw[field] === null || raw[field] === '') continue
    const value = typeof raw[field] === 'string' ? Number(raw[field].replace(/['\s,]/g, '')) : Number(raw[field])
    if (!Number.isFinite(value)) {
      errors.push(`"${field}" must be a number.`)
      continue
    }
    if (value < 0) {
      errors.push(`"${field}" cannot be negative.`)
      continue
    }
    if (field === 'downPct') {
      // The engine clamps too; clamping here keeps the echoed scenario honest.
      input.downPct = Math.min(LIMITS.downPct.max, Math.max(LIMITS.downPct.min, value))
      if (input.downPct !== value) errors.push(`Down payment clamped to ${input.downPct}%.`)
      continue
    }
    if (value > LIMITS[field]) {
      errors.push(`"${field}" is implausibly large — ignored.`)
      continue
    }
    input[field] = value
  }

  if (raw.canton !== undefined && raw.canton !== null && raw.canton !== '') {
    const code = String(raw.canton).trim().toUpperCase()
    if (!CANTON_CODES.includes(code)) {
      errors.push(`Canton "${raw.canton}" is not in the dataset. Available: ${CANTON_CODES.join(', ')}.`)
    } else {
      input.canton = code
    }
  }

  if (raw.label !== undefined && raw.label !== null) {
    input.label = String(raw.label).slice(0, 40)
  }

  const changed = Object.keys(input).filter((k) => k !== 'label')
  if (changed.length === 0) errors.push('No usable change was supplied — nothing to recompute.')

  return { ok: changed.length > 0, input, errors }
}

/** The subset of an engine result the advisor is allowed to talk about. */
function summarise(result) {
  return {
    maxPrice: result.maxPrice,
    bindingConstraint: result.bindingConstraint,
    viable: result.viable,
    downPayment: {
      total: Math.round(result.downPaymentBreakdown.total),
      fromCash: Math.round(result.downPaymentBreakdown.fromCash),
      fromPillar3a: Math.round(result.downPaymentBreakdown.fromPillar3a),
      fromPillar2: Math.round(result.downPaymentBreakdown.fromPillar2),
      mortgage: Math.round(result.downPaymentBreakdown.mortgage),
    },
    annualCosts: {
      total: Math.round(result.annualCosts.total),
      incomeSharePct: Math.round(result.annualCosts.incomeShare * 1000) / 10,
      ceiling: Math.round(result.annualCosts.affordabilityCeiling),
    },
    downPct: result.rules.downPct,
  }
}

/**
 * Execute a tool call from the model.
 *
 * @param {string} name      Tool name the model asked for.
 * @param {object} rawInput  Unvalidated tool input from the model.
 * @param {object} ctx       What the user currently has on screen:
 *                           `{ values }` on Phase 1 (the App form values), and/or
 *                           `{ compare: { scenario, inputs, year } }` on Compare.
 *                           A bare values object is still accepted for callers
 *                           that predate the Compare surface.
 * @returns {{ok: boolean, content: object}} `content` is JSON-stringified into
 *          the tool_result block, so it must stay small and quotable.
 */
export function runAdvisorTool(name, rawInput, ctx) {
  // US tools run on the US engine against the US form values.
  if (isUsToolName(name)) return runUsAdvisorTool(name, rawInput, (ctx && ctx.values) || {})
  if (!isToolName(name)) {
    return { ok: false, content: { error: `Unknown tool "${name}". Available: ${ADVISOR_TOOLS.map((tool) => tool.name).join(', ')}.` } }
  }

  const context = ctx || {}
  if (name === COMPARE_TOOL.name) return runCompareTool(rawInput, context.compare)

  const baseValues = context.values || context
  const { ok, input, errors } = sanitiseScenarioInput(rawInput)
  if (!ok) return { ok: false, content: { error: 'Could not run that scenario.', detail: errors } }

  const { label, ...overrides } = input
  const merged = { ...baseValues, ...overrides }

  const base = calculateAffordability({ ...baseValues, householdSize: Number(baseValues.householdSize) || 1 })
  const scenario = calculateAffordability({ ...merged, householdSize: Number(merged.householdSize) || 1 })

  const changed = Object.keys(overrides)
  return {
    ok: true,
    scenario: {
      label: label || null,
      target: 'phase1',
      overrides,
      maxPrice: scenario.maxPrice,
      headline: `CHF ${Math.round(scenario.maxPrice).toLocaleString('de-CH')}`,
    },
    content: {
      changed: changed.reduce((acc, key) => ({ ...acc, [key]: { from: Number(baseValues[key]) || 0, to: overrides[key] } }), {}),
      current: summarise(base),
      scenario: summarise(scenario),
      delta: {
        maxPrice: scenario.maxPrice - base.maxPrice,
        bindingConstraintChanged: scenario.bindingConstraint !== base.bindingConstraint,
      },
      note: errors.length ? errors : undefined,
      currency: 'CHF',
      reminder: 'Quote only the figures in this result. Do not compute or extrapolate new ones.',
    },
  }
}
