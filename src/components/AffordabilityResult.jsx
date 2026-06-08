import { useState } from 'react'
import { chf, int, pct } from '../lib/format'
import {
  buildPriceLadder,
  monthlyCostsAtRate,
  affordabilityState,
  checkSpecificProperty,
  DEFAULT_MARKET_RATE,
} from '../lib/affordability'
import { getCanton, eigenmietwert } from '../lib/cantons'
import { useI18n } from '../i18n/I18nContext'
import { T, renderRich } from './Trans'
import Collapsible from './Collapsible'
import PathToGoal from './PathToGoal'
import Levers from './Levers'
import NextSteps from './NextSteps'

const roundK = (v) => Math.round(v / 1000) * 1000

/** Badge label + card tone for each of the four affordability states. */
const STATE_META = {
  comfortable: { labelKey: 'result.viableComfortable', tone: 'teal' },
  qualifies: { labelKey: 'result.viableQualifies', tone: 'teal' },
  tight: { labelKey: 'result.viableTight', tone: 'amber' },
}

/** The actionable lead message shown under the price for each viable state. */
const STATE_MSG = {
  comfortable: 'result.stateMsgComfortable',
  qualifies: 'result.stateMsgQualifies',
  tight: 'result.stateMsgTight',
}

/** Market-rate slider — drives only "what you'd really pay", never qualification. */
function RateSlider({ rate, onChange, t, notional }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor="mktRate" className="text-sm font-medium text-slate-700">
          {t('result.rateLabel')}
        </label>
        <span className="tabular-nums text-sm font-semibold text-teal-700">{pct(rate, 1)}</span>
      </div>
      <input
        id="mktRate"
        type="range"
        min="1"
        max="6"
        step="0.1"
        value={(rate * 100).toFixed(1)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="mt-2 w-full accent-teal-600"
      />
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-400">
        <span>1%</span>
        <span>6%</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        {t('result.rateHint', { notional })}
      </p>
    </div>
  )
}

/** A labelled horizontal bar segment used in the breakdown visualisations. */
function Bar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
      {segments.map((s, i) => (
        <div
          key={i}
          className={s.color}
          style={{ width: `${(s.value / total) * 100}%` }}
          title={`${s.label}: ${chf(s.value)}`}
        />
      ))}
    </div>
  )
}

function Row({ label, value, sub, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span
        className={'text-sm ' + (strong ? 'font-semibold text-slate-900' : 'text-slate-600')}
      >
        {label}
        {sub && <span className="ml-1 text-xs text-slate-400">{sub}</span>}
      </span>
      <span
        className={
          'tabular-nums ' +
          (strong ? 'text-base font-semibold text-slate-900' : 'text-sm text-slate-700')
        }
      >
        {value}
      </span>
    </div>
  )
}

