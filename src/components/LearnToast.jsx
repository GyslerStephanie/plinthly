import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { askAdvisor } from './GlossaryTerm'
import { localizeLinks } from '../lib/learn'
import { track, trackOutbound } from '../lib/track'

const DISMISS_KEY = 'plinthly.learnToastDismissed'

/**
 * "New to mortgages?" — the discoverable entry to the learn layer, as a slim
 * bar in the page flow (under the navigation) rather than a floating card:
 * title and one line of copy on the left, Ask Plinthly AI and the vetted
 * guides on the right, and an × to dismiss. Dismissing hides it for the rest
 * of the visit (sessionStorage), so it informs without nagging.
 *
 * @param {Array<{label, url}>} links  Vetted guides (src/data/courses.json).
 * @param {string} [className]
 */
export default function LearnToast({ links: rawLinks = [], className = '' }) {
  const { t, lang } = useI18n()
  // Swiss guide labels in the UI language (URLs unchanged; US links pass through).
  const links = localizeLinks(rawLinks, lang)
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  if (hidden) return null
  const dismiss = () => {
    track('learn_toast', { action: 'dismissed' })
    setHidden(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <aside
      aria-label={t('learnToast.title')}
      className={`learn-toast flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-card px-4 py-3 shadow-sm no-print ${className}`}
    >
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm text-body">
          <span className="font-display text-base font-semibold text-ink">{t('learnToast.title')}</span>
          <span className="ml-2">{t('learnToast.body')}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <button
          type="button"
          onClick={() => {
            track('learn_toast', { action: 'ask' })
            askAdvisor('')
          }}
          className="rounded-full bg-teal-800 px-3.5 py-1.5 text-sm font-semibold text-on-primary transition hover:bg-teal-900"
        >
          {t('advisorTip')}
        </button>
        {links.slice(0, 3).map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium"
            onClick={() => {
              track('learn_toast', { action: 'link' })
              trackOutbound('guide')
            }}
          >
            {l.label} →
          </a>
        ))}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('learnToast.dismiss')}
        className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink"
      >
        <span aria-hidden="true" className="text-lg leading-none">×</span>
      </button>
    </aside>
  )
}
