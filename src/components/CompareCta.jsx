import { useI18n } from '../i18n/I18nContext'

/**
 * Contextual "Compare your options" entry — the doubt-moment hook shown on the
 * Phase 1 and Phase 2 results. Opens the Compare surface (a parallel view, not a
 * funnel step). Reuses the OptionCard visual language.
 */
export default function CompareCta({ onCompare }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onCompare}
      className="group flex w-full flex-col items-start gap-3 rounded-xl border border-line bg-white p-4 text-left shadow-sm transition hover:border-ink hover:shadow-md sm:flex-row sm:items-center sm:justify-between no-print"
    >
      <span className="flex items-start gap-3">
        <span className="mt-0.5 text-ink" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 18V8M10 18V5M16 18v-7M21 18H3" />
          </svg>
        </span>
        <span>
          <span className="block font-display text-base font-bold text-ink">{t('compare.ctaTitle')}</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-body">{t('compare.ctaDesc')}</span>
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition group-hover:opacity-90">
        {t('compare.ctaButton')}
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </button>
  )
}
