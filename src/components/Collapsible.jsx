import { useState } from 'react'

/**
 * Progressive-disclosure accordion. Drop-in sibling of `Card` (same `title` +
 * children API) but collapsed by default — the header toggles the body. Drives
 * all the deep-detail sections so the result stays light upfront (spec §5).
 *
 * @param {string} title          Uppercase section label (matches Card titles).
 * @param {boolean} [defaultOpen] Start expanded (default false).
 * @param {string} [sub]          Optional one-line preview shown next to the title.
 */
export default function Collapsible({ title, sub, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-surface"
      >
        <span className="flex items-baseline gap-2">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            {title}
          </span>
          {sub && <span className="text-xs text-muted/80">{sub}</span>}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden
          className={'flex-none text-muted transition-transform ' + (open ? 'rotate-180' : '')}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {/* Always in the DOM; `collapsible-body` is force-expanded in print CSS. */}
      <div className={(open ? 'block' : 'hidden') + ' collapsible-body px-5 pb-5'}>{children}</div>
    </section>
  )
}
