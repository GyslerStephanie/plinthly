import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import OptionCard, { Icons } from './OptionCard'

/**
 * "Choose your next step" (spec §6e). A primary black pill "See options →"
 * reveals two option cards inline (no navigation until clicked). Below them, a
 * SEPARATE secondary link "or: get independent advice →" — the non-bank AI
 * advisor concept, which captures NO data: clicking logs interest as a demand
 * signal and shows an inline acknowledgement, preserving the no-sign-up promise.
 *
 * @param {() => void} onExploreSustainable  Route to Phase 2 ("what to look for").
 * @param {() => void} onExploreRenovations  Route to Phase 3 ("real options").
 * @param {string}     advisorContext        Label for the demand-signal log.
 */
export default function NextSteps({ onExploreSustainable, onExploreRenovations, advisorContext = 'next_steps' }) {
  const { t } = useI18n()
  const [revealed, setRevealed] = useState(false)
  const [noted, setNoted] = useState(false)

  const registerInterest = () => {
    // eslint-disable-next-line no-console
    console.log('[Plinthly advisor interest]', { context: advisorContext })
    setNoted(true)
  }

  return (
    <div className="mt-6 border-t border-line pt-6">
      <h4 className="font-display text-base font-bold text-ink">{t('next.title')}</h4>
      <p className="mt-1 text-sm leading-relaxed text-body">{t('next.intro')}</p>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-4 inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
        >
          {t('next.seeOptions')} →
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <OptionCard
            icon={Icons.leaf}
            title={t('next.cardSustainTitle')}
            description={t('next.cardSustainDesc')}
            onClick={onExploreSustainable}
          />
          <OptionCard
            icon={Icons.wrench}
            title={t('next.cardRenovTitle')}
            description={t('next.cardRenovDesc')}
            onClick={onExploreRenovations}
          />
        </div>
      )}

      {/* Independent advisor — a separate link, NOT a card. Captures nothing. */}
      <div className="mt-4">
        {noted ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-positive">
            ✓ {t('path.advisorThanks')}
          </p>
        ) : (
          <button
            type="button"
            onClick={registerInterest}
            className="text-sm font-medium text-body underline-offset-2 transition hover:text-ink hover:underline"
          >
            {t('next.adviceLink')} →
          </button>
        )}
        <span className="ml-2 rounded-full bg-info-light px-2 py-0.5 text-xs font-medium text-info">
          {t('path.advisorSoon')}
        </span>
      </div>
    </div>
  )
}
