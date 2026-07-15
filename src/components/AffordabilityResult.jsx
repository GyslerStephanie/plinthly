import { useState } from 'react'
import { chf, int, pct } from '../lib/format'
import { track } from '../lib/track'
import {
  buildPriceLadder,
  monthlyCostsAtRate,
  affordabilityState,
  DEFAULT_MARKET_RATE,
} from '../lib/affordability'
import { getCanton, eigenmietwert } from '../lib/cantons'
import { useI18n } from '../i18n/I18nContext'
import { T, renderRich } from './Trans'
import Collapsible from './Collapsible'
import MortgagePayoffPanel from './MortgagePayoffPanel'
import PathToGoal from './PathToGoal'
import Levers from './Levers'
import NextSteps from './NextSteps'
import CompareCta from './CompareCta'

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

/**
 * Stake-card row on the consolidated 4-role type system: a `t-body` label, a
 * `t-figure` value, and a `t-caption` sub. Totals vs. components are told apart
 * by COLOUR only (text-ink vs text-muted) — no extra font sizes or weights.
 */
function StakeRow({ label, value, sub, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={'t-body ' + (strong ? 'text-ink' : 'text-muted')}>
        {label}
        {sub && <span className="t-caption ml-1.5 text-faint">{sub}</span>}
      </span>
      <span className={'t-figure ' + (strong ? 'text-ink' : 'text-body')}>{value}</span>
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

export default function AffordabilityResult({ result, renovation, isPreview = false, onNavigate, onCompare }) {
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
          <p className="ds-figure mt-1 text-4xl font-medium text-ink">
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

      {/* Save-as-PDF + edit/return affordances. Hidden from the printout itself. */}
      <div className="flex items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={() => {
            track('result_shared', { method: 'pdf' })
            window.print()
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink px-3.5 py-1.5 text-sm font-semibold text-ink transition hover:bg-surface"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
          </svg>
          {t('result.savePdf')}
        </button>
        <button
          type="button"
          onClick={editNumbers}
          className="text-sm font-medium text-body underline-offset-2 transition hover:text-ink hover:underline"
        >
          {t('result.editNumbers')}
        </button>
      </div>

      {/* Key takeaways — TL;DR summary of the detail cards below */}
      <KeyTakeaways result={result} rate={rate} />

      {/* Doubt-moment hook → Compare surface (rent vs buy, invest, …) */}
      {onCompare && <CompareCta onCompare={onCompare} />}

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
        <StakeRow label={t('result.purchasePrice')} value={chf(result.maxPrice)} strong />
        <div className="my-3">
          <Bar
            segments={[
              { label: t('result.cashSavings'), value: dp.fromSavings, color: 'bg-teal-600' },
              { label: t('result.pillarPension'), value: dp.fromPillar2, color: 'bg-teal-300' },
              { label: t('result.mortgage'), value: dp.mortgage, color: 'bg-slate-300' },
            ]}
          />
          <div className="t-caption mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted">
            <Legend color="bg-teal-600" label={t('result.cashSavings')} />
            <Legend color="bg-teal-300" label={t('result.pillarPension')} />
            <Legend color="bg-slate-300" label={t('result.mortgageDebt')} />
          </div>
        </div>
        <StakeRow
          label={t('result.cashSavings')}
          value={chf(dp.fromSavings)}
          sub={t('result.ofPrice', { pct: pct(cashPctOfPrice) })}
        />
        <StakeRow
          label={t('result.pillarPension')}
          value={chf(dp.fromPillar2)}
          sub={dp.fromPillar2 > 0 ? t('result.pillarSub') : undefined}
        />
        <div className="my-1 border-t border-slate-100" />
        <StakeRow
          label={t('result.downPayment')}
          value={chf(dp.total)}
          sub={t('result.ofPrice', { pct: pct(result.rules.downPct / 100) })}
          strong
        />
        <StakeRow
          label={t('result.mortgage')}
          value={chf(dp.mortgage)}
          sub={t('result.ltv', { pct: pct(dp.ltv) })}
        />
        <p className="t-caption mt-3 text-faint">
          {t('result.stakeNote', {
            liquid: pct(result.rules.minLiquidPct / 100),
            pillar: pct(result.rules.maxPillar2Pct / 100),
          })}
        </p>
        {result.inputs.pillar2 > dp.fromPillar2 + 1 && (
          <T
            as="div"
            className="t-caption mt-3 rounded-lg bg-amber-50 p-3 text-amber-900"
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

      {/* Mortgage over time — payoff timeline, interest, retirement re-test */}
      {result.maxPrice > 0 && (
        <MortgagePayoffPanel
          price={result.maxPrice}
          mortgage={dp.mortgage}
          income={result.inputs.grossIncome}
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
            onExploreSustainable={() => onNavigate?.(3)}
            onExploreRenovations={() => onNavigate?.(4)}
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
      {/* Marker is scoped to the bars region (this relative wrapper) so the
          dashed line never bleeds across the axis labels or the caption. */}
      <div className="relative pt-5">
        {maxPrice > 0 && (
          <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${markerLeft}%` }}>
            <div className="absolute -top-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
              {chf(maxPrice)}
            </div>
            <div className="h-full w-px border-l border-dashed border-slate-400" />
          </div>
        )}

        <div className="space-y-3">
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
