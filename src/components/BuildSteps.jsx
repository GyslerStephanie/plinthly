/**
 * Step row inside How to Build for Climate Change: What to look for → Real
 * options → (US) Compare builds → Action plan. Numbered because it is a
 * sequence; any step can be opened directly.
 *
 * @param {Array<{id: string, label: string}>} steps
 * @param {string} current  id of the open step
 * @param {(id: string) => void} onSelect
 */
export default function BuildSteps({ steps, current, onSelect, label }) {
  return (
    <nav aria-label={label} className="mb-[var(--space-block)] no-print">
      <ol className="flex flex-wrap gap-2">
        {steps.map((s, i) => {
          const on = s.id === current
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={on ? 'step' : undefined}
                className={
                  'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition ' +
                  (on
                    ? 'border-teal-700 bg-teal-700 font-semibold text-white'
                    : 'border-line bg-white font-medium text-body hover:border-ink hover:text-ink')
                }
              >
                <span className={'tabular-nums ' + (on ? 'text-white/80' : 'text-muted')}>{i + 1}</span>
                {s.label}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
