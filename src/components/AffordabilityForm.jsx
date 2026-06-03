import { cantonOptions, getCanton } from '../lib/cantons'
import { chf } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { T } from './Trans'

const EMPLOYMENT_TYPES = [
  { value: 'employed', key: 'form.employed' },
  { value: 'self_employed', key: 'form.selfEmployed' },
  { value: 'mixed', key: 'form.mixed' },
]

/** Parse a CHF-ish string into a number. */
function toNum(v) {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''))
  return isFinite(n) ? n : 0
}

/** Controlled CHF field with a prefix and right-aligned numbers. */
function MoneyField({ id, label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
        <span className="select-none pl-3 pr-2 text-sm text-slate-400">CHF</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9'.\s]/g, ''))}
          placeholder={placeholder}
          className="w-full rounded-r-lg bg-transparent py-2.5 pr-3 text-right tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export default function AffordabilityForm({ values, onChange, onSubmit }) {
  const { t } = useI18n()
  const set = (key) => (val) => onChange({ ...values, [key]: val })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-5"
    >
      <MoneyField
        id="grossIncome"
        label={t('form.incomeLabel')}
        value={values.grossIncome}
        onChange={set('grossIncome')}
        placeholder="120'000"
        hint={t('form.incomeHint')}
      />

      <MoneyField
        id="savings"
        label={t('form.savingsLabel')}
        value={values.savings}
        onChange={set('savings')}
        placeholder="150'000"
        hint={t('form.savingsHint')}
      />

      <div>
        <MoneyField
          id="pillar2"
          label={t('form.pillar2Label')}
          value={values.pillar2}
          onChange={set('pillar2')}
          placeholder="80'000"
        />
        <T
          as="p"
          className="mt-1 text-xs text-slate-500"
          k="form.pillar2Hint"
          term={t('terms.pillar2')}
          def={t('terms.pillar2Def')}
        />
      </div>

      {/* Combined equity readout — what you bring to the table */}
      <div className="flex items-center justify-between rounded-lg border-l-4 border-teal-500 bg-teal-50/60 px-4 py-3">
        <span className="text-sm font-medium text-slate-700">
          {t('form.combinedEquity')}
        </span>
        <span className="tabular-nums text-base font-semibold text-slate-900">
          {chf(toNum(values.savings) + toNum(values.pillar2))}
        </span>
      </div>

      {/* Down-payment % — 20% floor, raise it to shrink the mortgage */}
      <div>
        <label htmlFor="downPct" className="block text-sm font-medium text-slate-700">
          {t('form.downPctLabel')}
        </label>
        <div className="mt-1.5 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 w-32">
          <input
            id="downPct"
            type="text"
            inputMode="numeric"
            value={values.downPct}
            onChange={(e) => set('downPct')(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
            onBlur={(e) => {
              const n = Math.min(90, Math.max(20, parseInt(e.target.value || '20', 10)))
              set('downPct')(String(n))
            }}
            className="w-full rounded-l-lg bg-transparent py-2.5 pl-3 text-right tabular-nums text-slate-900 focus:outline-none"
          />
          <span className="select-none px-3 text-sm text-slate-400">%</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{t('form.downPctHint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="canton" className="block text-sm font-medium text-slate-700">
            {t('form.cantonLabel')}
          </label>
          <select
            id="canton"
            value={values.canton}
            onChange={(e) => set('canton')(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {cantonOptions.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameEn} ({c.code})
              </option>
            ))}
          </select>
          <CantonHint code={values.canton} />
        </div>

        <div>
          <label htmlFor="householdSize" className="block text-sm font-medium text-slate-700">
            {t('form.householdLabel')}
          </label>
          <select
            id="householdSize"
            value={values.householdSize}
            onChange={(e) => set('householdSize')(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white py-2.5 px-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {t(n === 1 ? 'form.person' : 'form.people', { n })}
                {n === 6 ? '+' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">{t('form.householdNote')}</p>
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">
          {t('form.employmentLabel')}
        </span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {EMPLOYMENT_TYPES.map((tp) => {
            const active = values.employmentType === tp.value
            return (
              <button
                key={tp.value}
                type="button"
                onClick={() => set('employmentType')(tp.value)}
                className={
                  'rounded-lg border px-3 py-2.5 text-sm font-medium transition ' +
                  (active
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
                }
              >
                {t(tp.key)}
              </button>
            )
          })}
        </div>
        {values.employmentType === 'self_employed' && (
          <p className="mt-2 text-xs text-amber-700">{t('form.selfWarning')}</p>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-teal-700 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
      >
        {t('btn.showAfford')}
      </button>
    </form>
  )
}

/** Inline price-per-m² + cantonal tax micro-stat under the canton picker. */
function CantonHint({ code }) {
  const { t } = useI18n()
  const c = getCanton(code)
  if (!c) return null
  const apt = c.property_price_ranges?.apartment_chf_per_m2?.mid
  const tax = c.tax?.cantonal_income_tax_rate_approx_pct
  if (apt == null && tax == null) return null
  return (
    <p className="mt-1 text-xs text-slate-400">
      {t('form.cantonHint', { price: apt != null ? chf(apt) : '—', tax: tax != null ? tax : '—' })}
    </p>
  )
}