function Card({ title, children, tone = 'default' }) {
  const tones = {
    default: 'border-line bg-white',
    teal: 'border-line bg-white',
    amber: 'border-line bg-white',
  }
  return (
    <section className={`rounded-xl border p-5 shadow-sm ${tones[tone]}`}>
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}

/**
 * Monthly carrying cost at the chosen market rate: a stacked cost-distribution
 * bar, per-component line items (interest / amortization / maintenance), and a
 * stress-rate reality note. Reused for both the affordable price and a typed
 * dream price (via the `showing` label).
 */
function MonthlyCostCard({ price, mortgage, ltv, rate, onRate, notionalPct, maintenancePct, showing }) {
  const { t } = useI18n()
  const mc = monthlyCostsAtRate(price, mortgage, rate, ltv)
  const share = (v) => (mc.total > 0 ? pct(v / mc.total) : '0%')

  return (
    <Collapsible title={t('result.monthlyTitle')}>
      <p className="-mt-1 mb-4 text-xs text-slate-500">{showing}</p>

      <RateSlider rate={rate} onChange={onRate} t={t} notional={notionalPct} />

      {/* Stacked cost-distribution bar (interest / amortization / maintenance) */}
      <div className="mb-1 mt-5 text-xs font-medium text-slate-500">{t('result.monthDistLabel')}</div>
      <Bar
        segments={[
          { label: t('result.monthInterest'), value: mc.interest, color: 'bg-teal-600' },
          { label: t('result.amort'), value: mc.amortization, color: 'bg-teal-400' },
          { label: t('result.maintenance'), value: mc.maintenance, color: 'bg-slate-300' },
        ]}
      />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <Legend color="bg-teal-600" label={`${t('result.monthInterest')} · ${share(mc.interest)}`} />
        <Legend color="bg-teal-400" label={`${t('result.amort')} · ${share(mc.amortization)}`} />
        <Legend color="bg-slate-300" label={`${t('result.maintenance')} · ${share(mc.maintenance)}`} />
      </div>

      {/* Per-component monthly line items */}
      <div className="mt-3">
        <Row
          label={t('result.monthInterest')}
          value={chf(mc.interest)}
          sub={t('result.monthInterestSub', { pct: pct(rate, 1) })}
        />
        <Row label={t('result.amort')} value={chf(mc.amortization)} sub={t('result.amortSub')} />
        <Row
          label={t('result.maintenance')}
          value={chf(mc.maintenance)}
          sub={t('result.maintenanceSub', { pct: maintenancePct })}
        />
        <div className="my-1 border-t border-slate-100" />
        <Row label={t('result.monthTotal')} value={chf(mc.total)} strong />
      </div>

      <T
        as="div"
        className="mt-3 rounded-lg bg-teal-50 p-3 text-xs leading-relaxed text-teal-900"
        k="result.monthStress"
        vars={{ notionalPct, notionalMo: chf(mc.totalNotional) }}
      />
    </Collapsible>
  )
}

/** Localized "numbers don't work yet" / shortfall sentence from engine data. */
function shortfallMessage(t, sf) {
  if (!sf) return ''
  const target = chf(sf.targetPrice)
  if (sf.type === 'equity') {
    if (sf.savingsGap > 0) return t('shortfall.equity', { gap: chf(roundK(sf.savingsGap)), target })
    return t('shortfall.equityClose')
  }
  return t('shortfall.income', { gap: chf(roundK(sf.incomeGap)), target })
}

/** A single bullet in the Key Takeaways summary — teal check + rich text. */
function TakeawayItem({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-positive text-[10px] font-bold leading-none text-white">
        ✓
      </span>
      <span className="text-sm leading-relaxed text-slate-700">{children}</span>
    </li>
  )
}

/**
 * Top-of-result TL;DR: the 3–4 things a buyer most needs to walk away with —
 * the ceiling, the lever that moves it, the cash up front, and the real vs.
 * stress-tested monthly cost. Distilled from the same engine data the detail
 * cards below expand on. Falls back to a shortfall summary when not viable.
 */
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

/** Scroll to and focus the income field — the "edit your numbers" affordance. */
function editNumbers() {
  const el = document.getElementById('grossIncome')
  if (!el) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => el.focus({ preventScroll: true }), 350)
}

