import { useMemo, useState } from 'react'
import { money, int } from '../../lib/format'
import { compareBuilds, getWall, HORIZONS, PRICE_PATHS, TODAY_MONEY_PCT, resilienceData } from '../../markets/us/resilience/model'
import { getState, stateOptions } from '../../markets/us/affordability'
import { ut } from '../../markets/us/copy'
import { Indicative, InfoTip, SELECT_CHEVRON } from '../ui'
import { track } from '../../lib/track'

/**
 * "Compare how to build" — the resilient-build explorer (US), one step of the
 * How to Build for Climate Change tab (App renders the heading and step nav). UI only: every figure comes from
 * src/markets/us/resilience/model.js. State is owned by App (`build`) so the
 * hash can carry it; this component renders and edits it.
 */

const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0
const PATH_IDS = ['ref', 'high', 'low', 'crisis']

/** Label for a named price path: its yearly rise, or the shock for the crisis stress test. */
const pathLabel = (p) =>
  p.shock
    ? `${p.label} · ${ut('build.pathShock', { m: p.shock.multiplier, years: p.shock.ramp_years, pct: p.escalation_pct })}`
    : `${p.label} · ${p.escalation_pct}%`
const SEL = 'appearance-none rounded-lg border border-line bg-white py-2 pl-3 pr-10 text-sm text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100'
const INPUT = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink tabular-nums focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100'

function Pills({ options, value, onChange, label, name }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            name={name}
            onClick={() => onChange(o.value)}
            className="ds-choice rounded-full px-3 py-1.5 text-sm"
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Line({ label, value, strong, sub }) {
  return (
    <div className={'flex items-baseline justify-between gap-3 py-1 text-sm ' + (strong ? 'border-t border-line pt-2 font-semibold text-ink' : 'text-body')}>
      <span>
        {label}
        {sub && <span className="block text-xs font-normal text-muted">{sub}</span>}
      </span>
      <span className="ds-figure shrink-0 tabular-nums text-ink">{value}</span>
    </div>
  )
}

function WallCard({ wall, premium, pickable, onPick, idPrefix }) {
  const [open, setOpen] = useState(false)
  const flags = [
    wall.minergie_p_as_drawn ? ut('build.wall.minergie') : ut('build.wall.minergieNo'),
    wall.retrofit_capable && ut('build.wall.retrofitOk'),
    wall.noncombustible && ut('build.wall.noncombustible'),
    wall.vapour_open && ut('build.wall.vapourOpen'),
  ].filter(Boolean)
  return (
    <div className="mt-3 rounded-lg bg-surface p-3">
      {pickable ? (
        <label className="block">
          <span className="ds-eyebrow text-[10px] text-muted">{ut('build.wall.pick')}</span>
          <select id={`${idPrefix}-wall`} value={wall.id} onChange={(e) => onPick(e.target.value)} className={'mt-1 w-full ' + SEL} style={SELECT_CHEVRON}>
            {pickable.map((id) => (
              <option key={id} value={id}>{getWall(id).label}</option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-sm font-semibold text-ink">{wall.label}</p>
      )}
      {wall.swiss_equivalent && (
        <p className="mt-1 text-xs text-muted">{ut('build.wall.swiss')}: {wall.swiss_equivalent}</p>
      )}
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div><dt className="text-muted">{ut('build.wall.thickness')}</dt><dd className="tabular-nums text-ink">{ut('build.wall.inches', { low: wall.thickness_in.low, high: wall.thickness_in.high })}</dd></div>
        <div><dt className="text-muted">{ut('build.wall.r')}</dt><dd className="tabular-nums text-ink">{ut('build.wall.rband', { low: wall.r_whole_wall.low, high: wall.r_whole_wall.high })}</dd></div>
        <div><dt className="text-muted">{ut('build.wall.ach')}</dt><dd className="tabular-nums text-ink">{ut('build.wall.ach50', { low: wall.ach50_typical.low, high: wall.ach50_typical.high })}</dd></div>
      </dl>
      {wall.added_cost_per_sqft_wall_usd && wall.added_cost_per_sqft_wall_usd.high > 0 && (
        <p className="mt-2 text-xs text-body">
          {ut('build.wall.addedCost')}: {ut('build.wall.perSqftWall', { low: wall.added_cost_per_sqft_wall_usd.low, high: wall.added_cost_per_sqft_wall_usd.high })}
          {premium && premium.wallPctOfHouse != null && <span className="text-muted"> · {ut('build.col.ofHouse', { pct: premium.wallPctOfHouse })}</span>}
        </p>
      )}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {flags.map((f) => (
          <li key={f} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-body">{f}</li>
        ))}
      </ul>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 text-xs font-medium text-teal-800 hover:underline">
        {open ? '▾ ' : '▸ '}{ut('build.wall.layers')}
      </button>
      {open && (
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-body">
          {wall.layers.map((l, i) => <li key={i}>{l}</li>)}
        </ol>
      )}
      {open && wall.note && <p className="mt-2 text-xs leading-relaxed text-muted">{wall.note}</p>}
      {open && wall.sources.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          {ut('build.wall.sources')}:{' '}
          {wall.sources.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer" className="underline">[{i + 1}]</a>
          )).reduce((acc, el, i) => (i === 0 ? [el] : [...acc, ' ', el]), [])}
        </p>
      )}
      {premium && !premium.pctInBand && (
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] leading-relaxed text-amber-900">
          {ut('build.wall.bandMiss', { factor: premium.geometry.wallAreaFactor })}
        </p>
      )}
    </div>
  )
}

