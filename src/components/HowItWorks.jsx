import { useI18n } from '../i18n/I18nContext'
import { track, trackOutbound } from '../lib/track'

/**
 * "How is this calculated?" crash-course card: 3–4 plain steps with the user's
 * own numbers, then vetted learn-more links. Collapsed by default so it never
 * crowds the result. Content comes from src/lib/learn.js (Swiss cards in
 * en/de/fr/it, US cards in English).
 */
export default function HowItWorks({ course: card, cardId = 'other' }) {
  const { t, lang } = useI18n()
  if (!card) return null
  // Swiss cards built without a language carry their translations; show the
  // one for the UI language (US cards have none and stay English).
  const course = (card.i18n && card.i18n[lang]) || card
  return (
    <details
      className="group rounded-xl border border-line bg-white p-5 shadow-sm no-print"
      onToggle={(e) => {
        if (e.currentTarget.open) track('how_it_works_opened', { card: cardId })
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-800" aria-hidden="true">?</span>
          {course.title}
        </span>
        <span className="text-muted transition group-open:rotate-180" aria-hidden="true">▾</span>
      </summary>
      <ol className="mt-4 space-y-3">
        {course.steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-body">
            <span className="ds-figure mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-ink">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {course.links.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="ds-eyebrow text-[11px] text-muted">{t('learnMore')}</p>
          <ul className="mt-1.5 space-y-1">
            {course.links.map((l) => (
              <li key={l.url} className="text-sm">
                <a href={l.url} target="_blank" rel="noreferrer" className="font-medium" onClick={() => trackOutbound('guide')}>{l.label} →</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  )
}
