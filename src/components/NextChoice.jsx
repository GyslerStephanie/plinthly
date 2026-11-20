import { useI18n } from '../i18n/I18nContext'
import OptionCard, { Icons } from './OptionCard'

const compareIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M5 21h14" />
    <path d="M6 7h12M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z" />
  </svg>
)

/**
 * End of the journey (after the dream price): one question, two routes.
 * Compare opens the scenarios tool (buy, rent + invest, don't buy); Build
 * opens How to Build for Climate Change, which holds "what to look for",
 * the real options and the action plan.
 */
export default function NextChoice({ onCompare, onBuild }) {
  const { t } = useI18n()
  return (
    <section aria-labelledby="next-choice-title" className="ds-card mt-10 no-print">
      <h2 id="next-choice-title" className="font-display text-xl font-bold text-ink">{t('hub.choiceTitle')}</h2>
      <p className="mt-1 text-sm leading-relaxed text-body">{t('hub.choiceIntro')}</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <OptionCard icon={compareIcon} title={t('hub.compareTitle')} description={t('hub.compareDesc')} onClick={onCompare} />
        <OptionCard icon={Icons.leaf} title={t('hub.buildTitle')} description={t('hub.buildDesc')} onClick={onBuild} />
      </div>
    </section>
  )
}
