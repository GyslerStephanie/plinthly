import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { marketList, marketName } from '../markets'
import { useMarket } from '../markets/MarketContext'

/**
 * Country + language in one header menu (top-right, where people look for
 * locale settings). The button shows "US · EN"; the panel has two sections.
 * Language switches at once. Country asks to confirm first, because switching
 * clears the visitor's numbers (rules differ, inputs must never mix).
 *
 * @param {(id: string) => void} onSwitch  Apply a country change (App resets inputs).
 * @param {Array<{code, short, label}>} languages  The current market's languages.
 */
export default function LocaleMenu({ onSwitch, languages }) {
  const { t, lang, setLang } = useI18n()
  const { market } = useMarket()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null) // country awaiting confirm
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const confirmRef = useRef(null)
  const name = (m) => marketName(m, lang)
  // Country name as a template needs it ("zur Schweiz", "aux États-Unis");
  // falls back to the bare name for a market without forms.
  const form = (m, k) => {
    const key = `locale.forms.${m.id}.${k}`
    const s = t(key)
    return s === key ? name(m) : s
  }
  const current = languages.find((l) => l.code === lang) || languages[0]

  // Focus goes back to the menu button, so keyboard users aren't dropped on <body>.
  const close = (refocus = true) => {
    setOpen(false)
    setPending(null)
    if (refocus) buttonRef.current?.focus()
  }

  // The confirm view replaces the list: move focus into it.
  useEffect(() => {
    if (pending) confirmRef.current?.focus()
  }, [pending])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => rootRef.current && !rootRef.current.contains(e.target) && close(false)
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const detail = (m) => t(m.id === 'us' ? 'locale.detailUs' : 'locale.detailCh')

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('locale.button', { country: name(market), language: current.label })}
        onClick={() => (open ? close() : setOpen(true))}
        className={
          'flex items-center gap-2 rounded-full border bg-white py-1.5 pl-2.5 pr-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-100 ' +
          (open ? 'border-teal-600' : 'border-slate-300')
        }
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-teal-700">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
        <span className="ds-figure tracking-wide text-ink">
          {market.countryCode}
          <span className="mx-1 text-slate-300">·</span>
          {current.short}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={'text-muted transition ' + (open ? 'rotate-180' : '')}>
          <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-label={t('locale.button', { country: name(market), language: current.label })} className="absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-card shadow-[var(--shadow-float)]">
          {pending ? (
            <div className="p-4">
              <p className="text-sm font-semibold text-ink">{t('locale.confirmTitle', { name: name(pending), to: form(pending, 'to') })}</p>
              <p className="mt-1 text-sm text-body">{t('locale.confirmBody', { name: name(pending), of: form(pending, 'of') })}</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={() => {
                    onSwitch(pending.id)
                    close()
                  }}
                  className="rounded-lg bg-teal-800 px-3 py-2.5 text-sm font-bold text-on-primary transition hover:bg-teal-900"
                >
                  {t('locale.confirmYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="rounded-lg border border-line px-3 py-2.5 text-sm text-ink transition hover:border-slate-400"
                >
                  {t('locale.confirmNo', { current: name(market), stay: form(market, 'stay') })}
                </button>
              </div>
            </div>
          ) : (
            <>
              <section className="p-2">
                <p className="ds-eyebrow px-2.5 pb-1.5 pt-2 text-[11px] text-muted">{t('locale.country')}</p>
                <ul>
                  {marketList.map((m) => {
                    const on = m.id === market.id
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          aria-current={on ? 'true' : undefined}
                          onClick={() => (on ? null : setPending(m))}
                          className={'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ' + (on ? 'bg-teal-50' : 'hover:bg-surface')}
                        >
                          <span
                            className={
                              'ds-figure flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-medium ' +
                              (on ? 'bg-teal-800 text-on-primary' : 'bg-surface text-body')
                            }
                            aria-hidden="true"
                          >
                            {m.countryCode}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-ink">{name(m)}</span>
                            <span className="block text-xs text-muted">{detail(m)}</span>
                          </span>
                          {on && <span className="text-teal-800" aria-hidden="true">✓</span>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section className="border-t border-line p-2">
                <p className="ds-eyebrow px-2.5 pb-1.5 pt-2 text-[11px] text-muted">{t('locale.language')}</p>
                <div className="grid grid-cols-2 gap-1.5 px-1 pb-1">
                  {languages.map((l) => {
                    const on = l.code === lang
                    return (
                      <button
                        key={l.code}
                        type="button"
                        aria-pressed={on}
                        onClick={() => {
                          setLang(l.code)
                          close()
                        }}
                        className={
                          'flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-sm transition ' +
                          (on ? 'border-teal-600 bg-teal-50 font-semibold text-ink' : 'border-line text-body hover:border-slate-400')
                        }
                      >
                        <span>{l.label}</span>
                        <span className="ds-figure text-[11px] text-muted">{l.short}</span>
                      </button>
                    )
                  })}
                </div>
                {languages.length === 1 && <p className="px-2.5 pb-2 pt-1 text-xs text-muted">{t('locale.onlyLanguage')}</p>}
              </section>

              <p className="border-t border-line bg-surface px-4 py-2.5 text-[11px] leading-snug text-muted">{t('locale.note')}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
