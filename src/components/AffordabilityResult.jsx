import { useState } from 'react'
import { chf, int, pct } from '../lib/format'
import { buildPriceLadder, requirementsForPrice } from '../lib/affordability'
import { getCanton, eigenmietwert } from '../lib/cantons'
import { useI18n } from '../i18n/I18nContext'
import { T } from './Trans'

const roundK = (v) => Math.round(v / 1000) * 1000

// Illustrative current market rate, vs. the bank's notional 5% stress rate.
const ILLUSTRATIVE_RATE = 0.015

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
    default: 'border-slate-200 bg-white',
    teal: 'border-teal-200 bg-teal-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
  }
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      )}
      {children}
    </section>
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

export default function AffordabilityResult({ result, renovation }) {
  const { t } = useI18n()
  const canton = getCanton(result.inputs.canton)
  const { downPaymentBreakdown: dp, annualCosts: ac, constraints } = result
  const cashPctOfPrice = result.maxPrice > 0 ? dp.fromSavings / result.maxPrice : 0
  const eigenRate = canton ? canton.tax.eigenmietwert_rate_pct_of_market_rent : 60

  return (
    <div className="space-y-4">
      {/* Headline */}
      {result.viable ? (
        <Card tone="teal">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-teal-800">{t('result.headlineLabel')}</p>
            <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-semibold text-white">
              ● {t('result.viable')}
            </span>
          </div>
          <p className="mt-1 text-4xl font-bold tracking-tight text-teal-900 tabular-nums">
            {chf(result.maxPrice)}
          </p>
          {result.bindingConstraint === 'income' ? (
            <T
              as="p"
              className="mt-2 text-sm leading-relaxed text-teal-900/80"
              k="result.heldByIncome"
              term={t('terms.housingCosts')}
              def={t('terms.housingCostsDef')}
            />
          ) : (
            <T
              as="p"
              className="mt-2 text-sm leading-relaxed text-teal-900/80"
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
      <Card title={t('result.ceilingsTitle')}>
        <T as="p" className="mb-4 text-sm leading-relaxed text-slate-600" k="result.ceilingsIntro" />
        <CeilingChart
          equity={constraints.equityMaxPrice}
          income={constraints.affordabilityMaxPrice}
          maxPrice={result.maxPrice}
          binding={result.bindingConstraint}
        />
      </Card>

      {/* Down payment breakdown */}
      <Card title={t('result.stakeTitle')}>
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
      </Card>

      {/* Affordability / annual cost breakdown */}
      <Card title={t('result.carryTitle')}>
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
              notionalPct: pct(result.rules.notionalRatePct / 100),
              notional: chf(ac.interest),
              realPct: pct(ILLUSTRATIVE_RATE, 1),
              real: chf(dp.mortgage * ILLUSTRATIVE_RATE),
              realMo: chf(Math.round((dp.mortgage * ILLUSTRATIVE_RATE) / 12)),
            }}
          />
        )}
      </Card>

      {/* Price ladder */}
      {result.maxPrice > 0 && (
        <Card title={t('result.ladderTitle')}>
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
        </Card>
      )}

      {/* Reverse calculator — aim for a dream price */}
      <TargetPriceCalculator result={result} />

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

      {/* Eigenmietwert overview */}
      <Card title={t('result.taxTitle')}>
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
      </Card>
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

/**
 * Reverse calculator: enter a target ("dream") price and see the income and
 * equity it would take at the chosen down %, vs. what the buyer has today.
 */
function TargetPriceCalculator({ result }) {
  const { t } = useI18n()
  const [target, setTarget] = useState('')
  const targetNum = Number(String(target).replace(/[^0-9]/g, '')) || 0
  const req = targetNum ? requirementsForPrice(targetNum, result.rules.downPct / 100) : null

  let income, equity, cash, achievable
  if (req) {
    const haveEquity = result.inputs.savings + Math.min(result.inputs.pillar2, req.maxPillar2)
    income = Math.max(0, req.incomeNeeded - result.inputs.grossIncome)
    equity = Math.max(0, req.downPayment - haveEquity)
    cash = Math.max(0, req.minCash - result.inputs.savings)
    achievable = income === 0 && equity === 0 && cash === 0
  }

  const gapChip = (gap) =>
    gap > 0 ? `+${chf(gap)}` : t('result.targetCovered')

  return (
    <Card title={t('result.targetTitle')}>
      <p className="mb-3 text-sm leading-relaxed text-slate-600">
        {t('result.targetIntro', { pct: result.rules.downPct })}
      </p>
      <div className="flex w-full max-w-xs items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
        <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
        <input
          type="text"
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/[^0-9'.\s]/g, ''))}
          placeholder="2'400'000"
          className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-right tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
        />
      </div>

      {req && (
        <div className="mt-4">
          <Row label={t('result.targetIncomeNeeded')} value={chf(req.incomeNeeded)} sub={gapChip(income)} />
          <Row label={t('result.targetEquityNeeded')} value={chf(req.downPayment)} sub={gapChip(equity)} />
          <Row label={t('result.targetCashMin')} value={chf(req.minCash)} sub={gapChip(cash)} />
          <Row label={t('result.mortgage')} value={chf(req.mortgage)} sub={t('result.ltv', { pct: pct(req.ltv) })} />
          <div
            className={
              'mt-3 rounded-lg p-3 text-sm leading-relaxed ' +
              (achievable ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-900')
            }
          >
            {achievable ? t('result.targetAchievable') : t('result.targetGapNote')}
          </div>
        </div>
      )}
    </Card>
  )
}
