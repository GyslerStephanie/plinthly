import { ut } from '../../markets/us/copy'

/** Placeholder for phases that exist for Switzerland but not yet for the US. */
export default function UsComingSoon({ phase, onBack }) {
  return (
    <section className="max-w-2xl rounded-xl border border-dashed border-slate-300 bg-white/70 p-8">
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{ut('soon.title')}</span>
      <p className="mt-4 text-base text-body">{ut('soon.body')}</p>
      <p className="mt-3 text-base font-medium text-ink">{ut(`soon.planned.${phase}`)}</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:border-slate-400"
      >
        {ut('soon.back')}
      </button>
    </section>
  )
}
