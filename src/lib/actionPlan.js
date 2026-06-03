/**
 * Phase 4 "What do I do next?" — generate a personalized 3–5 step action plan
 * from the full profile (Phase 1 result + Phase 2 selections + chosen option).
 *
 * Steps are returned as translation KEYS + interpolation vars (not prose), so
 * the Phase 4 component can render them in the active language via t().
 */

import { getCanton } from './cantons'
import { chf } from './format'
import { impliedSize } from './exploration'
import { computeLedger, selectedMeasures } from './retrofit'

/**
 * @param {object} profile
 * @param {object} profile.phase1   Result of calculateAffordability.
 * @param {object} profile.explore  Phase 2 selections (canton, chosenOption…).
 * @returns {Array<{titleKey, bodyKey, vars, tone, link?}>}
 */
export function buildActionPlan(profile) {
  const { phase1, explore } = profile
  const canton = getCanton(explore.canton)
  const steps = []

  // 1. The financial reality — always first, honest before optimistic.
  if (!phase1.viable && phase1.shortfall) {
    if (phase1.shortfall.type === 'equity') {
      const gap = phase1.shortfall.savingsGap
      const monthly = Math.round((phase1.inputs.grossIncome * 0.15) / 12)
      const months = monthly > 0 ? Math.ceil(gap / monthly) : null
      steps.push({
        titleKey: 'actionPlan.closeEquityTitle',
        bodyKey: months ? 'actionPlan.closeEquityBody' : 'actionPlan.closeEquityBodyNoTime',
        vars: { gap: chf(gap), monthly: chf(monthly), months },
        tone: 'amber',
      })
    } else {
      steps.push({
        titleKey: 'actionPlan.growIncomeTitle',
        bodyKey: 'actionPlan.growIncomeBody',
        vars: { gap: chf(phase1.shortfall.incomeGap) },
        tone: 'amber',
      })
    }
  } else {
    steps.push({
      titleKey: 'actionPlan.mortgageTitle',
      bodyKey: 'actionPlan.mortgageBody',
      vars: { max: chf(phase1.maxPrice) },
      tone: 'teal',
    })
  }

  // 2. Sustainability / subsidy step — canton-specific.
  if (canton?.gebaeueprogramm?.available) {
    const measures = canton.gebaeueprogramm.key_measures.slice(0, 3).join(', ')
    steps.push({
      titleKey: 'actionPlan.subsidiesTitle',
      bodyKey: 'actionPlan.subsidiesBody',
      vars: { canton: canton.name_en, measures },
      tone: 'teal',
      link: {
        labelKey: 'actionPlan.subsidiesLink',
        labelVars: { canton: canton.name_en },
        url: canton.gebaeueprogramm.url,
      },
    })
  }

  // 3. Option-specific next step.
  if (explore.chosenOption === 'renovate') {
    const budget = Number(String(explore.budget).replace(/[^0-9.]/g, '')) || 0
    const size = impliedSize(explore.canton, budget, explore.propertyType)
    const ledger = computeLedger(size, budget, selectedMeasures(explore.measures))
    steps.push({
      titleKey: 'actionPlan.renovateTitle',
      bodyKey: 'actionPlan.renovateBody',
      vars: { cls: ledger.newClass, net: chf(ledger.netCost), monthly: chf(ledger.monthlySaving) },
      tone: 'default',
    })
  } else if (explore.chosenOption === 'new') {
    steps.push({ titleKey: 'actionPlan.minergieTitle', bodyKey: 'actionPlan.minergieBody', tone: 'default' })
  } else if (explore.chosenOption === 'build') {
    steps.push({ titleKey: 'actionPlan.plotTitle', bodyKey: 'actionPlan.plotBody', tone: 'default' })
  }

  // 4. Always-on closing step.
  steps.push({ titleKey: 'actionPlan.pressureTitle', bodyKey: 'actionPlan.pressureBody', tone: 'default' })

  return steps.slice(0, 5)
}