function Column({ c, horizon, onPickWall }) {
  const swiss = c.id === 'D'
  return (
    <section className={'ds-card flex min-w-0 flex-col ' + (swiss ? 'border-teal-700 ring-2 ring-teal-100' : '')}>
      <p className="ds-eyebrow text-xs text-muted">{c.id}</p>
      <h2 className="mt-1 text-base font-bold text-ink">{c.label}</h2>
      <p className="text-xs text-muted">{c.sub}</p>
      <WallCard wall={c.wall} premium={c.premium} pickable={c.wallOptions} onPick={onPickWall} idPrefix={`build-${c.id}`} />
      <div className="mt-3 flex-1">
        <Line label={ut('build.col.sqft')} value={`${int(c.sqft)} sq ft`} />
        {c.newBuild ? (
          <Line label={ut('build.col.upfront')} value={`${money(c.upfront.low)}–${money(c.upfront.high)}`} />
        ) : c.id === 'A' ? (
          <p className="py-1 text-xs text-muted">{ut('build.col.noBuild')}</p>
        ) : (
          <Line label={ut('build.col.upfront')} value={`${money(c.upfront.low)}–${money(c.upfront.high)}`} />
        )}
        {c.premium.total.mid > 0 && (
          <Line label={ut('build.col.premium')} value={money(c.premium.total.mid)} sub={ut('build.col.ofHouse', { pct: c.premium.pctOfHouse })} />
        )}
        <Line label={ut('build.col.energyNow')} value={money(c.energy.annualNow)} />
        <Line label={ut('build.col.energyCum', { n: horizon })} value={money(c.energy.cumulative)} />
        <Line label={ut('build.col.maintenance', { n: horizon })} value={money(c.maintenance)} />
        <Line label={ut('build.col.tco', { n: horizon })} value={money(c.tco.mid)} sub={ut('build.col.tcoHint', { n: horizon })} strong />
        {c.resalePremiumPct && (
          <p className="mt-2 text-xs text-muted">{ut('build.col.resale', { low: c.resalePremiumPct.low, high: c.resalePremiumPct.high })}</p>
        )}
      </div>
    </section>
  )
}

