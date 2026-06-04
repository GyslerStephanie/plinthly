import { chf } from '../lib/format'

const TONES = {
  default: 'border-slate-200 bg-white',
  teal: 'border-teal-200 bg-teal-50/60',
  amber: 'border-amber-200 bg-amber-50/60',
  slate: 'border-slate-200 bg-slate-50',
}

/** Bordered content card with an optional uppercase section title. */
export function Card({ title, children, tone = 'default', className = '' }) {
  return (
    <section className={`rounded-xl border p-5 shadow-sm ${TONES[tone]} ${className}`}>
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h3>
      )}
      {children}
    </section>
  )
}

/** Label/value line used across the result panels. */
export function Row({ label, value, sub, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span
        className={
          'text-sm ' + (strong ? 'font-semibold text-slate-900' : 'text-slate-600')
        }
      >
        {label}
        {sub && <span className="ml-1 text-xs text-slate-400">{sub}</span>}
      </span>
      <span
        className={
          'tabular-nums ' +
          (strong
            ? 'text-base font-semibold text-slate-900'
            : 'text-sm text-slate-700')
        }
      >
        {value}
      </span>
    </div>
  )
}

/** Render a {low, mid, high} CHF band as "CHF low – high (≈ mid)". */
export function RangeValue({ band, suffix = '' }) {
  if (!band) return <span>—</span>
  return (
    <span className="tabular-nums">
      {chf(band.low)} – {chf(band.high)}
      {suffix}
      <span className="ml-1 text-xs text-slate-400">≈ {chf(band.mid)}</span>
    </span>
  )
}

/** A small pill label. */
export function Pill({ children, tone = 'slate' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-600',
    teal: 'bg-teal-100 text-teal-700',
    amber: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  )
}

/** "Indicative — not a quote" disclaimer line. */
export function Indicative({ children }) {
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-slate-400">
      <span aria-hidden>ⓘ</span>
      <span>{children || 'Indicative ranges only — not live listings or a quote.'}</span>
    </p>
  )
}