export default function AffordabilityResult({ result, renovation, isPreview = false, onNavigate }) {
  const { t } = useI18n()
  const canton = getCanton(result.inputs.canton)
  const { downPaymentBreakdown: dp, annualCosts: ac, constraints } = result
  const cashPctOfPrice = result.maxPrice > 0 ? dp.fromSavings / result.maxPrice : 0
  const eigenRate = canton ? canton.tax.eigenmietwert_rate_pct_of_market_rent : 60

  // User-adjustable market rate — only affects "what you'd really pay" displays.
  const [rate, setRate] = useState(DEFAULT_MARKET_RATE)

  // One of: 'not_viable' | 'tight' | 'comfortable' | 'qualifies'.
  const state = affordabilityState(result)
  const stateMeta = STATE_META[state]
  const notionalPct = pct(result.rules.notionalRatePct / 100)

  return (
    <div className="space-y-4">
      {isPreview && (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 no-print">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-teal-500" aria-hidden />
          {t('result.livePreview')}
        </div>
      )}
      {/* Headline — four states (binding-constraint based) */}
      {result.viable ? (
        <Card tone={stateMeta.tone}>
          <div className="flex items-start justify-between gap-3">
            <p
              className={
                'text-sm font-medium ' +
                (stateMeta.tone === 'amber' ? 'text-amber-800' : 'text-teal-800')
              }
            >
              {t('result.headlineLabel')}
            </p>
            <span
              className={
                'rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
                (stateMeta.tone === 'amber'
                  ? 'bg-warning-light text-amber-800'
                  : 'bg-positive-light text-positive')
              }
            >
              ● {t(stateMeta.labelKey)}
            </span>
          </div>
          <p
            className={
              'mt-1 font-display text-3xl font-black tracking-tight tabular-nums text-ink'
            }
          >
            {chf(result.maxPrice)}
          </p>
          {/* Actionable, state-specific lead message */}
          <T
            as="p"
            className={
              'mt-2 text-sm font-medium leading-relaxed ' +
              (stateMeta.tone === 'amber' ? 'text-amber-900' : 'text-teal-900')
            }
            k={STATE_MSG[state]}
          />
          {/* Deeper "why this number" explanation, paired to the binding constraint */}
          {result.bindingConstraint === 'income' ? (
            <T
              as="p"
              className="mt-2 text-sm leading-relaxed text-slate-600"
              k="result.heldByIncome"
              term={t('terms.housingCosts')}
              def={t('terms.housingCostsDef')}
            />
          ) : (
            <T
              as="p"
              className="mt-2 text-sm leading-relaxed text-slate-600"
              k="result.heldByEquity"
              vars={{
                down: pct(result.rules.minDownPct / 100),
                liquid: pct(result.rules.minLiquidPct / 100),
              }}
            />
          )}
        </Card>
      ) : (
        <Card tone="amber">
          <p className="text-sm font-semibold text-amber-800">{t('result.notViableTitle')}</p>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
            {shortfallMessage(t, result.shortfall)}
          </p>
        </Card>
      )}

      {/* Edit/return affordance — desktop shows the form alongside; mobile scrolls to it */}
      {!isPreview && (
        <div className="flex justify-end no-print">
          <button
            type="button"
            onClick={editNumbers}
            className="text-sm font-medium text-body underline-offset-2 transition hover:text-ink hover:underline"
          >
            {t('result.editNumbers')}
          </button>
        </div>
      )}

      {/* Key takeaways — TL;DR summary of the detail cards below */}
      <KeyTakeaways result={result} rate={rate} />

      {/* Effective budget after a modelled renovation (Phase 3 feeds this) */}
      {renovation && result.maxPrice > 0 && (
        <Card title={t('result.renoTitle')} tone="teal">
          <Row label={t('result.renoCeiling')} value={chf(result.maxPrice)} />
          <Row
            label={t('result.renoUpgrade')}
            value={`−${chf(renovation.netCost)}`}
            sub={t('result.renoToClass', { cls: renovation.newClass })}
          />
          <div className="my-1 border-t border-slate-100" />
          <Row
            label={t('result.renoEffective')}
            value={chf(Math.max(0, result.maxPrice - renovation.netCost))}
            strong
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{t('result.renoNote')}</p>
        </Card>
      )}

      {/* Two ceilings chart */}
      <Collapsible title={t('result.ceilingsTitle')}>
        <T as="p" className="mb-4 text-sm leading-relaxed text-slate-600" k="result.ceilingsIntro" />
        <CeilingChart
          equity={constraints.equityMaxPrice}
          income={constraints.affordabilityMaxPrice}
          maxPrice={result.maxPrice}
          binding={result.bindingConstraint}
        />
      </Collapsible>

      {/* Down payment breakdown */}
      <Collapsible title={t('result.stakeTitle')}>
        <Row label={t('result.purchasePrice')} value={chf(result.maxPrice)} strong />
        <div className="my-3">
          <Bar
            segments={[
              { label: t('result.cashSavings'), value: dp.fromSavings, color: 'bg-teal-600' },
              { label: t('result.pillarPension'), value: dp.fromPillar2, color: 'bg-teal-300' },
              { label: t('result.mortgage'), value: dp.mortgage, color: 'bg-slate-300' },
            ]}
          />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <Legend color="bg-teal-600" label={t('result.cashSavings')} />
            <Legend color="bg-teal-300" label={t('result.pillarPension')} />
            <Legend color="bg-slate-300" label={t('result.mortgageDebt')} />
          </div>
        </div>
        <Row
          label={t('result.cashSavings')}
          value={chf(dp.fromSavings)}
          sub={t('result.ofPrice', { pct: pct(cashPctOfPrice) })}
        />
        <Row
          label={t('result.pillarPension')}
          value={chf(dp.fromPillar2)}
          sub={dp.fromPillar2 > 0 ? t('result.pillarSub') : undefined}
        />
        <div className="my-1 border-t border-slate-100" />
        <Row
          label={t('result.downPayment')}
          value={chf(dp.total)}
          sub={t('result.ofPrice', { pct: pct(result.rules.downPct / 100) })}
        />
        <Row
          label={t('result.mortgage')}
          value={chf(dp.mortgage)}
          sub={t('result.ltv', { pct: pct(dp.ltv) })}
        />
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          {t('result.stakeNote', {
            liquid: pct(result.rules.minLiquidPct / 100),
            pillar: pct(result.rules.maxPillar2Pct / 100),
          })}
        </p>
        {result.inputs.pillar2 > dp.fromPillar2 + 1 && (
          <T
            as="div"
            className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
            k="result.pensionLimit"
            vars={{ entered: chf(result.inputs.pillar2), used: chf(dp.fromPillar2) }}
          />
        )}
      </Collapsible>

      {/* Affordability / annual cost breakdown */}
      <Collapsible title={t('result.carryTitle')}>
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs font-medium">
            <span className={ac.incomeShare > result.rules.costRatio ? 'text-amber-700' : 'text-teal-700'}>
              {t('result.used', { pct: pct(ac.incomeShare, 1) })}
            </span>
            <span className="text-slate-400">
              {t('result.ceilingPct', { pct: pct(result.rules.costRatio, 1) })}
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={
                'h-full rounded-full ' +
                (ac.incomeShare > result.rules.costRatio ? 'bg-amber-500' : 'bg-teal-600')
              }
              style={{ width: `${Math.min(100, (ac.incomeShare / result.rules.costRatio) * 100)}%` }}
            />
          </div>
        </div>
        <Row
          label={t('result.interest')}
          value={chf(ac.interest)}
          sub={t('result.interestSub', { pct: pct(result.rules.notionalRatePct / 100) })}
        />
        <Row label={t('result.amort')} value={chf(ac.amortization)} sub={t('result.amortSub')} />
        <Row
          label={t('result.maintenance')}
          value={chf(ac.maintenance)}
          sub={t('result.maintenanceSub', { pct: pct(result.rules.maintenancePct / 100) })}
        />
        <div className="my-1 border-t border-slate-100" />
        <Row label={t('result.totalAnnual')} value={chf(ac.total)} strong />
        <Row label={t('result.ceilingThird')} value={chf(ac.affordabilityCeiling)} />
        {result.maxPrice > 0 && (
          <T
            as="div"
            className="mt-3 rounded-lg bg-teal-50 p-3 text-xs leading-relaxed text-teal-900"
            k="result.realityRate"
            vars={{
              notionalPct,
              notional: chf(ac.interest),
              realPct: pct(rate, 1),
              real: chf(dp.mortgage * rate),
              realMo: chf(Math.round((dp.mortgage * rate) / 12)),
            }}
          />
        )}
      </Collapsible>

      {/* Monthly cost at an actual market rate — the slider-driven "real" view */}
      {result.maxPrice > 0 && (
        <MonthlyCostCard
          price={result.maxPrice}
          mortgage={dp.mortgage}
          ltv={dp.ltv}
          rate={rate}
          onRate={setRate}
          notionalPct={notionalPct}
          maintenancePct={pct(result.rules.maintenancePct / 100)}
          showing={t('result.monthlyForAfford', { price: chf(result.maxPrice) })}
        />
      )}

      {/* Price ladder */}
      {result.maxPrice > 0 && (
        <Collapsible title={t('result.ladderTitle')}>
          <T
            as="p"
            className="mb-3 text-sm leading-relaxed text-slate-600"
            k="result.ladderIntro"
            vars={{ max: chf(result.maxPrice) }}
          />
          <PriceLadder
            rows={buildPriceLadder(result.maxPrice, result.rules.downPct / 100)}
            downPct={result.rules.downPct}
            ltvPct={result.rules.ltvPct}
          />
        </Collapsible>
      )}

      {/* Forward mode — check a specific property */}
      <PropertyChecker result={result} rate={rate} onNavigate={onNavigate} />

      {/* What would change this (only when not viable) */}
      {!result.viable && result.shortfall && (
        <Card title={t('result.changeTitle')} tone="amber">
          {result.shortfall.type === 'equity' ? (
            <T
              as="p"
              className="text-sm leading-relaxed text-slate-700"
              k="result.changeEquity"
              vars={{
                gap: chf(roundK(result.shortfall.savingsGap)),
                liquid: pct(result.rules.minLiquidPct / 100),
              }}
            />
          ) : (
            <T
              as="p"
              className="text-sm leading-relaxed text-slate-700"
              k="result.changeIncome"
              vars={{ gap: chf(roundK(result.shortfall.incomeGap)) }}
            />
          )}
        </Card>
      )}

      {/* Not viable → a path to the goal, the levers, and next steps */}
      {!result.viable && result.shortfall && (
        <>
          <PathToGoal
            targetPrice={result.shortfall.targetPrice}
            currentMax={result.maxPrice}
            equityGap={result.shortfall.type === 'equity' ? result.shortfall.savingsGap : 0}
            incomeGapAnnual={result.shortfall.type === 'income' ? result.shortfall.incomeGap : 0}
          />
          <Levers
            lever3a={result.pillar3aLever}
            hardEquityGap={result.shortfall.type === 'equity' ? result.shortfall.savingsGap : 0}
          />
          <NextSteps
            onExploreSustainable={() => onNavigate?.(2)}
            onExploreRenovations={() => onNavigate?.(3)}
            advisorContext="not_viable"
          />
        </>
      )}

      {/* Eigenmietwert overview */}
      <Collapsible title={t('result.taxTitle')}>
        <T
          as="p"
          className="text-sm leading-relaxed text-slate-700"
          k="result.taxIntro"
          term={t('terms.eigenmietwert')}
          def={t('terms.eigenmietwertDef', { rate: eigenRate })}
        />
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
          <T
            k="result.taxStatus"
            vars={{
              date: new Date(eigenmietwert.referendum_date).toLocaleDateString('en-CH', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }),
            }}
          />
          {canton && (
            <span>
              {t('result.taxCanton', {
                canton: canton.name_en,
                status: canton.tax.eigenmietwert_status,
              })}
            </span>
          )}
          <span>{t('result.eigenVariance', { rate: eigenRate })}</span>
          <span>{t('result.taxVerify')}</span>
        </div>
      </Collapsible>
    </div>
  )
}

