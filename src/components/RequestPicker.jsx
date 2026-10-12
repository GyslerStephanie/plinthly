import { useEffect, useId, useRef, useState } from 'react'

/**
 * "My X isn't listed": a small secondary link that reveals a labelled <select>.
 * Picking an option calls onPick(value) and shows a thank-you line in a
 * role="status" region. It never changes the app's state by itself; the
 * caller only records demand (an anonymous analytics event).
 *
 * Focus: revealing moves focus to the select; the status region is rendered
 * empty from the start so screen readers announce the thank-you when it lands.
 */
export default function RequestPicker({ linkText, label, placeholder, options, thanks, onPick, className = '' }) {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState('')
  const selectRef = useRef(null)
  const id = useId()
  const panelId = `${id}-panel`
  const selectId = `${id}-select`

  useEffect(() => {
    if (open) selectRef.current?.focus()
  }, [open])

  const onChange = (e) => {
    const v = e.target.value
    setPicked(v)
    if (v) onPick(v)
  }

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-muted underline underline-offset-4 transition hover:text-ink"
      >
        {linkText}
      </button>
      <div id={panelId} hidden={!open} className="mt-2">
        <label htmlFor={selectId} className="block text-sm font-medium text-ink">
          {label}
        </label>
        <select
          ref={selectRef}
          id={selectId}
          value={picked}
          onChange={onChange}
          className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p role="status" className="mt-2 text-sm text-teal-800">
          {picked ? thanks : ''}
        </p>
      </div>
    </div>
  )
}
