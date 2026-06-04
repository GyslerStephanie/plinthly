import { useState } from 'react'
import { buildActionPlan } from '../lib/actionPlan'
import { getCanton } from '../lib/cantons'
import { impliedSize } from '../lib/exploration'
import { computeLedger, selectedMeasures } from '../lib/retrofit'
import { chf, int } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { Card, Pill } from './ui'
import BankInquiry from './BankInquiry'
import FeedbackSection from './FeedbackSection'

const OPTION_LABEL_KEYS = {
  renovate: 'phase3.aTitle',
  new: 'phase3.bTitle',
  build: 'phase3.cTitle',
}

const STEP_TONES = {
  teal: 'border-line bg-surface',
  amber: 'border-line bg-surface',
  default: 'border-line bg-white',
}

export default function Phase4ActionPlan({ phase1, explore, shareUrl, feedback, onSubmitFeedback }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const canton = getCanton(explore.canton)
  const budget = Number(String(explore.budget).replace(/[^0-9.]/g, '')) || 0
  const size = impliedSize(explore.canton, budget, explore.propertyType)
  const steps = buildActionPlan({ phase1, explore })
  const ledger =
    explore.chosenOption === 'renovate'
      ? computeLedger(size, budget, selectedMeasures(explore.measures))
      : null

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Recap — self-contained for the printout */}
      <Card title={t('phase4.glance')} tone={phase1.viable ? 'teal' : 'amber'}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
          <Stat label={t('phase4.maxPrice')} value={chf(phase1.maxPrice)} />
          <Stat
            label={t('phase4.status')}
            value={phase1.viable ? t('phase4.ready') : t('phase4.notYet')}
          />
          <Stat label={t('phase4.targetCanton')} value={canton?.name_en || explore.canton} />
          <Stat label={t('phase4.budgetExplored')} value={chf(budget)} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <Pill>{t(`phase2.${explore.propertyType}`)}</Pill>
          <Pill>{t(explore.condition === 'new' ? 'phase2.newBuild' : 'phase2.existing')}</Pill>
          {explore.chosenOption && OPTION_LABEL_KEYS[explore.chosenOption] && (
            <Pill tone="teal">{t(OPTION_LABEL_KEYS[explore.chosenOption])}</Pill>
          )}
          <span className="text-xs text-slate-400">≈ {int(size)} m²</span>
        </div>
        {ledger && ledger.selectedCount > 0 && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border-l-4 border-teal-500 bg-white/70 px-3 py-2">
            <span className="text-xs font-medium text-slate-500">{t('phase4.modelledUpgrade')}</span>
            <span className="text-sm font-medium tabular-nums text-slate-800">
              {t('phase4.modelledValue', {
                baseline: ledger.baselineClass,
                cls: ledger.newClass,
                net: chf(ledger.netCost),
                monthly: chf(ledger.monthlySaving),
              })}
            </span>
          </div>
        )}
      </Card>

      {/* The plan */}
      <div>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          {t('phase4.nextSteps', { n: steps.length })}
        </h2>
        <p className="mb-4 text-sm text-slate-500">{t('phase4.ordered')}</p>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li
              key={i}
              className={`rounded-xl border p-5 shadow-sm ${STEP_TONES[step.tone] || STEP_TONES.default}`}
            >
              <div className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {t(step.titleKey, step.vars)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-700">
                    {t(step.bodyKey, step.vars)}
                  </p>
                  {step.link && (
                    <a
                      href={step.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      {t(step.link.labelKey, step.link.labelVars)} ↗
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Ready to talk to a bank? */}
      <BankInquiry />

      {/* Share / export */}
      <Card title={t('phase4.takeWith')} className="no-print">
        <p className="text-sm leading-relaxed text-slate-600">{t('phase4.takeWithText')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            {copied ? t('phase4.linkCopied') : t('phase4.copyLink')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                window.print()
              } catch {
                /* print blocked in sandbox */
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-ink bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-surface"
          >
            {t('phase4.printPdf')}
          </button>
        </div>
        {shareUrl && <p className="mt-3 break-all text-xs text-slate-400">{shareUrl}</p>}
      </Card>

      {/* Feedback — end of the journey */}
      <FeedbackSection feedback={feedback} onSubmit={onSubmitFeedback} />
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="py-1">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  )
}
