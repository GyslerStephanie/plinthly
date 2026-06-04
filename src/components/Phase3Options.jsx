import { optionRenovate, optionNewBuild, optionBuild } from '../lib/options'
import { impliedSize, energyClassTable } from '../lib/exploration'
import { selectedMeasures, computeLedger } from '../lib/retrofit'
import { getCanton } from '../lib/cantons'
import { chf, int } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { T } from './Trans'
import { Card, Row, Indicative, Pill } from './ui'
import InfoTerm from './InfoTerm'
import RetrofitConfigurator from './RetrofitConfigurator'

function OptionShell({ tag, title, subtitle, chosen, onChoose, t, children }) {
  return (
    <section
      className={
        'rounded-xl border p-5 shadow-sm transition ' +
        (chosen ? 'border-teal-500 ring-2 ring-teal-200 bg-teal-50/40' : 'border-slate-200 bg-white')
      }
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Pill tone={chosen ? 'teal' : 'slate'}>{tag}</Pill>
            {chosen && <Pill tone="teal">{t('phase3.yourPick')}</Pill>}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onChoose}
          className={
            'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ' +
            (chosen
              ? 'bg-teal-700 text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:border-teal-400 hover:text-teal-700')
          }
        >
          {chosen ? t('phase3.selected') : t('phase3.choose')}
        </button>
      </div>
      {children}
    </section>
  )
}