/**
 * Horizontal comparison of the equity vs income ceilings on a shared scale.
 */
function CeilingChart({ equity, income, maxPrice, binding }) {
  const { t } = useI18n()
  const scaleMax = Math.max(equity, income, 1)
  const niceMax = Math.ceil(scaleMax / 100000) * 100000 || scaleMax
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f))
  const gap = Math.abs(equity - income)
  const markerLeft = (maxPrice / niceMax) * 100

  const rows = [
    { key: 'equity', label: t('result.equityCeiling'), value: equity, isBinding: binding === 'equity' },
    { key: 'income', label: t('result.incomeCeiling'), value: income, isBinding: binding === 'income' },
  ]

  return (
    <div className="relative">
      {maxPrice > 0 && (
        <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${markerLeft}%` }}>
          <div className="absolute -top-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {chf(maxPrice)}
          </div>
          <div className="h-full w-px border-l border-dashed border-slate-400" />
        </div>
      )}

      <div className="space-y-3 pt-5">
        {rows.map((r) => {
          const reachW = Math.min(100, (Math.min(r.value, maxPrice) / niceMax) * 100)
          const slackW = Math.max(0, (r.value / niceMax) * 100 - reachW)
          return (
            <div key={r.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  {r.label}
                  <span
                    className={
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
                      (r.isBinding ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500')
                    }
                  >
                    {r.isBinding ? t('result.binding') : t('result.slack')}
                  </span>
                </span>
                <span className="tabular-nums text-slate-700">{chf(r.value)}</span>
              </div>
              <div className="flex h-5 w-full overflow-hidden rounded bg-slate-50">
                <div className="h-full bg-teal-600" style={{ width: `${reachW}%` }} />
                {slackW > 0 && (
                  <div
                    className="relative h-full bg-slate-200"
                    style={{
                      width: `${slackW}%`,
                      backgroundImage:
                        'repeating-linear-gradient(45deg, rgba(148,163,184,0.35) 0, rgba(148,163,184,0.35) 4px, transparent 4px, transparent 8px)',
                    }}
                  >
                    {gap > 0 && (
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-slate-500">
                        +{int(gap)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-400">
        {ticks.map((tk, i) => (
          <span key={i}>{tk === 0 ? '0' : `${int(Math.round(tk / 1000))}k`}</span>
        ))}
      </div>

      {gap > 0 && (
        <T
          as="p"
          className="mt-3 border-l-2 border-teal-300 pl-3 text-sm leading-relaxed text-slate-600"
          k={binding === 'income' ? 'result.gapIncome' : 'result.gapEquity'}
          vars={{ gap: chf(gap) }}
        />
      )}
    </div>
  )
}

function PriceLadder({ rows, downPct = 20, ltvPct = 80 }) {
  const { t } = useI18n()
  const STATUS = {
    reach: { label: t('result.reach'), cls: 'bg-teal-50 text-teal-700' },
    ceiling: { label: t('result.yourCeiling'), cls: 'bg-teal-700 text-white' },
    beyond: { label: t('result.beyond'), cls: 'bg-slate-100 text-slate-400' },
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">{t('result.colPrice')}</th>
            <th className="px-3 py-2 font-semibold">{t('result.colDown', { pct: downPct })}</th>
            <th className="hidden px-3 py-2 font-semibold sm:table-cell">{t('result.colCash')}</th>
            <th className="hidden px-3 py-2 font-semibold sm:table-cell">{t('result.colMortgage', { pct: ltvPct })}</th>
            <th className="px-3 py-2 font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const s = STATUS[r.status]
            return (
              <tr
                key={r.price}
                className={r.status === 'ceiling' ? 'bg-teal-50/60 text-slate-900' : 'text-slate-700'}
              >
                <td className="px-3 py-2 font-medium tabular-nums">{chf(r.price)}</td>
                <td className="px-3 py-2 tabular-nums">{chf(r.down)}</td>
                <td className="hidden px-3 py-2 tabular-nums sm:table-cell">{chf(r.cash)}</td>
                <td className="hidden px-3 py-2 tabular-nums sm:table-cell">{chf(r.mortgage)}</td>
                <td className="px-3 py-2">
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
                    {s.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
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

/** Small pill showing the tier / source of a figure. */
function TierBadge({ labelKey }) {
  const { t } = useI18n()
  return (
    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
      {t(labelKey)}
    </span>
  )
}

/** Pass / fail pill for each sub-test. */
function TestPill({ pass, label }) {
  return (
    <div className={
      'mt-1 rounded-lg px-3 py-2 text-sm font-medium ' +
      (pass ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-800')
    }>
      {label}
    </div>
  )
}

/**
 * Forward mode: "does this specific property work for me?"
 * Runs the full spec calculation — Niederstwertprinzip, existing obligations,
 * property type adjustments — and shows a line-by-line breakdown of both tests.
 */
function PropertyChecker({ result, rate, onNavigate }) {
  const { t } = useI18n()

  // --- form state ---
  const [price, setPrice]           = useState('')
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

  return (
    <Card title={t('check.title')}>
      <p className="mb-4 text-sm leading-relaxed text-slate-600">{t('check.intro')}</p>

      {/* ── Price input ── */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">{t('check.priceLabel')}</label>
          <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
            <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
            <input
              type="text" inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9'.\s]/g, ''))}
              placeholder="1'200'000"
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
                  value={assessed}
                  onChange={(e) => setAssessed(e.target.value.replace(/[^0-9'.\s]/g, ''))}
                  placeholder="1'100'000"
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
              value={obligations}
              onChange={(e) => setObligations(e.target.value.replace(/[^0-9'.\s]/g, ''))}
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

      {/* ── Results ── */}
      {check && (
        <div className="mt-6 space-y-5">

          {/* Overall verdict — status carried by a dot + left accent, not a fill (§9) */}
          <div className={
            'rounded-xl border border-line bg-white p-4 border-l-4 ' +
            (check.qualifies ? 'border-l-positive' : 'border-l-error')
          }>
            <p className={'flex items-center gap-2 text-base font-semibold ' + (check.qualifies ? 'text-positive' : 'text-error')}>
              <span className={'inline-block h-2 w-2 rounded-full ' + (check.qualifies ? 'bg-positive' : 'bg-error')} aria-hidden />
              {check.qualifies ? t('check.qualifies') : t('check.doesNotQualify')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-body">
              {check.qualifies ? t('check.qualifiesNote') : t('check.doesNotQualifyNote')}
            </p>
            {/* Explicit gap line on failure */}
            {!check.qualifies && (dreamEquityGap > 0 || dreamIncomeGap > 0) && (
              <p className="mt-2 text-sm font-medium text-ink">
                {t('check.gapLine', {
                  equity: dreamEquityGap > 0 ? chf(roundK(dreamEquityGap)) : '—',
                  income: dreamIncomeGap > 0 ? chf(roundK(dreamIncomeGap)) : '—',
                })}
              </p>
            )}
            {/* Sub-test pills */}
            <div className="mt-3 space-y-1">
              {check.downQualifies
                ? <TestPill pass={true}  label={t('check.passDown')} />
                : <>
                    {check.downShortfall > 0   && <TestPill pass={false} label={t('check.failDown',   { amount: chf(check.downShortfall) })} />}
                    {check.liquidShortfall > 0 && <TestPill pass={false} label={t('check.failLiquid', { short: chf(check.liquidShortfall) })} />}
                  </>
              }
              {check.affordQualifies
                ? <TestPill pass={true}  label={t('check.passAfford')} />
                : <TestPill pass={false} label={t('check.failAfford', {
                    ratio:   pct(check.affordRatio, 1),
                    ceiling: pct(0.333, 1),
                  })} />
              }
            </div>
          </div>

          {/* Path + levers come before the detail (spec §6b order) */}
          {!check.qualifies && (
            <>
              <PathToGoal
                targetPrice={check.purchasePrice}
                currentMax={result.maxPrice}
                equityGap={dreamEquityGap}
                incomeGapAnnual={dreamIncomeGap}
              />
              <Levers
                lever3a={result.pillar3aLever}
                hardEquityGap={check.liquidShortfall}
                existingDebtMonthly={check.existingObligations}
                debtBlocking={!check.affordQualifies}
              />
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
              onExploreSustainable={() => onNavigate?.(2)}
              onExploreRenovations={() => onNavigate?.(3)}
              advisorContext="dream_price"
            />
          )}

        </div>
      )}
    </Card>
  )
}