/** Break-even sentence for one pair (see model.breakEven). */
function breakEvenLine(be, horizon) {
  if (!be) return null
  if (be.verdict === 'at') return ut('build.payback.at', { n: horizon, pct: be.pct, amount: money(be.premium), saving: money(be.annualSaving) })
  return ut(`build.payback.${be.verdict}`, { n: horizon })
}

const RATING_TONE = {
  good: 'bg-teal-50 text-teal-800',
  low: 'bg-teal-50 text-teal-800',
  neutral: 'bg-slate-100 text-slate-700',
  moderate: 'bg-slate-100 text-slate-700',
  poor: 'bg-amber-50 text-amber-800',
  higher: 'bg-amber-50 text-amber-800',
}

function Chip({ tone, children }) {
  return <span className={'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ' + (RATING_TONE[tone] || RATING_TONE.neutral)}>{children}</span>
}

/** Beyond energy: hazards, fire, moisture and insurance for each house, side by side. */
function BeyondEnergy({ result, horizon, stateName }) {
  const b = result.beyond
  if (!b) return null
  const cols = result.columns
  const cell = (fn) => cols.map((c) => <td key={c.id} className="py-2 pl-3 align-top">{fn(b.byId[c.id], c)}</td>)
  const ratingRow = (key) => (
    <tr key={key} className="border-b border-line">
      <th scope="row" className="py-2 pr-3 text-left font-normal text-body">{ut(`build.beyond.${key}`)}</th>
      {cell((x) => <Chip tone={x.hazards[key]}>{ut(`build.beyond.rating.${x.hazards[key]}`)}</Chip>)}
    </tr>
  )
  const fig = (v, strong) => <span className={'ds-figure tabular-nums text-ink' + (strong ? ' font-semibold' : '')}>{v}</span>
  const row = (label, fn, strong) => (
    <tr key={label} className="border-b border-line">
      <th scope="row" className={'py-2 pr-3 text-left ' + (strong ? 'font-semibold text-ink' : 'font-normal text-body')}>{label}</th>
      {cell(fn)}
    </tr>
  )
  const sources = [...new Set([...resilienceData.beyond_energy.hazard_sources, ...resilienceData.beyond_energy.moisture_rule.sources, ...resilienceData.beyond_energy.insurance_sources])]
  return (
    <section className="ds-card mt-[var(--space-stack)]" aria-labelledby="beyond-title">
      <h2 id="beyond-title" className="ds-section-title">{ut('build.beyond.title')}</h2>
      <p className="mt-1 max-w-3xl text-sm text-body">{ut('build.beyond.intro')}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 pr-3 font-medium">{ut('build.beyond.colFactor', { n: horizon })}</th>
              {cols.map((c) => <th key={c.id} className="py-2 pl-3 font-medium">{c.id} · {c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {row(ut('build.col.sqft'), (x, c) => fig(`${int(c.sqft)} sq ft`))}
            {row(ut('build.col.upfront'), (x, c) => fig(c.upfront.mid > 0 ? money(c.upfront.mid) : '—'))}
            {row(ut('build.beyond.energy'), (x, c) => fig(money(c.energy.cumulative)))}
            {row(ut('build.col.maintenance', { n: horizon }), (x, c) => fig(money(c.maintenance)))}
            {row(ut('build.col.tco', { n: horizon }), (x, c) => fig(money(c.tco.mid), true))}
            {row(ut('build.beyond.insurance'), (x) => (
              <>
                {fig(money(x.insurance))}
                <span className="block text-xs text-muted">{ut('build.beyond.insuranceSub', { amount: money(x.insuranceAnnual), state: stateName, pct: b.insuranceRatePct })}</span>
              </>
            ))}
            {row(ut('build.beyond.total'), (x) => fig(money(x.totalWithInsurance), true), true)}
            <tr><th colSpan={cols.length + 1} scope="colgroup" className="pb-1 pt-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">{ut('build.beyond.ratings')}</th></tr>
            {['hurricane', 'wildfire', 'hail', 'flood'].map(ratingRow)}
            {row(ut('build.beyond.fire'), (x) => <Chip tone={x.fire}>{ut(`build.beyond.fireVal.${x.fire}`)}</Chip>)}
            {row(ut('build.beyond.moisture'), (x) => <Chip tone={x.moisture}>{ut(`build.beyond.moistureVal.${x.moisture}`)}</Chip>)}
            {row(ut('build.beyond.discount'), (x) => <Chip tone={x.mayQualifyDiscount ? 'good' : 'neutral'}>{ut(`build.beyond.discountVal.${x.mayQualifyDiscount ? 'yes' : 'no'}`)}</Chip>)}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-body">{ut('build.beyond.energyOnly')}</p>
      <Indicative>{ut('build.beyond.note')}</Indicative>
      <p className="mt-2 text-xs text-muted">
        {ut('build.beyond.sources')}:{' '}
        {sources.map((u, i) => (
          <span key={u}>
            {i > 0 && ' · '}
            <a href={u} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">{new URL(u).hostname.replace(/^www\./, '')}</a>
          </span>
        ))}
      </p>
    </section>
  )
}

/** "Does the extra cost pay back on energy alone?" — break-even plus the three price paths. */
function Payback({ payback, horizon, todayMoney, discountPct }) {
  if (!payback || !payback.bToD) return null
  const bd = payback.bToD
  const rows = bd.paths || []
  const premium = rows.length ? rows[0].premium : bd.breakEven?.premium
  return (
    <section className="ds-card mt-[var(--space-stack)]">
      <h2 className="ds-section-title">{ut('build.payback.title')}</h2>
      <p className="mt-1 text-sm text-body">{ut('build.payback.intro', { n: horizon })}</p>
      <p className="mt-1 text-sm font-medium text-ink">
        {todayMoney ? ut('build.payback.inTodayMoney', { pct: discountPct }) : ut('build.payback.inPlainDollars')}
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="font-semibold text-ink">{ut('build.payback.pairBD')}</dt>
          <dd className="text-body">{breakEvenLine(bd.breakEven, horizon)}</dd>
        </div>
        {payback.aToC && (
          <div>
            <dt className="font-semibold text-ink">{ut('build.payback.pairAC')}</dt>
            <dd className="text-body">{breakEvenLine(payback.aToC.breakEven, horizon)}</dd>
          </div>
        )}
      </dl>
      {rows.length > 0 && premium > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">{ut('build.payback.tableTitle')}</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">{ut('build.payback.colPath')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{ut('build.payback.colRise')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{ut('build.payback.colCheaper')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{ut('build.payback.colBetter')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{ut('build.payback.colSaved')}</th>
                  <th className="py-2 text-right font-medium">{ut('build.payback.colCovers', { amount: money(premium) })}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-b-0">
                    <td className="py-2 pr-3 text-ink">{r.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.shock ? ut('build.pathShock', { m: r.shock.multiplier, years: r.shock.ramp_years, pct: r.escalationPct }) : `${r.escalationPct}%`}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(r.cheaperEnergy)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(r.betterEnergy)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">{money(r.saved)}</td>
                    <td className={'py-2 text-right font-semibold ' + (r.paysBack ? 'text-teal-700' : 'text-muted')}>
                      {r.paysBack ? ut('build.payback.yes') : ut('build.payback.no')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.some((r) => r.shock) && <p className="mt-2 text-xs text-muted">{ut('build.payback.crisisNote')}</p>}
        </details>
      )}
      <p className="mt-3 text-xs text-muted">{ut('build.payback.note')}</p>
    </section>
  )
}

export default function ResilienceExplore({ build, onChange, region, onRegionChange, shareUrl, onPlanBuild }) {
  const [copied, setCopied] = useState(false)
  const set = (patch) => onChange({ ...build, ...patch })
  const st = region ? getState(region) : null
  const pricePath = PATH_IDS.includes(build.path) ? build.path : num(build.path)
  const customOn = !PATH_IDS.includes(build.path)
  const result = useMemo(
    () =>
      region
        ? compareBuilds({
            stateCode: region,
            mode: build.mode === 'budget' ? 'budget' : 'size',
            sqft: num(build.sqft),
            budget: num(build.budget),
            storeys: Number(build.storeys) === 1 ? 1 : 2,
            horizon: Number(build.horizon) || 30,
            pricePath,
            wallD: build.wallD || undefined,
            retrofit: build.retrofit === '1',
            todayMoney: build.todayMoney === '1',
          })
        : null,
    [region, build.mode, build.sqft, build.budget, build.storeys, build.horizon, pricePath, build.wallD, build.retrofit, build.todayMoney],
  )
  const horizon = result ? result.horizon : Number(build.horizon) || 30
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      track('build_link_copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable: the URL is already in the address bar */
    }
  }

  return (
    <div>
      <div>

        {/* The answer first: what the better house costs and saves */}
        {result && (
          <>
        {/* Headline: code box vs Swiss-grade */}
        {result.bVsD && (
          <section className="ds-callout mb-[var(--space-stack)]">
            <p className="ds-eyebrow text-xs text-teal-700">{ut('build.summary.title')}</p>
            <p className="mt-2 text-base leading-relaxed text-ink">
              {result.mode === 'budget'
                ? ut('build.summary.budgetLead', { sqft: int(Math.abs(result.bVsD.sqftDelta)), amount: money(result.bVsD.energySaved), n: horizon })
                : `${ut('build.summary.premium', { amount: money(result.bVsD.premium) })} ${ut('build.summary.energy', { amount: money(result.bVsD.energySaved), n: horizon })}.`}{' '}
              {result.bVsD.tcoDelta <= 0
                ? ut('build.summary.tcoLess', { n: horizon, amount: money(-result.bVsD.tcoDelta) })
                : ut('build.summary.tcoMore', { n: horizon, amount: money(result.bVsD.tcoDelta) })}
            </p>
            {result.energyGapAtoD != null && (
              <p className="mt-1 text-sm text-body">{ut('build.summary.gap', { amount: money(result.energyGapAtoD), n: horizon })}</p>
            )}
            {onPlanBuild && (
              <button type="button" onClick={onPlanBuild} className="mt-3 rounded-full bg-teal-700 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800">
                {ut('buildPath.planThis')}
              </button>
            )}
          </section>
        )}

          </>
        )}

        {/* Inputs */}
        <div className="ds-card grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="text-sm text-body">{ut('build.state')}</span>
            <select id="build-state" value={region || ''} onChange={(e) => onRegionChange(e.target.value)} className={'mt-1 w-full ' + SEL} style={SELECT_CHEVRON}>
              <option value="">{ut('onboarding.statePlaceholder')}</option>
              {stateOptions.map((s) => (
                <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
              ))}
            </select>
          </label>
          <div>
            <span className="flex items-center gap-1.5 text-sm text-body">{ut('build.mode.size')} / {ut('build.mode.budget')}<InfoTip label={ut('build.mode.size')}>{ut(`build.modeHint.${build.mode === 'budget' ? 'budget' : 'size'}`)}</InfoTip></span>
            <div className="mt-1">
              <Pills name="build-mode" label="Mode" value={build.mode === 'budget' ? 'budget' : 'size'} onChange={(v) => set({ mode: v })} options={[{ value: 'size', label: ut('build.mode.size') }, { value: 'budget', label: ut('build.mode.budget') }]} />
            </div>
          </div>
          {build.mode === 'budget' ? (
            <label className="block">
              <span className="text-sm text-body">{ut('build.budget')}</span>
              <input id="build-budget" inputMode="numeric" value={build.budget} onChange={(e) => set({ budget: e.target.value })} className={'mt-1 ' + INPUT} placeholder="500,000" />
            </label>
          ) : (
            <label className="block">
              <span className="text-sm text-body">{ut('build.sqft')}</span>
              <input id="build-sqft" inputMode="numeric" value={build.sqft} onChange={(e) => set({ sqft: e.target.value })} className={'mt-1 ' + INPUT} placeholder="2,000" />
            </label>
          )}
          <div>
            <span className="text-sm text-body">{ut('build.storeys')}</span>
            <div className="mt-1">
              <Pills name="build-storeys" label={ut('build.storeys')} value={Number(build.storeys) === 1 ? '1' : '2'} onChange={(v) => set({ storeys: v })} options={[{ value: '1', label: ut('build.storeyOpt.1') }, { value: '2', label: ut('build.storeyOpt.2') }]} />
            </div>
          </div>
          <div>
            <span className="text-sm text-body">{ut('build.horizon')}</span>
            <div className="mt-1">
              <Pills name="build-horizon" label={ut('build.horizon')} value={String(horizon)} onChange={(v) => set({ horizon: v })} options={HORIZONS.map((h) => ({ value: String(h), label: ut('build.years', { n: h }) }))} />
            </div>
          </div>
          <div className="md:col-span-2">
            <span className="text-sm text-body">{ut('build.path')}</span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Pills
                name="build-path"
                label={ut('build.path')}
                value={customOn ? 'custom' : build.path}
                onChange={(v) => set({ path: v === 'custom' ? '3' : v })}
                options={[...PATH_IDS.map((p) => ({ value: p, label: pathLabel(PRICE_PATHS[p]) })), { value: 'custom', label: ut('build.pathCustom') }]}
              />
              {customOn && (
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input id="build-escalation" type="range" min="-2" max="8" step="0.5" value={num(build.path)} onChange={(e) => set({ path: e.target.value })} aria-label={ut('build.pathCustom')} />
                  {ut('build.pathCustomHint', { pct: num(build.path) })}
                </label>
              )}
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-body md:col-span-2">
            <input id="build-retrofit" type="checkbox" checked={build.retrofit === '1'} onChange={(e) => set({ retrofit: e.target.checked ? '1' : '' })} className="mt-0.5 h-4 w-4" style={{ accentColor: 'var(--color-primary)' }} />
            <span className="inline-flex items-center gap-1.5">{ut('build.retrofit')}<InfoTip label={ut('build.retrofit')}>{ut('build.retrofitHint')}</InfoTip></span>
          </label>
          <label className="flex items-start gap-2 text-sm text-body md:col-span-2">
            <input id="build-today-money" type="checkbox" checked={build.todayMoney === '1'} onChange={(e) => set({ todayMoney: e.target.checked ? '1' : '' })} className="mt-0.5 h-4 w-4" style={{ accentColor: 'var(--color-primary)' }} />
            <span className="inline-flex items-center gap-1.5">{ut('build.todayMoney', { pct: TODAY_MONEY_PCT })}<InfoTip label={ut('build.todayMoney', { pct: TODAY_MONEY_PCT })}>{ut('build.todayMoneyHint', { pct: TODAY_MONEY_PCT })}</InfoTip></span>
          </label>
        </div>

        {!st && <p className="mt-[var(--space-stack)] text-sm text-muted">{ut('build.pickState')}</p>}

        {result && (
          <>
            <BeyondEnergy result={result} horizon={horizon} stateName={st?.name || region} />
            <Payback payback={result.payback} horizon={horizon} todayMoney={result.todayMoney} discountPct={result.discountPct} />

            {/* Per-house detail (wall layers, R-values, cost lines), closed by default */}
            <details className="ds-card mt-[var(--space-stack)]">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{ut('build.details')}</summary>
              <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {result.columns.map((c) => (
                  <Column key={c.id} c={c} horizon={horizon} onPickWall={(id) => set({ wallD: id })} />
                ))}
              </div>
            </details>

            <Indicative>{ut('build.indicative')} {resilienceData.meta.last_updated}.</Indicative>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={copy} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-slate-400">
                {copied ? '✓ ' + ut('build.shared') : ut('build.share')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
