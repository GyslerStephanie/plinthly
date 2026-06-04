import { RETROFIT_MEASURES, measureDetails, computeLedger } from '../lib/retrofit'
import { chf, int } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { Row, Indicative } from './ui'

const CLASS_COLORS = {
  A: 'bg-emerald-600',
  B: 'bg-green-600',
  C: 'bg-lime-600',
  D: 'bg-yellow-500',
  E: 'bg-amber-500',
  F: 'bg-orange-500',
  G: 'bg-red-600',
}

function GeakTrajectory({ order, baseline, current, t }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('retrofit.energyRating')}
        </span>
        <span className="text-sm font-semibold tabular-nums text-slate-700">
          {baseline} → {current}
        </span>
      </div>
      <div className="flex gap-1">
        {order.map((c) => {
          const active = c === current
          const isBase = c === baseline
          return (
            <span
              key={c}
              className={
                'flex h-7 flex-1 items-center justify-center rounded text-xs font-bold text-white transition ' +
                CLASS_COLORS[c] +
                (active ? ' ring-2 ring-slate-900 ring-offset-1' : isBase ? ' opacity-100' : ' opacity-30')
              }
            >
              {c}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function MeasureToggle({ id, checked, onToggle, detail, t }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        'w-full rounded-xl border p-3 text-left transition ' +
        (checked ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 bg-white hover:border-slate-300')
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ' +
            (checked ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-transparent')
          }
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">{t(`retrofit.${id}Label`)}</span>
            <span className="shrink-0 tabular-nums text-sm font-semibold text-slate-900">{chf(detail.cost)}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{t(`retrofit.${id}Blurb`)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[11px] font-medium text-teal-700">
              −{detail.dCost} CHF/m²·yr
            </span>
            {detail.subsidy > 0 ? (
              <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
                {t('retrofit.subsidyChip', { amount: chf(detail.subsidy) })}
              </span>
            ) : (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-400">
                {t('retrofit.noSubsidy')}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

export default function RetrofitConfigurator({ size, price, selected, onChange }) {
  const { t } = useI18n()
  const selectedSet = new Set(selected)
  const details = measureDetails(size)
  const detailById = Object.fromEntries(details.map((d) => [d.id, d]))
  const ledger = computeLedger(size, price, selected)

  const toggle = (id) => {
    const next = new Set(selectedSet)
    next.has(id) ? next.delete(id) : next.add(id)
    // Preserve catalogue order for a stable, shareable string.
    onChange(RETROFIT_MEASURES.filter((m) => next.has(m.id)).map((m) => m.id))
  }

  const groups = [
    { key: 'envelope', ids: RETROFIT_MEASURES.filter((m) => m.group === 'envelope').map((m) => m.id) },
    { key: 'systems', ids: RETROFIT_MEASURES.filter((m) => m.group === 'systems').map((m) => m.id) },
  ]

  const minergieGrade = ['A', 'B', 'C'].includes(ledger.newClass)

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h4 className="text-sm font-semibold text-slate-900">{t('retrofit.title')}</h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        {t('retrofit.intro', { size: int(size) })}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Measure toggles */}
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t(`retrofit.${g.key}`)}
              </p>
              <div className="space-y-2">
                {g.ids.map((id) => (
                  <MeasureToggle
                    key={id}
                    id={id}
                    checked={selectedSet.has(id)}
                    onToggle={() => toggle(id)}
                    detail={detailById[id]}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Live ledger */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('retrofit.ledgerTitle')}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-600">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              {t('retrofit.live')}
            </span>
          </div>

          <GeakTrajectory order={ledger.classOrder} baseline={ledger.baselineClass} current={ledger.newClass} t={t} />

          {minergieGrade && (
            <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-xs leading-relaxed text-teal-800">
              {t('retrofit.minergieHint')}
            </p>
          )}

          <div className="mt-3 border-t border-slate-100 pt-1">
            <Row
              label={t('retrofit.runningCost')}
              value={`${chf(ledger.runningCost.baseAnnual)} → ${chf(ledger.runningCost.newAnnual)}`}
            />
            <Row
              label={t('retrofit.co2')}
              value={`${ledger.co2.baseTons} → ${ledger.co2.newTons} t`}
            />
            <div className="my-1 border-t border-slate-100" />
            <Row label={t('retrofit.totalCost')} value={chf(ledger.totalCost)} />
            <Row label={t('retrofit.subsidies')} value={`−${chf(ledger.totalSubsidy)}`} />
            <Row label={t('retrofit.netCost')} value={chf(ledger.netCost)} strong />
            <div className="my-1 border-t border-slate-100" />
            <Row label={t('retrofit.tenYearSaving')} value={chf(ledger.tenYearSaving)} />
            <Row
              label={t('retrofit.payback')}
              value={ledger.paybackYears ? t('retrofit.years', { n: ledger.paybackYears.toFixed(0) }) : '—'}
            />
            {ledger.valueUplift > 0 && (
              <Row
                label={t('retrofit.valueUplift')}
                value={`+${chf(ledger.valueUplift)}`}
                sub={`+${ledger.premiumPct}%`}
              />
            )}
          </div>

          {ledger.annualSaving > 0 && (
            <div className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-center text-sm font-semibold text-teal-800">
              {t('retrofit.monthlySaving', { amount: chf(ledger.monthlySaving) })}
            </div>
          )}
          {ledger.selectedCount === 0 && (
            <p className="mt-3 text-center text-xs text-slate-400">{t('retrofit.pickToStart')}</p>
          )}
        </div>
      </div>

      <Indicative>{t('retrofit.indicative')}</Indicative>
    </div>
  )
}