export default function Phase3Options({ explore, onChange }) {
  const { t } = useI18n()
  const budget = Number(String(explore.budget).replace(/[^0-9.]/g, '')) || 0
  const size = impliedSize(explore.canton, budget, explore.propertyType)
  const canton = getCanton(explore.canton)

  const reno = optionRenovate(explore.canton, size, explore.propertyType)
  const neu = optionNewBuild(explore.canton, budget, size)
  const build = optionBuild(explore.canton, size)

  const choose = (key) => () => onChange({ ...explore, chosenOption: key })

  // Side-by-side comparison — the same budget/canton/size flows into all three,
  // including the user's modelled renovation, so it reads as one comparison.
  const energy = energyClassTable(size)
  const tenYearFor = (cls) => energy.find((e) => e.label === cls)?.tenYear || 0
  const ledger = computeLedger(size, budget, selectedMeasures(explore.measures))
  const cmpRows = [
    {
      key: 'renovate',
      label: t('phase3.cmpRenovate'),
      getIn: budget + ledger.netCost,
      cls: ledger.newClass,
      heat: tenYearFor(ledger.newClass),
      tradeoff: t('phase3.cmpControl'),
    },
    {
      key: 'new',
      label: t('phase3.cmpBuyNew'),
      getIn: neu ? neu.minergiePrice : budget,
      cls: 'B',
      heat: tenYearFor('B'),
      tradeoff: t('phase3.cmpMoveIn'),
    },
    {
      key: 'build',
      label: t('phase3.cmpBuild'),
      getIn: build.standards[1].total.mid,
      cls: 'B',
      heat: tenYearFor('B'),
      tradeoff: t('phase3.cmpEffort'),
      land: true,
    },
  ]

  return (
    <div className="space-y-6">
      <T
        as="p"
        className="text-sm leading-relaxed text-slate-600"
        k="phase3.intro"
        vars={{ budget: chf(budget), canton: canton?.name_en, size: int(size) }}
      />

      <ComparisonSummary
        rows={cmpRows}
        chosen={explore.chosenOption}
        onChoose={(k) => onChange({ ...explore, chosenOption: k })}
        budget={budget}
        canton={canton}
        size={size}
        t={t}
      />

      {/* Option A — Renovate */}
      <OptionShell
        t={t}
        tag={t('phase3.optionWord', { l: 'A' })}
        title={t('phase3.aTitle')}
        subtitle={t('phase3.aSubtitle')}
        chosen={explore.chosenOption === 'renovate'}
        onChoose={choose('renovate')}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Row label={t('phase3.renoCost')} value={`${chf(reno.cost.low)} – ${chf(reno.cost.high)}`} sub={`≈ ${chf(reno.cost.mid)}`} />
            <Row label={t('phase3.lessSubsidies')} value={`−${chf(reno.subsidy.low)} … −${chf(reno.subsidy.high)}`} />
            <div className="my-1 border-t border-slate-100" />
            <Row label={t('phase3.netUpgrade')} value={`${chf(reno.netCost.low)} – ${chf(reno.netCost.high)}`} strong />
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('phase3.tenYearHeat')}</p>
            <Row label={t('phase3.unrenovated', { c: reno.runningCost.unrenovatedClass })} value={chf(reno.runningCost.unrenovatedTenYear)} />
            <Row label={t('phase3.afterMinergie', { c: reno.runningCost.minergieClass })} value={chf(reno.runningCost.minergieTenYear)} />
            <div className="my-1 border-t border-slate-200" />
            <Row label={t('phase3.youdSave')} value={chf(reno.runningCost.tenYearSaving)} strong />
            <p className="mt-2 text-xs text-slate-500">{t('phase3.energyOffsets')}</p>
          </div>
        </div>
        <Indicative>{t('phase3.aIndicative')}</Indicative>

        <RetrofitConfigurator
          size={size}
          price={budget}
          selected={selectedMeasures(explore.measures)}
          onChange={(arr) => onChange({ ...explore, measures: arr.join(',') })}
        />
      </OptionShell>

      {/* Option B — New / Minergie-certified */}
      <OptionShell
        t={t}
        tag={t('phase3.optionWord', { l: 'B' })}
        title={t('phase3.bTitle')}
        subtitle={t('phase3.bSubtitle')}
        chosen={explore.chosenOption === 'new'}
        onChoose={choose('new')}
      >
        {neu ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <Row label={t('phase3.equivExisting')} value={chf(budget)} />
              <Row label={t('phase3.newBuildRow')} value={chf(neu.newBuildPrice)} sub={`+${neu.newBuildPremiumPct}%`} />
              <Row label={t('phase3.minergieCertified')} value={chf(neu.minergiePrice)} sub={`+${neu.minergiePremiumPct}%`} />
              <p className="mt-2 text-xs text-slate-500">{t('phase3.premiumNote', { premium: chf(neu.minergiePremium) })}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('phase3.longTermAdv')}</p>
              <Row label={t('phase3.tenYearSaving')} value={chf(neu.tenYearSaving)} sub={t('phase3.vsExisting')} strong />
              <Row label={t('phase3.resaleUplift')} value={`+${neu.resalePremiumPct}%`} />
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('phase3.availabilityHere')}</p>
                <p className="mt-1 text-sm text-slate-600">{neu.availabilitySignal}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">{t('phase3.enterBudgetCompare')}</p>
        )}
        <Indicative>{t('phase3.bIndicative')}</Indicative>
      </OptionShell>

      {/* Option C — Build on a plot */}
      <OptionShell
        t={t}
        tag={t('phase3.optionWord', { l: 'C' })}
        title={t('phase3.cTitle')}
        subtitle={t('phase3.cSubtitle')}
        chosen={explore.chosenOption === 'build'}
        onChoose={choose('build')}
      >
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">{t('phase2.colStandard')}</th>
                <th className="px-3 py-2 font-semibold">{t('phase3.colPerM2')}</th>
                <th className="px-3 py-2 font-semibold">{t('phase3.colBuildCost', { size: int(build.size) })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {build.standards.map((s) => (
                <tr key={s.label} className="text-slate-700">
                  <td className="px-3 py-2 font-medium text-slate-900">{s.label}</td>
                  <td className="px-3 py-2 tabular-nums">{chf(s.perM2.low)}–{chf(s.perM2.high)}</td>
                  <td className="px-3 py-2 tabular-nums font-medium text-slate-900">{chf(s.total.mid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">{t('phase3.notWholeCost')}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-900/90">
              <li>{t('phase3.landBullet')}</li>
              <li>{t('phase3.architectBullet', { low: build.softCosts.architectPct.low, high: build.softCosts.architectPct.high })}</li>
              <li>{t('phase3.engineerBullet', { low: build.softCosts.engineerPct.low, high: build.softCosts.engineerPct.high })}</li>
              <li>
                {t('phase3.permitsBullet', {
                  low: build.softCosts.permitsPct.low,
                  high: build.softCosts.permitsPct.high,
                  clow: build.softCosts.contingencyPct.low,
                  chigh: build.softCosts.contingencyPct.high,
                })}
              </li>
            </ul>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{t('phase3.beforePlot')}</p>
            <p className="mt-1">
              {t('phase3.beforePlotPre')}
              <InfoTerm term={t('phase3.nutzungszone')}>{t('phase3.nutzungszoneDef')}</InfoTerm>
              {t('phase3.beforePlotMid')}
              <InfoTerm term={t('phase3.gfz')}>{t('phase3.gfzDef')}</InfoTerm>
              {t('phase3.beforePlotPost')}
            </p>
            {build.planningPortal && (
              <a
                href={build.planningPortal}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-medium text-teal-700 hover:text-teal-900"
              >
                {t('phase3.cantonalPortal', { canton: canton?.name_en })}
              </a>
            )}
          </div>
        </div>
        <Indicative>{t('phase3.cIndicative')}</Indicative>
      </OptionShell>
    </div>
  )
}

const CMP_CLASS_COLORS = {
  A: 'bg-emerald-600',
  B: 'bg-green-600',
  C: 'bg-lime-600',
  D: 'bg-yellow-500',
  E: 'bg-amber-500',
  F: 'bg-orange-500',
  G: 'bg-red-600',
}

function ClassChip({ label }) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white ${CMP_CLASS_COLORS[label] || 'bg-slate-500'}`}>
      {label}
    </span>
  )
}

function ComparisonSummary({ rows, chosen, onChoose, budget, canton, size, t }) {
  return (
    <Card title={t('phase3.cmpTitle')}>
      <T
        as="p"
        className="mb-3 text-sm leading-relaxed text-slate-600"
        k="phase3.cmpNote"
        vars={{ budget: chf(budget), canton: canton?.name_en, size: int(size) }}
      />
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">{t('phase3.cmpColRoute')}</th>
              <th className="px-3 py-2 font-semibold">{t('phase3.cmpColGetIn')}</th>
              <th className="px-3 py-2 font-semibold">{t('phase3.cmpColClass')}</th>
              <th className="hidden px-3 py-2 font-semibold sm:table-cell">{t('phase3.cmpColHeat')}</th>
              <th className="hidden px-3 py-2 font-semibold md:table-cell">{t('phase3.cmpColTradeoff')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const active = chosen === r.key
              return (
                <tr
                  key={r.key}
                  onClick={() => onChoose(r.key)}
                  className={'cursor-pointer transition ' + (active ? 'bg-teal-50' : 'hover:bg-slate-50')}
                >
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      <span className={'h-2 w-2 rounded-full ' + (active ? 'bg-teal-600' : 'bg-slate-300')} />
                      {r.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums font-medium text-slate-900">
                    {chf(r.getIn)}
                    {r.land && (
                      <span className="text-xs font-normal text-slate-400"> {t('phase3.cmpPlusLand')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <ClassChip label={r.cls} />
                  </td>
                  <td className="hidden px-3 py-2 tabular-nums sm:table-cell">{chf(r.heat)}</td>
                  <td className="hidden px-3 py-2 text-slate-600 md:table-cell">{r.tradeoff}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Indicative>{t('phase3.cmpLandNote')}</Indicative>
    </Card>
  )
}
