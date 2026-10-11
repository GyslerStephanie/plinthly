import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { marketList, marketName } from '../markets'
import { useMarket } from '../markets/MarketContext'
import { ut } from '../markets/us/copy'

/**
 * Header country switcher — top-right, next to the language selector (spec
 * decision: where people look for locale settings). Shows the current country;
 * opens a short list. Picking another country asks to confirm first, because
 * switching clears the visitor's numbers (rules differ, inputs must not mix).
 */
export default function CountrySwitcher({ onSwitch }) {
  const { lang } = useI18n()
  const { market } = useMarket()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null) // market the visitor picked, awaiting confirm
  const rootRef = useRef(null)
  const name = (m) => marketName(m, lang)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    setPending(null)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={ut('switcher.label', { name: name(market) })}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
      >
        <span className="ds-figure text-teal-800">{market.countryCode}</span>
        <span className="hidden sm:inline">{name(market)}</span>
        <span aria-hidden="true" className="text-muted">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-40 w-72 rounded-xl border border-line bg-card p-1.5 shadow-lg">
          {pending ? (
            <div className="p-3">
              <p className="text-sm font-semibold text-ink">{ut('switcher.confirmTitle', { name: name(pending) })}</p>
              <p className="mt-1 text-sm text-body">{ut('switcher.confirmBody', { name: name(pending) })}</p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSwitch(pending.id)
                    close()
                  }}
                  className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-bold text-on-primary transition hover:bg-teal-900"
                >
                  {ut('switcher.confirmYes')}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:border-slate-400"
                >
                  {ut('switcher.confirmNo', { current: name(market) })}
                </button>
              </div>
            </div>
          ) : (
            <>
              <ul aria-label={ut('switcher.list')}>
                {marketList.map((m) => {
                  const current = m.id === market.id
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        aria-current={current ? 'true' : undefined}
                        onClick={() => (current ? close() : setPending(m))}
                        className={
                          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ' +
                          (current ? 'bg-teal-50' : 'hover:bg-surface')
                        }
                      >
                        <span className="ds-figure w-6 text-xs font-medium text-teal-800">{m.countryCode}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">{name(m)}</span>
                          <span className="block text-xs text-muted">{ut(`switcher.detail.${m.id}`)}</span>
                        </span>
                        {current && <span className="text-teal-800" aria-hidden="true">✓</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-1 border-t border-line px-2.5 pb-1.5 pt-2 text-xs text-muted">{ut('switcher.note')}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
