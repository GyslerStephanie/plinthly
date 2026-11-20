import { useEffect, useId, useRef, useState } from 'react'
import { money } from '../lib/format'
import { useI18n } from '../i18n/I18nContext'

// Shared custom dropdown chevron for native <select>s — the browser's native
// arrow had inconsistent spacing that clashed with the custom-styled forms.
// Pair with `appearance-none pl-3 pr-10` on the select to reserve room.
export const SELECT_CHEVRON = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236a6c5f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '16px',
}

// Cards are white on white; status is carried by dots/badges, never a fill
// (design system: "no colored backgrounds larger than a badge"). The `slate`
// tone uses the grey surface for section alternation.
const TONES = {
  default: '',
  teal: '',
  amber: '',
  slate: 'bg-surface',
}

/**
 * Title block every screen opens with — journey steps 2–5 and the tools
 * (Compare, How to build) share it, so the title sits in the same place and
 * size as you tab. `onBack` adds the small "← back" link above the title.
 */
export function PageHeader({ id, title, intro, onBack, backLabel, className = '' }) {
  return (
    <div className={`ds-page-head no-print ${className}`}>
      {onBack && (
        <button type="button" onClick={onBack} className="ds-page-back">
          ← {backLabel}
        </button>
      )}
      <h1 id={id} className="ds-page-title">{title}</h1>
      {intro && <p className="ds-page-intro">{intro}</p>}
    </div>
  )
}

/** Section heading inside a card (sans, 18px bold). */
export function SectionTitle({ children, className = '', as: Tag = 'h2' }) {
  return <Tag className={`ds-section-title ${className}`}>{children}</Tag>
}

/** Bordered content card with an optional uppercase section title. */
export function Card({ title, children, tone = 'default', className = '' }) {
  return (
    <section className={`ds-card ${TONES[tone]} ${className}`}>
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
    <div className="flex items-baseline justify-between gap-4 py-1.5" data-anchor={typeof label === 'string' ? label : undefined}>
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
      {money(band.low)} – {money(band.high)}
      {suffix}
      <span className="ml-1 text-xs text-slate-400">≈ {money(band.mid)}</span>
    </span>
  )
}

/** A small pill label. */
export function Pill({ children, tone = 'slate' }) {
  const map = {
    slate: 'bg-surface text-body',
    teal: 'bg-surface text-ink',
    amber: 'bg-warning-light text-amber-800',
    positive: 'bg-positive-light text-positive',
    info: 'bg-info-light text-info',
    warning: 'bg-warning-light text-amber-800',
    error: 'bg-error-light text-error',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  )
}

/** "Estimates, not quotes": one short line; the detail and sources sit behind (i). */
export function Indicative({ children }) {
  const { t } = useI18n()
  const label = t('indicative.short')
  return (
    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
      <span>{label}</span>
      {children && <InfoTip label={label}>{children}</InfoTip>}
    </p>
  )
}

/**
 * Info tip: a small ⓘ button that reveals helper text on hover (mouse), tap or
 * keyboard focus, instead of printing the text under every field. Closes on
 * Escape, outside click or when the pointer leaves. Content may hold links or
 * glossary terms.
 *
 * @param {string} label    What the tip is about (for the button's name).
 * @param {ReactNode} children  The helper text.
 * @param {'left'|'right'} [align]  Which edge the bubble lines up with.
 */
export function InfoTip({ label, children, align = 'left', className = '' }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  if (!children) return null
  const hoverable = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches
  return (
    <span
      ref={wrapRef}
      className={`ds-infotip ${className}`}
      onMouseEnter={() => hoverable() && setOpen(true)}
      onMouseLeave={() => hoverable() && setOpen(false)}
    >
      <button
        type="button"
        className="ds-infotip-btn"
        aria-label={t('moreInfo', { label })}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v) }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
          <path d="M8 7.3v4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <span id={id} role="tooltip" className={`ds-infotip-bubble ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </span>
      )}
    </span>
  )
}

/** A form label with its helper text behind an info tip. */
export function FieldLabel({ htmlFor, label, hint, className = '' }) {
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">{label}</label>
      {hint && <InfoTip label={label}>{hint}</InfoTip>}
    </span>
  )
}
