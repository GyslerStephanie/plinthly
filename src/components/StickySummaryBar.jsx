import { useState } from 'react'
import { chf } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'
import { useAppState } from '../state/AppStateContext'

/** Small green check (viable) / amber warning (not yet) status indicator. */
function StatusBadge({ viable, label }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ' +
        (viable ? 'bg-positive-light text-positive' : 'bg-warning-light text-amber-800')
      }
    >
      {viable ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      )}
      {label}
    </span>
  )
}

/** One label/value cell. */
function Metric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="ds-eyebrow text-[10px] text-slate-400">{label}</p>
      <p className="ds-figure truncate text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

/**
 * Persistent status indicator that sticks to the top of the viewport once the
 * user has completed Phase 1. Shows max price, required down payment, estimated
 * monthly cost (at the actual market rate) and an affordability status icon.
 * Reads derived figures from AppStateContext, so it updates in real time as the
 * user adjusts inputs. On mobile it collapses to a thin tap-to-expand bar.
 */
export default function StickySummaryBar() {
  const { t } = useI18n()
  const { hasResult, viable, maxPrice, downPayment, monthlyActual, dreamOutOfReach } = useAppState()
  const [expanded, setExpanded] = useState(false)

  // Only after Phase 1 is locked in.
  if (!hasResult) return null

  // On the dream-price step, an out-of-reach dream overrides the Phase-1
  // "Affordable" status so the header doesn't contradict the verdict below.
  const statusViable = dreamOutOfReach ? false : viable
  const statusLabel = dreamOutOfReach
    ? t('summary.outOfReach')
    : viable ? t('summary.ready') : t('summary.notYet')

  const scrollToGap = () =>
    document.getElementById('close-the-gap')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur no-print">
      <div className="mx-auto max-w-[1320px] px-5 md:px-8 lg:px-[60px]">
        {/* Desktop: full row */}
        <div className="hidden items-center justify-between gap-6 py-2.5 md:flex">
          <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('summary.title')}
          </p>
          <div className="flex flex-1 items-center justify-end gap-6">
            <Metric label={t('summary.maxPrice')} value={chf(maxPrice)} />
            <Metric label={t('summary.downPayment')} value={chf(downPayment)} />
            <Metric label={t('summary.monthly')} value={`${chf(monthlyActual)}/mo`} />
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge viable={statusViable} label={statusLabel} />
              {dreamOutOfReach && (
                <button
                  type="button"
                  onClick={scrollToGap}
                  className="text-xs font-medium text-body underline decoration-line underline-offset-2 transition hover:text-ink"
                >
                  {t('summary.closeGap')} ↓
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: thin collapsed bar, tap to expand */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex w-full items-center justify-between gap-3 py-2.5 text-left"
          >
            <span className="flex items-center gap-2">
              <span className="ds-eyebrow text-[10px] text-slate-400">
                {t('summary.maxPrice')}
              </span>
              <span className="ds-figure text-sm font-medium text-slate-900">
                {chf(maxPrice)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <StatusBadge viable={statusViable} label={statusLabel} />
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={'text-slate-400 transition-transform ' + (expanded ? 'rotate-180' : '')}
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </button>
          {expanded && (
            <div className="border-t border-slate-100 py-3">
              <div className="grid grid-cols-2 gap-3">
                <Metric label={t('summary.downPayment')} value={chf(downPayment)} />
                <Metric label={t('summary.monthly')} value={`${chf(monthlyActual)}/mo`} />
              </div>
              {dreamOutOfReach && (
                <button
                  type="button"
                  onClick={scrollToGap}
                  className="mt-3 text-xs font-medium text-body underline decoration-line underline-offset-2 transition hover:text-ink"
                >
                  {t('summary.closeGap')} ↓
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
