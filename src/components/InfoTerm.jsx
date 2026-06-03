import { useId, useState } from 'react'

/**
 * Inline jargon explainer. Renders a dotted-underlined term that reveals a
 * plain-language definition on hover or focus/click. Implements the PRD's
 * "no jargon without an inline explanation" principle.
 */
export default function InfoTerm({ term, children }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="cursor-help border-b border-dotted border-teal-500 text-teal-800 hover:text-teal-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-sm"
      >
        {term}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-normal leading-relaxed text-slate-700 shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  )
}
