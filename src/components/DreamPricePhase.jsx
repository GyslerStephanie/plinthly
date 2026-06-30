import { useState, useEffect } from 'react'
import { chf, int, pct, groupDigits } from '../lib/format'
import {
  checkSpecificProperty,
  monthlyCostsAtRate,
  DEFAULT_MARKET_RATE,
  RULE_CONSTANTS,
} from '../lib/affordability'
import { useI18n } from '../i18n/I18nContext'
import { Card, Row } from './ui'
import Collapsible from './Collapsible'
import PathToGoal from './PathToGoal'
import Levers from './Levers'
import NextSteps from './NextSteps'
import CompareCta from './CompareCta'
import { GapChart, TrajectoryChart, MilestoneTable } from './DreamPriceCharts'

const roundK = (v) => Math.round(v / 1000) * 1000

/** A labelled horizontal bar segment used in the cost-distribution visual. */
function Bar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
      {segments.map((s, i) => (
        <div key={i} className={s.color} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${chf(s.value)}`} />
      ))}
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function TierBadge({ labelKey }) {
  const { t } = useI18n()
  return (
    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
      {t(labelKey)}
    </span>
  )
}

/**
 * Forward mode: "does this specific property work for me?"
 * Runs the full spec calculation — Niederstwertprinzip, existing obligations,
 * property type adjustments — and shows a line-by-line breakdown of both tests.
 */
export default function DreamPricePhase({ result, onNavigate, onDreamContext, dreamPrice, onDreamPriceChange, onCompare }) {
  const { t } = useI18n()

  // Own the market-rate used for the "what you'd actually pay" lines.
  const [rate, setRate] = useState(DEFAULT_MARKET_RATE)
  // Single source of truth for the savings pace, shared across the path, the
  // trajectory chart, and the milestone table.
  const [savingsPerMonth, setSavingsPerMonth] = useState(2000)

  // --- form state ---
  // Dream price is lifted to App (controlled) so it persists in the URL hash;
  // fall back to local state if rendered standalone.
  const [localPrice, setLocalPrice] = useState('')
  const price    = dreamPrice != null ? dreamPrice : localPrice
  const setPrice = onDreamPriceChange || setLocalPrice
  // Two-step: enter the dream price, then reveal the comparison. Land on the
  // result step when a price was restored from the hash.
  const [step, setStep] = useState(() =>
    String(dreamPrice ?? '').replace(/[^0-9]/g, '') ? 'result' : 'input',
  )
  const [showAssessed, setShowAssessed] = useState(false)
  const [assessed, setAssessed]     = useState('')
  const [propType, setPropType]     = useState('primary')
  const [obligations, setObligations] = useState('')

  const priceNum = Number(String(price).replace(/[^0-9]/g, '')) || 0
  const check = priceNum
    ? checkSpecificProperty({
        purchase_price:               priceNum,
        gross_annual_income:          result.inputs.grossIncome,
        liquid_savings:               result.inputs.savings,
        pillar3a_available:           result.inputs.pillar3a,
        pillar2_available:            result.inputs.pillar2,
        assessed_value:               showAssessed ? (Number(String(assessed).replace(/[^0-9]/g, '')) || null) : null,
        property_type:                propType,
        existing_monthly_obligations: Number(String(obligations).replace(/[^0-9]/g, '')) || 0,
      })
    : null

  const monthly = check ? monthlyCostsAtRate(check.purchasePrice, check.mortgage, rate, check.ltv) : null

  // Gaps to the dream price, for the verdict line + path/levers.
  const dreamEquityGap = check ? Math.max(check.downShortfall, check.liquidShortfall) : 0
  const dreamIncomeGap = check && !check.affordQualifies
    ? Math.max(0, check.monthlyNotionalTotal / 0.333 - check.effectiveMonthlyIncome) * 12
    : 0

  // Reframed verdict: which test is the real blocker, and the concrete levers
  // to close the gap (income, equity, a reachable-now price, obligations).
  const eqShort  = check ? !check.downQualifies : false
  const affShort = check ? !check.affordQualifies : false
  const blockerKey = affShort && !eqShort ? 'blockerIncome'
    : eqShort && !affShort ? 'blockerEquity'
    : 'blockerBoth'
  const closeGapLevers = check && !check.qualifies ? [
    affShort && dreamIncomeGap > 0 && { key: 'check.leverIncome', vars: { amount: chf(roundK(dreamIncomeGap)) } },
    eqShort && check.downShortfall > 0 && { key: 'check.leverEquity', vars: { amount: chf(roundK(check.downShortfall)) } },
    { key: 'check.leverPrice', vars: { amount: chf(result.maxPrice) } },
    affShort && check.existingObligations > 0 && { key: 'check.leverObligations', vars: { amount: chf(check.existingObligations) } },
  ].filter(Boolean) : []

  // Report the dream gap up to App so the AI advisor can ground answers on it.
  // Primitive deps avoid re-firing every render (which would loop).
  const dreamPriceVal = check ? check.purchasePrice : 0
  const dreamQualifies = check ? check.qualifies : false
  const dreamEffectiveDown = check ? check.effectiveDown : 0
  useEffect(() => {
    if (!onDreamContext) return
    onDreamContext(
      dreamPriceVal
        ? { price: dreamPriceVal, qualifies: dreamQualifies, equityGap: dreamEquityGap, incomeGap: dreamIncomeGap, effectiveDown: dreamEffectiveDown }
        : null,
    )
  }, [dreamPriceVal, dreamQualifies, dreamEquityGap, dreamIncomeGap, dreamEffectiveDown, onDreamContext])

  return (
    <div className="space-y-5">
      {/* Echoed current situation (carries forward from Phase 1) */}
      <Card title={t('dream.contextTitle')}>
        <Row label={t('dream.currentMax')} value={chf(result.maxPrice)} strong />
        <Row label={t('dream.yourEquity')} value={chf(result.inputs.hardEquity)} sub={t('dream.hardEquitySub')} />
        <Row label={t('dream.yourIncome')} value={`${chf(result.inputs.grossIncome)}/yr`} />
      </Card>

      <Card title={t('check.title')}>
      {(step === 'input' || !check) ? (
      <div className="dream-input-step">
      <p className="mb-4 text-sm leading-relaxed text-slate-600">{t('check.intro')}</p>

      {/* ── Price input ── */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">{t('check.priceLabel')}</label>
          <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
            <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
            <input
              type="text" inputMode="numeric"
              value={groupDigits(price)}
              onChange={(e) => setPrice(groupDigits(e.target.value))}
              placeholder="1,200,000"
              className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-right tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
            />
          </div>
        </div>

        {/* ── Optional: assessed value ── */}
        <div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showAssessed}
              onChange={(e) => setShowAssessed(e.target.checked)}
              className="accent-teal-600"
            />
            {t('check.assessedToggle')}
          </label>
          {showAssessed && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
                <input
                  type="text" inputMode="numeric"
                  value={groupDigits(assessed)}
                  onChange={(e) => setAssessed(groupDigits(e.target.value))}
                  placeholder="1,100,000"
                  className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-right tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
                />
              </div>
              <p className="text-xs leading-relaxed text-slate-500">{t('check.assessedHint')}</p>
            </div>
          )}
        </div>

        {/* ── Optional: property type ── */}
        <div>
          <label className="block text-sm font-medium text-slate-700">{t('check.propTypeLabel')}</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {[
              { val: 'primary',    key: 'check.propTypePrimary' },
              { val: 'holiday',    key: 'check.propTypeHoliday' },
              { val: 'investment', key: 'check.propTypeInvestment' },
            ].map(({ val, key }) => (
              <button
                key={val} type="button"
                onClick={() => setPropType(val)}
                className={
                  'rounded-lg border px-2 py-2 text-xs font-medium transition ' +
                  (propType === val
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                }
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Optional: existing obligations ── */}
        <div>
          <label className="block text-sm font-medium text-slate-700">{t('check.obligationsLabel')}</label>
          <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
            <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
            <input
              type="text" inputMode="numeric"
              value={groupDigits(obligations)}
              onChange={(e) => setObligations(groupDigits(e.target.value))}
              placeholder="0"
              className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-right tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
            />
            <span className="select-none pr-3 text-sm text-slate-400">/mo</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{t('check.obligationsHint')}</p>
          {!obligations && (
            <p className="mt-0.5 text-xs italic text-amber-700">{t('check.obligationsSkipped')}</p>
          )}
        </div>
      </div>

      {/* Save the dream price & reveal the comparison */}
      <button
        type="button"
        onClick={() => { if (priceNum > 0) setStep('result') }}
        disabled={priceNum <= 0}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('check.saveNext')}
      </button>
      </div>
      ) : (
        <div className="space-y-5">
          {/* Back to edit the saved numbers */}
          <button
            type="button"
            onClick={() => setStep('input')}
            className="inline-flex items-center gap-1 text-sm font-medium text-body transition hover:text-ink"
          >
            ← {t('check.editNumbers')}
          </button>

          {/* Overall verdict. Qualifying = a clean positive panel. Not yet =
              a NEUTRAL "out of reach right now" panel that names the blocker and
              lists how to close the gap — an invitation to explore, not a fail. */}
          {check.qualifies ? (
            <div className="rounded-xl border border-line bg-white p-4 border-l-4 border-l-positive">
              <p className="flex items-center gap-2 text-base font-semibold text-positive">
                <span className="inline-block h-2 w-2 rounded-full bg-positive" aria-hidden />
                {t('check.qualifies')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-body">{t('check.qualifiesNote')}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-white p-4 border-l-4 border-l-ink">
              <p className="flex items-center gap-2 text-base font-semibold text-ink">
                <span className="inline-block h-2 w-2 rounded-full bg-ink" aria-hidden />
                {t('check.outOfReach', { price: chf(check.purchasePrice) })}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-body">{t('check.outOfReachNote')}</p>
              <p className="mt-1 text-sm font-medium text-ink">{t(`check.${blockerKey}`)}</p>

              {/* How to close the gap — the concrete levers */}
              <p id="close-the-gap" className="mt-3 scroll-mt-24 text-xs font-semibold uppercase tracking-wide text-muted">
                {t('check.closeGapTitle')}
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {closeGapLevers.map((lever) => (
                  <li key={lever.key} className="flex items-start gap-2 text-sm text-body">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
                    <span>{t(lever.key, lever.vars)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gap chart — price + hard equity + equity-with-pillar-2, vs the dream */}
          <GapChart
            currentMax={result.maxPrice}
            dreamPrice={check.purchasePrice}
            hardEquity={check.hardEquity}
            totalEquity={check.totalAvailable}
            needEquity={check.effectiveDown}
          />

          {/* Actionable path + levers stay visible (the answer up top) */}
          {!check.qualifies && (
            <>
              <PathToGoal
                targetPrice={check.purchasePrice}
                currentMax={result.maxPrice}
                equityGap={dreamEquityGap}
                incomeGapAnnual={dreamIncomeGap}
                savingsPerMonth={savingsPerMonth}
                onSavingsChange={setSavingsPerMonth}
              />
              <Levers
                lever3a={result.pillar3aLever}
                hardEquityGap={check.liquidShortfall}
                existingDebtMonthly={check.existingObligations}
                debtBlocking={!check.affordQualifies}
              />
            </>
          )}

          {/* Path over time — visible & interactive (adjust the monthly budget) */}
          {dreamEquityGap > 0 && (
            <Card title={t('dream.trajTitle')}>
              <TrajectoryChart
                startEquity={result.inputs.hardEquity}
                requiredEquity={check.effectiveDown}
                savingsPerMonth={savingsPerMonth}
                onSavingsChange={setSavingsPerMonth}
              />
            </Card>
          )}

          {/* Year-by-year detail collapses by default (progressive disclosure) */}
          {dreamEquityGap > 0 && (
            <>
              <Collapsible title={t('dream.milestoneTitle')}>
                <MilestoneTable
                  startEquity={result.inputs.hardEquity}
                  requiredEquity={check.effectiveDown}
                  savingsPerMonth={savingsPerMonth}
                  onSavingsChange={setSavingsPerMonth}
                />
              </Collapsible>
            </>
          )}

          {/* ── Required calculations (collapsed by default) ── */}
          <Collapsible title={t('check.calcTitle')}>

          {/* ── Down payment breakdown ── */}
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('check.downTitle')}
            </h4>

            {/* Valuation basis */}
            {check.flags.niederstwert && (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                {t('check.downValGapNote')}
              </div>
            )}
            {check.flags.assessedUnknown && (
              <p className="mb-2 text-xs italic text-slate-400">
                {t('check.assessedHint')}
              </p>
            )}

            <div className="space-y-0.5">
              <Row
                label={<>{t('check.downRegMin')}<TierBadge labelKey="check.tierLocked" /></>}
                value={chf(check.regMin)}
              />
              {check.valuationGap > 0 && (
                <Row
                  label={<>{t('check.downValGap')}<TierBadge labelKey="check.tierSituation" /></>}
                  value={chf(check.valuationGap)}
                />
              )}
              {check.propTypeAdj > 0 && (
                <Row
                  label={<>{t('check.downPropType', { type: propType })}<TierBadge labelKey="check.tierSituation" /></>}
                  value={chf(check.propTypeAdj)}
                />
              )}
              {check.bankBuffer > 0 && (
                <Row
                  label={<>{t('check.downBank')}<TierBadge labelKey="check.tierInput" /></>}
                  value={chf(check.bankBuffer)}
                />
              )}
              <div className="my-1 border-t border-slate-200" />
              <Row
                label={t('check.downEffective', { pct: pct(check.effectiveDownPct) })}
                value={chf(check.effectiveDown)}
                strong
              />
            </div>

            {/* Funds vs requirement */}
            <div className="mt-3 space-y-0.5">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{t('check.fundsTitle')}</p>
              <Row label={t('check.fundsSavings')} value={chf(result.inputs.savings)} />
              <Row
                label={<>
                  {t('check.fundsPillar2')}
                  {check.flags.pillar2Capped &&
                    <span className="ml-1 text-xs text-amber-700">
                      {t('check.fundsPillar2Cap', { max: chf(check.maxPillar2) })}
                    </span>}
                </>}
                value={chf(check.pillar2Used)}
              />
              <div className="my-1 border-t border-slate-200" />
              <Row label={t('check.fundsTotal')} value={chf(check.totalAvailable)} strong />
              {check.downShortfall > 0
                ? <Row label={t('check.fundsShortfall')} value={`−${chf(check.downShortfall)}`} />
                : <p className="py-1 text-sm text-teal-700">{t('check.fundsOk')}</p>
              }
            </div>

            {/* Liquid requirement callout */}
            <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              {t('check.liquidReq', { amount: chf(check.minLiquid) })}
              {' '}
              {check.liquidShortfall > 0
                ? <span className="font-medium text-red-700">{t('check.liquidShort', { short: chf(check.liquidShortfall), amount: chf(check.minLiquid) })}</span>
                : <span className="font-medium text-teal-700">{t('check.liquidOk')}</span>
              }
            </div>
          </div>

          {/* ── Affordability breakdown ── */}
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('check.affordTitle')}
            </h4>
            <div className="space-y-0.5">
              <Row label={t('check.affordMortgage')} value={chf(check.mortgage)} sub={t('result.ltv', { pct: pct(check.ltv) })} />
              {check.secondMtg > 0 && (
                <Row label={t('check.affordSecond')} value={chf(check.secondMtg)} />
              )}
              <div className="my-1 border-t border-slate-100" />
              <Row label={t('check.affordInterest')} value={chf(check.monthlyNotionalInterest)} sub="/mo" />
              <Row label={t('check.affordAmort')} value={chf(check.monthlyAmort)} sub={t('check.affordAmortSub')} />
              <Row label={t('check.affordMaint')} value={chf(check.monthlyMaintenance)} sub="/mo" />
              <div className="my-1 border-t border-slate-100" />
              <Row label={t('check.affordNotionalTotal')} value={chf(check.monthlyNotionalTotal)} strong />
              <div className="my-2 border-t border-slate-200" />
              <Row label={t('check.affordIncome')} value={chf(check.monthlyIncome)} />
              {check.existingObligations > 0 && (
                <Row label={t('check.affordObligations')} value={`−${chf(check.existingObligations)}`} />
              )}
              <Row label={t('check.affordEffective')} value={chf(check.effectiveMonthlyIncome)} strong />
              <div className="my-1 border-t border-slate-100" />
              <Row
                label={t('check.affordRatio')}
                value={pct(check.affordRatio, 1)}
                sub={check.affordQualifies ? '✓' : '✗'}
              />
              <Row label={t('check.affordCeiling')} value={pct(0.333, 1)} />
            </div>
          </div>

          {/* ── What you'd actually pay (market rate from slider) ── */}
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('check.monthlyActual', { rate: pct(rate, 1) })}
            </h4>
            <div className="mb-3 flex items-center gap-3">
              <span className="shrink-0 text-xs text-muted">{t('result.rateLabel')}</span>
              <input
                type="range" min="1" max="6" step="0.1"
                value={(rate * 100).toFixed(1)}
                onChange={(e) => setRate(Number(e.target.value) / 100)}
                className="flex-1 accent-ink"
                aria-label={t('result.rateLabel')}
              />
              <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">{pct(rate, 1)}</span>
            </div>
            <Bar
              segments={[
                { label: t('result.monthInterest'), value: monthly.interest,     color: 'bg-teal-600' },
                { label: t('result.amort'),          value: monthly.amortization, color: 'bg-teal-400' },
                { label: t('result.maintenance'),    value: monthly.maintenance,  color: 'bg-slate-300' },
              ]}
            />
            <div className="mt-2 space-y-0.5">
              <Row label={t('result.monthInterest')} value={chf(monthly.interest)} sub={t('result.monthInterestSub', { pct: pct(rate, 1) })} />
              <Row label={t('result.amort')}         value={chf(monthly.amortization)} />
              <Row label={t('result.maintenance')}   value={chf(monthly.maintenance)} />
              <div className="my-1 border-t border-slate-100" />
              <Row label={t('result.monthTotal')} value={chf(monthly.total)} strong />
            </div>
          </div>

          </Collapsible>

          {/* ── Choose your next step (CTAs last, §6b) ── */}
          {!check.qualifies && (
            <NextSteps
              onExploreSustainable={() => onNavigate?.(3)}
              onExploreRenovations={() => onNavigate?.(4)}
              advisorContext="dream_price"
            />
          )}

          {/* Doubt re-triggers here — the dream-vs-max gap. Same Compare hook. */}
          {onCompare && <div className="mt-6"><CompareCta onCompare={onCompare} /></div>}

        </div>
      )}
      </Card>
    </div>
  )
}
