import { useState } from 'react'
import { money } from '../../lib/format'
import { buildUsActionPlan } from '../../markets/us/plan'
import { ut } from '../../markets/us/copy'
import { selectedUsMeasures } from './UsOptionsPhase'
import { track } from '../../lib/track'

/** US Phase 5 — personalised action plan. Steps come from src/markets/us/plan.js. */

const num = (v) => Number(String(v ?? '').replace(/[^0-9.]/g, '')) || 0
const TONE = {
  amber: 'border-amber-200 bg-amber-50',
  teal: 'border-teal-200 bg-teal-50/60',
  default: 'border-slate-200 bg-white',
}

export default function UsPlanPhase({ result, explore, region, shareUrl }) {
  const [copied, setCopied] = useState(false)
  const budget = num(explore.budget) || result.maxPrice
  const steps = buildUsActionPlan({
    result,
    state: region,
    budget,
    option: explore.chosenOption || undefined,
    measures: selectedUsMeasures(explore.measures),
  })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      track('result_shared', { method: 'link' })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt?.('', shareUrl)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">{ut('plan.max')}</p>
          <p className="ds-figure mt-1 text-xl font-medium text-ink">{money(result.maxPrice)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{ut('plan.budget')}</p>
          <p className="ds-figure mt-1 text-xl font-medium text-ink">{money(budget)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{ut('plan.route')}</p>
          <p className="mt-1 text-base font-semibold text-ink">
            {explore.chosenOption ? ut(`plan.routes.${explore.chosenOption}`) : ut('plan.noRoute')}
          </p>
        </div>
      </section>

      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className={'rounded-xl border p-5 ' + TONE[s.tone]}>
            <div className="flex gap-4">
              <span className="ds-figure flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-800 text-sm font-semibold text-on-primary">{i + 1}</span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-body">{s.body}</p>
                {s.links.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {s.links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="font-medium">{l.label} →</a>
                    ))}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
        <span aria-hidden>ⓘ</span>
        <span>{ut('plan.disclaimer')}</span>
      </p>

      <div className="flex flex-wrap gap-3 no-print">
        <button type="button" onClick={copy} className="rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition hover:border-slate-400">
          {copied ? '✓ ' + ut('plan.copied') : ut('plan.share')}
        </button>
        <button type="button" onClick={() => {
            track('result_shared', { method: 'pdf' })
            window.print()
          }} className="rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium text-ink transition hover:border-slate-400">
          {ut('plan.print')}
        </button>
      </div>
    </div>
  )
}
