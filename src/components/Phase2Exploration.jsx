import { cantonOptions } from '../lib/cantons'
import {
  marketOverview,
  impliedSize,
  energyClassTable,
  energyDelta,
  minergieStandards,
  subsidyOverview,
} from '../lib/exploration'
import { chf, int, groupDigits } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { T } from './Trans'
import { Card, Indicative, Pill } from './ui'

const PRIORITY_VALUES = ['energy', 'solar', 'heating', 'minergie']

function Segmented({ options, value, onChange, name }) {
  return (
    <div className="inline-flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              'rounded-md border px-3 py-2 text-sm font-medium transition ' +
              (active
                ? 'border-teal-600 bg-teal-50 text-teal-800'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function Phase2Exploration({ explore, onChange }) {
  const { t } = useI18n()
  const set = (key) => (val) => onChange({ ...explore, [key]: val })
  const budget = Number(String(explore.budget).replace(/[^0-9.]/g, '')) || 0

  const cantonName = (code) => cantonOptions.find((c) => c.code === code)?.nameEn || code
  const typeInline = t(`phase2.${explore.propertyType}Inline`)

  const overview = marketOverview(explore.canton, budget, explore.propertyType)
  const size = impliedSize(explore.canton, budget, explore.propertyType)
  const table = energyClassTable(size)
  const delta = energyDelta(size, 'A', 'D')
  const minergie = minergieStandards()
  const subsidies = subsidyOverview(explore.canton)

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card title={t('phase2.refine')}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-slate-700">
              {t('phase2.budget')}
            </label>
            <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
              <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
              <input
                id="budget"
                type="text"
                inputMode="numeric"
                value={groupDigits(explore.budget)}
                onChange={(e) => set('budget')(groupDigits(e.target.value))}
                className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-right tabular-nums text-slate-900 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">{t('phase2.budgetHint')}</p>
          </div>

          <div>
            <label htmlFor="canton2" className="block text-sm font-medium text-slate-700">
              {t('phase2.cantonRegion')}
            </label>
            <select
              id="canton2"
              value={explore.canton}
              onChange={(e) => set('canton')(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              {cantonOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameEn} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">{t('phase2.propertyType')}</span>
            <div className="mt-1.5">
              <Segmented
                name={t('phase2.propertyType')}
                value={explore.propertyType}
                onChange={set('propertyType')}
                options={[
                  { value: 'apartment', label: t('phase2.apartment') },
                  { value: 'house', label: t('phase2.house') },
                ]}
              />
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700">{t('phase2.condition')}</span>
            <div className="mt-1.5">
              <Segmented
                name={t('phase2.condition')}
                value={explore.condition}
                onChange={set('condition')}
                options={[
                  { value: 'existing', label: t('phase2.existing') },
                  { value: 'new', label: t('phase2.newBuild') },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <span className="block text-sm font-medium text-slate-700">{t('phase2.matters')}</span>
          <div className="mt-1.5">
            <Segmented
              name={t('phase2.matters')}
              value={explore.sustainability}
              onChange={set('sustainability')}
              options={PRIORITY_VALUES.map((v) => ({ value: v, label: t(`sust.${v}.label`) }))}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{t(`sust.${explore.sustainability}.blurb`)}</p>
        </div>
      </Card>

      {/* Market overview */}
      <Card title={t('phase2.buys', { budget: chf(budget), canton: cantonName(explore.canton) })}>
        {overview ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MarketStat
                big={`${int(overview.sizeM2.low)}–${int(overview.sizeM2.high)} m²`}
                label={t('phase2.sizeLabel', { type: typeInline })}
              />
              <MarketStat big={`≈ ${int(overview.sizeM2.mid)} m²`} label={t('phase2.midEstimate')} />
              <MarketStat
                big={`${chf(overview.pricePerM2.low)}–${chf(overview.pricePerM2.high)}`}
                label={t('phase2.pricePerM2')}
              />
            </div>
            <Indicative>{t('phase2.marketIndicative', { source: overview.source })}</Indicative>
          </>
        ) : (
          <p className="text-sm text-slate-500">{t('phase2.enterBudget')}</p>
        )}
      </Card>

      {/* Energy class running costs */}
      <Card title={t('phase2.energyTitle')}>
        <T
          as="p"
          className="mb-3 text-sm leading-relaxed text-slate-600"
          k="phase2.energyIntro"
          vars={{ size: int(size), type: typeInline }}
          term={t('phase2.geakTerm')}
          def={t('phase2.geakDef')}
        />

        {delta && (
          <div className="mb-4 rounded-xl bg-teal-50 p-4">
            <T
              as="p"
              className="text-sm text-teal-900"
              k="phase2.aVsD"
              vars={{ a: chf(delta.better.tenYear), d: chf(delta.worse.tenYear), gap: chf(delta.tenYearSaving) }}
            />
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">{t('phase2.colClass')}</th>
                <th className="px-3 py-2 font-semibold">{t('phase2.colPerYear')}</th>
                <th className="px-3 py-2 font-semibold">{t('phase2.colTenYear')}</th>
                <th className="hidden px-3 py-2 font-semibold sm:table-cell">{t('phase2.colCo2')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.map((r) => (
                <tr key={r.label} className="text-slate-700">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2">
                      <ClassBadge label={r.label} />
                      <span className="hidden text-xs text-slate-400 md:inline">{r.description}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{chf(r.annual)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium text-slate-900">{chf(r.tenYear)}</td>
                  <td className="hidden px-3 py-2 tabular-nums sm:table-cell">{int(r.co2PerYear)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Indicative>{t('phase2.energyIndicative', { size: int(size) })}</Indicative>
      </Card>

      {/* Subsidies */}
      {subsidies && (
        <Card title={t('phase2.subsidiesTitle', { canton: cantonName(explore.canton) })} tone="teal">
          <T
            as="p"
            className="text-sm leading-relaxed text-slate-700"
            k="phase2.subsidiesIntro"
            term={t('phase2.gebTerm')}
            def={t('phase2.gebDef')}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {subsidies.cantonal.measures.map((m) => (
              <Pill key={m} tone="teal">
                {m}
              </Pill>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
            <MiniStat
              label={t('phase2.insulation')}
              value={`${chf(subsidies.federal.ranges.insulation_chf_per_m2.low)}–${chf(subsidies.federal.ranges.insulation_chf_per_m2.high)} / m²`}
            />
            <MiniStat
              label={t('phase2.heatPump')}
              value={`${chf(subsidies.federal.ranges.heat_pump_replacement_chf.low)}–${chf(subsidies.federal.ranges.heat_pump_replacement_chf.high)}`}
            />
            <MiniStat
              label={t('phase2.solarThermal')}
              value={`${chf(subsidies.federal.ranges.solar_thermal_chf.low)}–${chf(subsidies.federal.ranges.solar_thermal_chf.high)}`}
            />
          </div>
          {subsidies.cantonal.notes && <p className="mt-3 text-sm text-slate-600">{subsidies.cantonal.notes}</p>}
          <a
            href={subsidies.cantonal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900"
          >
            {t('phase2.openProgramme')}
          </a>
        </Card>
      )}

      {/* Minergie explainer */}
      <Card title={t('phase2.minergieTitle')}>
        <T
          as="p"
          className="mb-3 text-sm leading-relaxed text-slate-600"
          k="phase2.minergieIntro"
          term={t('phase2.minergieTerm')}
          def={t('phase2.minergieDef')}
        />
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">{t('phase2.colStandard')}</th>
                <th className="px-3 py-2 font-semibold">{t('phase2.colBuildPremium')}</th>
                <th className="px-3 py-2 font-semibold">{t('phase2.colEnergySaving')}</th>
                <th className="hidden px-3 py-2 font-semibold sm:table-cell">{t('phase2.colResale')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {minergie.map((m) => (
                <tr key={m.label} className="text-slate-700">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {m.label}
                    <span className="hidden text-xs font-normal text-slate-400 md:inline"> — {m.description}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">+{m.buildPremiumPct}%</td>
                  <td className="px-3 py-2 tabular-nums text-teal-700">−{m.energySavingPct}%</td>
                  <td className="hidden px-3 py-2 tabular-nums sm:table-cell">+{m.resalePremiumPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Indicative>{t('phase2.minergieIndicative')}</Indicative>
      </Card>
    </div>
  )
}

function MarketStat({ big, label }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xl font-bold tracking-tight text-slate-900">{big}</p>
      <p className="mt-1 text-xs leading-snug text-slate-500">{label}</p>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-teal-100 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}

const BADGE_COLORS = {
  A: 'bg-emerald-600',
  B: 'bg-green-600',
  C: 'bg-lime-600',
  D: 'bg-yellow-500',
  E: 'bg-amber-500',
  F: 'bg-orange-500',
  G: 'bg-red-600',
}

function ClassBadge({ label }) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${BADGE_COLORS[label] || 'bg-slate-500'}`}>
      {label}
    </span>
  )
}
