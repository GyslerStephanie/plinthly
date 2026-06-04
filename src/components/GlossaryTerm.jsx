import { useEffect, useId, useRef, useState } from 'react'
import glossary from '../data/glossary.json'

/**
 * Inline glossary term. Renders a dotted-underlined trigger; on click it reveals
 * a plain-language definition — a floating popover on desktop, a bottom sheet on
 * mobile. Dismisses on outside-click, Escape, or the close (×) button.
 *
 * Definitions come from src/data/glossary.json:
 *   - <GlossaryTerm id="tragbarkeit" />            ← label + definition from JSON
 *   - <GlossaryTerm term="GEAK class" def="..." /> ← explicit (used by InfoTerm)
 */
export default function GlossaryTerm({ id, term, def, children }) {
  const entry = id ? glossary[id] : null
  const label = term ?? entry?.term ?? id ?? ''
  const definition = children ?? def ?? entry?.definition ?? ''

  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const tooltipId = useId()

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // No definition on hand → render plain text rather than an empty tooltip.
  if (!definition) return <span>{label}</span>

  const header = (
    <span className="flex items-start justify-between gap-3">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Close"
        className="-mr-1 -mt-1 flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        <span aria-hidden className="text-lg leading-none">×</span>
      </button>
    </span>
  )

  return (
    <span ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="cursor-help rounded-sm border-b border-dotted border-teal-500 text-teal-800 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
      >
        {label}
      </button>

      {/*
        Both variants render when open; CSS media queries (not JS) decide which
        is visible, so it always matches the real viewport. Desktop = floating
        popover (hidden below md); mobile = bottom sheet + backdrop (hidden at md+).
      */}
      {open && (
        <>
          {/* Desktop: floating popover anchored under the term */}
          <span
            id={tooltipId}
            role="tooltip"
            className="absolute left-0 top-full z-30 mt-1.5 hidden w-72 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg md:block"
          >
            {header}
            <span className="mt-1.5 block text-sm font-normal leading-relaxed text-slate-700">
              {definition}
            </span>
          </span>

          {/* Mobile: dimmed backdrop + bottom sheet */}
          <span
            className="fixed inset-0 z-40 block bg-slate-900/40 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <span
            role="tooltip"
            className="fixed inset-x-0 bottom-0 z-50 block rounded-t-2xl border-t border-slate-200 bg-white p-5 pb-7 text-left shadow-2xl md:hidden"
          >
            {header}
            <span className="mt-2 block text-sm font-normal leading-relaxed text-slate-700">
              {definition}
            </span>
          </span>
        </>
      )}
    </span>
  )
}
