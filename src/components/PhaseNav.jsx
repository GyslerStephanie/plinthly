import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'

/**
 * The five-step journey, one row on every screen (overlays included). The
 * parallel tools (Compare, How to build) now live in ToolTabs under the page
 * heading; the `tools` prop still renders them as chips if passed.
 *
 * Steps are reachable once visited (`maxVisited`), as before. Tools are always
 * reachable; the active one is highlighted.
 *
 * @param {number} current      Active phase (1–5), or 0 when a tool is active.
 * @param {number} maxVisited
 * @param {(n: number) => void} onJump
 * @param {Array<{id: string, label: string, active?: boolean, onSelect: () => void}>} [tools]
 * @param {boolean} [intro]  First-visit intro: the steps rise in one by one, a
 *   pulse walks 1→5, and at 6 s the row folds into a compact "Step n of 5"
 *   pill (click to expand). Once per browser (localStorage); skipped for
 *   reduced motion, where the full row shows as before.
 */
export const PHASE_NUMBERS = [1, 2, 3, 4, 5]
const INTRO_KEY = 'plinthly.stepperIntroSeen'
const INTRO_HIDE_MS = 6000
const INTRO_OUT_MS = 500

function initialMode(intro) {
  if (!intro) return 'full'
  try {
    if (localStorage.getItem(INTRO_KEY) === '1') return 'full'
  } catch {
    return 'full'
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'full'
  return 'intro'
}

export default function PhaseNav({ current, maxVisited, onJump, tools = [], intro = false }) {
  const { t } = useI18n()
  const [mode, setMode] = useState(() => initialMode(intro)) // intro → leaving → compact; or full

  // One timer per stage, so leaving the intro doesn't cancel the fold-out.
  useEffect(() => {
    if (mode === 'intro') {
      try {
        localStorage.setItem(INTRO_KEY, '1')
      } catch {
        /* ignore */
      }
      const out = setTimeout(() => setMode('leaving'), INTRO_HIDE_MS)
      return () => clearTimeout(out)
    }
    if (mode === 'leaving') {
      const done = setTimeout(() => setMode('compact'), INTRO_OUT_MS)
      return () => clearTimeout(done)
    }
    return undefined
  }, [mode])

  if (mode === 'compact') {
    return (
      <nav aria-label={t('nav.label')} className="stepper-compact">
        <button
          type="button"
          onClick={() => setMode('full')}
          aria-expanded="false"
          className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3 text-sm text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-ink"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">
            {current}
          </span>
          <span>
            {t('nav.stepOf', { n: current, total: PHASE_NUMBERS.length })} ·{' '}
            <span className="font-medium text-slate-900">{t(`nav.${current}`)}</span>
          </span>
          <span aria-hidden="true" className="text-muted">▾</span>
        </button>
      </nav>
    )
  }

  const motion = mode === 'intro' ? ' stepper-intro' : mode === 'leaving' ? ' stepper-intro stepper-leaving' : ''
  return (
    <nav aria-label={t('nav.label')} className={'flex flex-wrap items-center gap-x-3 gap-y-2' + motion}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {PHASE_NUMBERS.map((n, i) => {
          const active = n === current
          const done = current > 0 && n < current
          const reachable = n <= maxVisited
          return (
            <li key={n} className="flex items-center gap-2" style={{ '--i': i }}>
              <button
                type="button"
                onClick={() => reachable && onJump(n)}
                disabled={!reachable}
                // Without this the current step is conveyed by colour alone.
                aria-current={active ? 'step' : undefined}
                className={
                  'flex items-center gap-2 rounded-full py-0.5 pr-2 ' +
                  (reachable ? 'cursor-pointer' : 'cursor-not-allowed')
                }
              >
                <span
                  className={
                    'stepper-dot flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                    (active
                      ? 'bg-teal-700 text-white'
                      : done
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-100 text-slate-400')
                  }
                >
                  {n}
                </span>
                <span className={active ? 'font-medium text-slate-900' : reachable ? 'text-slate-600' : 'text-slate-400'}>
                  {t(`nav.${n}`)}
                </span>
              </button>
              {i < PHASE_NUMBERS.length - 1 && (
                <span aria-hidden="true" className="stepper-arrow mx-1 hidden text-slate-300 sm:inline">
                  →
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {tools.length > 0 && (
        <>
          <span aria-hidden="true" className="hidden h-5 w-px bg-line-strong sm:inline-block" />
          <ul aria-label={t('nav.tools')} className="flex flex-wrap items-center gap-2 text-sm">
            {tools.map((tool) => (
              <li key={tool.id}>
                <button
                  type="button"
                  onClick={tool.onSelect}
                  aria-current={tool.active ? 'page' : undefined}
                  className={
                    'rounded-full border px-3 py-1 text-sm transition ' +
                    (tool.active
                      ? 'border-teal-600 bg-teal-50 font-medium text-teal-800'
                      : 'border-line bg-white text-slate-600 hover:border-slate-400 hover:text-ink')
                  }
                >
                  {tool.label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  )
}
