/**
 * US Phase 5 — a personalised 3–5 step action plan from everything above.
 * English only (the US market is en-only), so steps are plain strings with
 * links rather than translation keys. Every figure comes from the engines.
 */
import home from './us-home-data.json'
import { formatMoney } from '../../lib/format.js'
import us from './index.js'
import { upgradeLedger, optionBuild, optionNewCertified, sizeFromBudget } from './home.js'

const usd = (n) => formatMoney(Math.round(Number(n) || 0), us)
const L = home.links

/**
 * @param {object} p
 * @param {object} p.result        Phase 1 US result (calculateAffordability).
 * @param {string} p.state         State code.
 * @param {number} p.budget        Budget explored in Phase 3/4.
 * @param {string} [p.option]      'upgrade' | 'new' | 'build'
 * @param {string[]} [p.measures]  Upgrade measures (when option = 'upgrade').
 * @returns {Array<{title, body, tone, links: Array<{label, url}>}>}
 */
export function buildUsActionPlan({ result, state, budget, option, measures = [] }) {
  const steps = []
  const st = home.states[state]

  // 1. Money first — honest before optimistic.
  if (!result.viable && result.shortfall) {
    steps.push(
      result.shortfall.type === 'equity'
        ? {
            title: 'Build your cash for closing',
            body: `You need about ${usd(result.shortfall.savingsGap)} more in savings to cover the down payment and closing costs on a ${usd(result.shortfall.targetPrice)} home.`,
            tone: 'amber',
            links: [],
          }
        : {
            title: 'Grow your income or lower your debts',
            body: `About ${usd(result.shortfall.incomeGap)} more in yearly income would get you to a ${usd(result.shortfall.targetPrice)} home${result.shortfall.debtLimited ? ', or pay down monthly debts first' : ''}.`,
            tone: 'amber',
            links: [],
          },
    )
  } else {
    steps.push({
      title: 'Get pre-approved and compare three lenders',
      body: `You can comfortably afford about ${usd(result.maxPrice)}. Ask at least three lenders for a Loan Estimate for the same loan and compare the rate, points and closing costs line by line.`,
      tone: 'teal',
      links: [{ label: 'How to read a Loan Estimate (CFPB)', url: L.cfpb_loan_estimate }],
    })
  }

  // 2. The state's first-time-buyer help.
  const prog = st && st.buyer_programs && st.buyer_programs[0]
  if (prog) {
    steps.push({
      title: 'Check first-time buyer help in your state',
      body: `${prog.name}: ${prog.offer} These programmes usually require their own mortgage through a participating lender and a homebuyer class.`,
      tone: 'teal',
      links: [{ label: prog.name, url: prog.url }],
    })
  }

  // 3. The route chosen in Phase 4.
  const size = sizeFromBudget(state, budget)
  if (option === 'upgrade' && size) {
    const led = upgradeLedger(state, size.mid, measures)
    const r = led.rebates
    steps.push({
      title: 'Plan your upgrades before you close',
      body:
        `Book an energy audit (about ${usd(home.costs.energy_audit_usd.low)}–${usd(home.costs.energy_audit_usd.high)}) during the inspection period. ` +
        `Your plan costs about ${usd(led.cost.mid)} and ${led.annualSaving >= 0 ? `saves about ${usd(led.monthlySaving)}/mo` : `adds about ${usd(-led.monthlySaving)}/mo`} in energy. ` +
        (r.status === 'open'
          ? `Your state's rebate programme is open: up to ${usd(r.upTo)} back if your household income qualifies.`
          : 'Check utility rebates; the state rebate programme is not open right now.'),
      tone: 'default',
      links: [{ label: r.program, url: r.url }, { label: 'All incentives by ZIP (DSIRE)', url: L.dsire }],
    })
  } else if (option === 'new' && size) {
    const n = optionNewCertified(state, budget, size.mid)
    steps.push({
      title: 'Ask for the HERS score or ENERGY STAR certificate',
      body: `A certified new home should save about ${usd(n.annualSaving)}/yr in energy versus a typical existing home here. Ask the builder for the HERS rating and certificate before you sign.`,
      tone: 'default',
      links: [{ label: 'ENERGY STAR new homes', url: L.energy_star_new_homes }, { label: 'Find a HERS rater', url: L.resnet_rater }],
    })
  } else if (option === 'build' && size) {
    const b = optionBuild(state, size.mid)
    steps.push({
      title: 'Price the lot and get three builder bids',
      body: `Construction runs about ${usd(b.perSqft.low)}–${usd(b.perSqft.high)} per sq ft here, before land. Budget another ${usd(b.softCosts.low)}–${usd(b.softCosts.high)} for design, permits and contingency, and about ${Math.round(b.timelineMonths)} months to build.`,
      tone: 'default',
      links: [{ label: 'DOE Zero Energy Ready homes', url: L.doe_zerh }],
    })
  }

  // 4. Inspection + energy score.
  steps.push({
    title: 'Inspect before you commit',
    body: `A home inspection costs about ${usd(home.costs.inspection_usd.low)}–${usd(home.costs.inspection_usd.high)}. Ask for a DOE Home Energy Score too: a 1–10 rating with upgrade suggestions.`,
    tone: 'default',
    links: [{ label: 'Home Energy Score', url: L.home_energy_score }],
  })

  // 5. Free, independent advice.
  steps.push({
    title: 'Talk to a HUD-approved housing counselor',
    body: 'Free or low-cost, independent advice on your budget, credit and assistance programmes before you sign anything.',
    tone: 'default',
    links: [{ label: 'Find a counselor (HUD)', url: L.hud_counselors }],
  })

  return steps.slice(0, 5)
}
