import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { localizeLinks } from '../lib/learn'
import { track, trackOutbound } from '../lib/track'

const DISMISS_KEY = 'plinthly.learnToastDismissed'

/**
 * "New to mortgages?": the discoverable entry to the learn layer, as a slim
 * bar in the page flow (under the navigation): a book icon and the title,
 * the vetted guides as link chips, and an × to dismiss (the Ask Plinthly AI
 * bubble sits bottom-right). Dismissing hides it for the rest
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
    <aside aria-label={t('learnToast.title')} className={`ds-learn no-print ${className}`}>
      <span className="ds-learn-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <path d="M10 5.5C8.6 4.4 6.6 4 3.5 4v11c3.1 0 5.1.4 6.5 1.5 1.4-1.1 3.4-1.5 6.5-1.5V4c-3.1 0-5.1.4-6.5 1.5Z" />
          <path d="M10 5.5v11" />
        </svg>
      </span>
      <p className="ds-learn-title">{t('learnToast.title')}</p>
      <ul className="ds-learn-links">
        {links.slice(0, 3).map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="ds-learn-chip"
              onClick={() => {
                track('learn_toast', { action: 'link' })
                trackOutbound('guide')
              }}
            >
              {l.label}
              <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 2h6v6M10 2 3 9" />
              </svg>
            </a>
          </li>
        ))}
      </ul>
      <button type="button" onClick={dismiss} aria-label={t('learnToast.dismiss')} className="ds-learn-close">
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  )
}
