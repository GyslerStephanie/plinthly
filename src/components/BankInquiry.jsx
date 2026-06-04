import { chf } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { useAppState } from '../state/AppStateContext'
import banksData from '../data/banks.json'
import { Card, Row, Pill } from './ui'

const toNum = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''))
  return isFinite(n) ? n : 0
}

/**
 * Build a professional, bilingual (EN + DE) mortgage-inquiry email body with the
 * buyer's key figures baked in. Deliberately NOT sent programmatically — it's
 * handed to the user's own mail client via mailto:, recipient left empty and a
 * [BANK EMAIL] placeholder included so the user chooses who to send it to and
 * reviews it first.
 */
function buildEmail({ price, income, savings, canton, viable }) {
  const statusEn = viable
    ? 'Indicative affordability: passes the standard Swiss affordability test (5% notional rate, costs under one third of income).'
    : 'Indicative affordability: does not yet meet the standard affordability test — I would value advice on closing the gap.'
  const statusDe = viable
    ? 'Indikative Tragbarkeit: besteht den üblichen Tragbarkeitstest (kalkulatorischer Zins 5 %, Kosten unter einem Drittel des Einkommens).'
    : 'Indikative Tragbarkeit: erfüllt den Tragbarkeitstest noch nicht — ich wäre für eine Beratung dankbar.'

  const subject = `Mortgage enquiry / Hypothekaranfrage — ${price} (${canton})`

  const body = `To: [BANK EMAIL]  (replace with your chosen bank's mortgage contact address before sending)

— English —

Dear Sir or Madam,

I would like to enquire about a mortgage and request an initial consultation. My key figures are:

• Target purchase price: ${price}
• Canton: ${canton}
• Gross annual household income: ${income}
• Available equity (savings): ${savings}
• ${statusEn}

I would be grateful for an appointment to discuss financing options.

Kind regards,
[Your name]


— Deutsch —

Sehr geehrte Damen und Herren,

ich möchte mich nach einer Hypothek erkundigen und um ein Erstgespräch bitten. Meine wichtigsten Eckdaten:

• Angestrebter Kaufpreis: ${price}
• Kanton: ${canton}
• Bruttojahreseinkommen des Haushalts: ${income}
• Verfügbares Eigenkapital (Ersparnisse): ${savings}
• ${statusDe}

Über einen Termin zur Besprechung der Finanzierungsmöglichkeiten würde ich mich freuen.

Freundliche Grüsse,
[Ihr Name]`

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Filter banks to those available in the buyer's canton (national + cantonal). */
function banksForCanton(code) {
  return banksData.banks.filter(
    (b) => b.scope === 'national' || (Array.isArray(b.scope) && b.scope.includes(code)),
  )
}

export default function BankInquiry() {
  const { t } = useI18n()
  const { maxPrice, cantonCode, cantonName, viable, values } = useAppState()

  const income = toNum(values.grossIncome)
  const savings = toNum(values.savings)
  const priceStr = chf(maxPrice)

  const mailto = buildEmail({
    price: priceStr,
    income: chf(income),
    savings: chf(savings),
    canton: cantonName,
    viable,
  })

  const banks = banksForCanton(cantonCode)

  return (
    <Card title={t('bank.title')} tone="teal" className="no-print">
      <p className="-mt-1 mb-4 text-sm leading-relaxed text-slate-600">{t('bank.intro')}</p>

      {/* Pre-filled key-figures summary */}
      <div className="rounded-lg border border-teal-100 bg-white/70 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('bank.summaryTitle')}
        </p>
        <Row label={t('bank.fPrice')} value={priceStr} strong />
        <Row label={t('bank.fIncome')} value={chf(income)} />
        <Row label={t('bank.fSavings')} value={chf(savings)} />
        <Row label={t('bank.fCanton')} value={cantonName} />
        <Row label={t('bank.fStatus')} value={viable ? t('summary.ready') : t('summary.notYet')} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Option A — email inquiry */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">{t('bank.optionA')}</h4>
          <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{t('bank.optionADesc')}</p>
          <a
            href={mailto}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-teal-800"
          >
            {t('bank.emailBtn')}
          </a>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{t('bank.emailNote')}</p>
        </div>

        {/* Option B — branch finder */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">
            {t('bank.optionB', { canton: cantonName })}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('bank.optionBDesc')}</p>
          <ul className="mt-3 space-y-1.5">
            {banks.map((b) => (
              <li key={b.name} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  {b.name}
                  {b.scope === 'national' ? (
                    <Pill>{t('bank.national')}</Pill>
                  ) : (
                    <Pill tone="teal">{t('bank.cantonal')}</Pill>
                  )}
                </span>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-teal-700 hover:text-teal-900"
                >
                  {t('bank.visit')} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">{t('bank.disclaimer')}</p>
    </Card>
  )
}
