import { chf } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { useAppState } from '../state/AppStateContext'

/**
 * Small contextual reminder shown at the top of every phase after Phase 1, so
 * the user can see their earlier inputs are carrying forward. Reads derived
 * figures straight from AppStateContext (no props needed).
 *
 * Phase 3 additionally surfaces the mortgage amount, since renovation costs are
 * contextualised against it.
 */
export default function PhaseContextBanner({ phase }) {
  const { t } = useI18n()
  const { budget, cantonName, mortgage, hasResult } = useAppState()

  if (!hasResult || !budget) return null

  const key = phase === 3 ? 'context.banner3' : 'context.banner'

  return (
    <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-2.5 text-sm text-teal-900 no-print">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="flex-none text-teal-600"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span>
        {t(key, {
          budget: chf(budget),
          canton: cantonName,
          mortgage: chf(mortgage),
        })}
      </span>
    </div>
  )
}
