import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { track } from '../lib/track'

/**
 * Floating "Ask the advisor" button + chat drawer (Push 2).
 *
 * - One-time consent gate before any call (privacy: numbers leave the browser).
 * - Grounded Q&A + a one-click savings-plan generator (mode:'plan').
 * - Calls /api/advisor (serverless proxy). In local dev there is no function, so
 *   it falls back to a client-side mock; on Vercel the function's mock runs until
 *   ANTHROPIC_API_KEY is set, then answers are live.
 * - No storage: consent + history live in component state only.
 *
 * @param {object|null} context  Non-PII computed context (buildAdvisorContext).
 */
export default function AdvisorFab({ context }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [consented, setConsented] = useState(false)
  const [messages, setMessages] = useState([]) // {role, content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [mock, setMock] = useState(false)

  if (!context) return null

  const chf = (n) => 'CHF ' + Math.round(Number(n) || 0).toLocaleString('de-CH')
  const clientMock = (mode) => {
    const d = context.dream
    if (mode === 'plan') {
      return d
        ? `(Preview) Illustrative roadmap to ${chf(d.price)}: close the ~${chf(d.equityGap)} equity gap by saving steadily, max your Pillar 3a (counts as hard equity), and revisit the affordability ratio. Connect an API key for a tailored plan.`
        : '(Preview) Enter a dream price and I\'ll outline a savings roadmap.'
    }
    return d
      ? `(Preview) Your max today is ${chf(context.maxPrice)} vs a ${chf(d.price)} goal — a ~${chf(d.equityGap)} equity gap. Connect an API key for live, tailored answers.`
      : `(Preview) Your current max is ${chf(context.maxPrice)}. Connect an API key for live answers.`
  }

  async function send(text, mode) {
    const userMsg = mode === 'plan' ? { role: 'user', content: t('advisor.planButton') } : { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setBusy(true)
    track('advisor_message_sent', { mode: mode === 'plan' ? 'plan' : 'chat' })
    let reply = '', isMock = false
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context, messages: next, mode }),
      })
      const ct = res.headers.get('content-type') || ''
      if (!res.ok || !ct.includes('application/json')) throw new Error('no-api')
      const data = await res.json()
      reply = data.reply || t('advisor.errorNote')
      isMock = !!data.mock
    } catch {
      reply = clientMock(mode)
      isMock = true
    }
    setMock(isMock)
    setMessages((m) => [...m, { role: 'assistant', content: reply }])
    setBusy(false)
  }

  const starters = [t('advisor.starter1'), t('advisor.starter2'), t('advisor.starter3')]

  return (
    <div className="fixed bottom-5 right-5 z-50 no-print">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img src="/brand/plinthly-mark.png" alt="" className="h-7 w-7" style={{ imageRendering: 'pixelated' }} />
              <div>
                <p className="font-display text-sm font-semibold text-ink">{t('advisor.title')}</p>
                <p className="text-xs text-muted">{t('advisor.subtitle')}</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={t('advisor.close')} className="text-muted hover:text-ink">✕</button>
          </div>

          {!consented ? (
            /* Consent gate */
            <div className="flex flex-1 flex-col justify-center gap-3 p-4">
              <p className="text-sm font-semibold text-ink">{t('advisor.consentTitle')}</p>
              <p className="text-sm leading-relaxed text-body">{t('advisor.consentBody')}</p>
              <div className="mt-1 flex gap-2">
                <button type="button" onClick={() => setConsented(true)} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-700">
                  {t('advisor.consentAccept')}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-body hover:border-ink">
                  {t('advisor.consentDecline')}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-body">{t('advisor.intro')}</p>
                    {starters.map((s, i) => (
                      <button key={i} type="button" onClick={() => send(s)} className="block w-full rounded-lg border border-line px-3 py-2 text-left text-sm text-ink hover:border-ink">
                        {s}
                      </button>
                    ))}
                    {context.dream && (
                      <button type="button" onClick={() => send(null, 'plan')} className="block w-full rounded-lg bg-teal-600 px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-teal-700">
                        {t('advisor.planButton')}
                      </button>
                    )}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                    <span className={'inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ' + (m.role === 'user' ? 'bg-ink text-white' : 'bg-surface text-ink')}>
                      {m.content}
                    </span>
                  </div>
                ))}
                {busy && <p className="text-sm text-muted">…</p>}
                {mock && !busy && <p className="text-xs italic text-muted">{t('advisor.mockNote')}</p>}
              </div>

              {/* Input */}
              <form
                onSubmit={(e) => { e.preventDefault(); if (input.trim() && !busy) send(input.trim()) }}
                className="flex items-center gap-2 border-t border-line p-3"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('advisor.inputPlaceholder')}
                  className="flex-1 rounded-full border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
                />
                <button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-teal-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-40">
                  {t('advisor.send')}
                </button>
              </form>
              <p className="px-3 pb-2 text-[10px] leading-snug text-muted">{t('advisor.disclaimer')}</p>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => {
          if (!open) track('advisor_opened', undefined, { once: true })
          setOpen(!open)
        }}
        aria-label={t('advisor.fabLabel')}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg transition hover:bg-teal-700"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.4-4.2A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        </svg>
      </button>
    </div>
  )
}
