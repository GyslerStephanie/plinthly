import { useI18n } from '../i18n/I18nContext'

/**
 * The product's navigation: the five-step journey plus the parallel tools
 * (Compare, and in the US the build explorer). One row on every screen,
 * overlays included, so you always know where you are and can move between
 * the journey and the tools in one click.
 *
 * Steps are reachable once visited (`maxVisited`), as before. Tools are always
 * reachable; the active one is highlighted.
 *
 * @param {number} current      Active phase (1–5), or 0 when a tool is active.
 * @param {number} maxVisited
 * @param {(n: number) => void} onJump
 * @param {Array<{id: string, label: string, active?: boolean, onSelect: () => void}>} [tools]
 */
export const PHASE_NUMBERS = [1, 2, 3, 4, 5]

export default function PhaseNav({ current, maxVisited, onJump, tools = [] }) {
  const { t } = useI18n()
  return (
    <nav aria-label={t('nav.label')} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {PHASE_NUMBERS.map((n, i) => {
          const active = n === current
          const done = current > 0 && n < current
          const reachable = n <= maxVisited
          return (
            <li key={n} className="flex items-center gap-2">
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
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
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
                <span aria-hidden="true" className="mx-1 hidden text-slate-300 sm:inline">
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
