import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { askAdvisor } from './GlossaryTerm'

const DISMISS_KEY = 'plinthly.learnToastDismissed'

/**
 * "New to mortgages?" — the discoverable entry to the learn layer. Bottom-left
 * (the advisor button owns bottom-right): points to Ask Plinthly AI and a few
 * vetted guides. Shows on each page; dismissing hides it for the rest of the
 * visit (sessionStorage), so it informs without nagging.
 *
 * @param {Array<{label, url}>} links  Vetted guides (src/data/courses.json).
 * @param {boolean} [inline]           Mounted inside an overlay (Compare) → sit above it.
 */
export default function LearnToast({ links = [], inline = false }) {
  const { t } = useI18n()
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [shown, setShown] = useState(false)
  // Appear a moment after the page settles, so it doesn't compete with first paint.
  useEffect(() => {
    const id = setTimeout(() => setShown(true), 1200)
    return () => clearTimeout(id)
  }, [])

  if (hidden || !shown) return null
  const dismiss = () => {
    setHidden(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <aside
      role="status"
      aria-label={t('learnToast.title')}
      className={`learn-toast fixed bottom-5 left-5 w-[22rem] max-w-[calc(100vw-7rem)] rounded-2xl border border-line bg-card p-4 shadow-xl no-print ${inline ? 'z-[60]' : 'z-40'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-base font-semibold text-ink">{t('learnToast.title')}</p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('learnToast.dismiss')}
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink"
        >
          <span aria-hidden="true" className="text-lg leading-none">×</span>
        </button>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-body">{t('learnToast.body')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => askAdvisor('')}
          className="rounded-full bg-teal-800 px-3.5 py-1.5 text-sm font-semibold text-on-primary transition hover:bg-teal-900"
        >
          {t('advisorTip')}
        </button>
      </div>
      {links.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-2.5">
          {links.slice(0, 3).map((l) => (
            <li key={l.url} className="text-sm">
              <a href={l.url} target="_blank" rel="noreferrer" className="font-medium">{l.label} →</a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
