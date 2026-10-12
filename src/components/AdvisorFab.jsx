import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { track } from '../lib/track'
import { runAdvisorTurn } from '../lib/advisorClient'
import { money } from '../lib/format'
import { ut } from '../markets/us/copy'

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
 * AGENT LOOP (advisor-agent v1, docs/specs/ADVISOR_AGENT_SPEC.md): when the
 * model answers with a tool_use block, we run it HERE against src/lib/ — the
 * engine never leaves the browser — and post the result back to continue the
 * turn. The model picks the inputs; lib/ produces every figure.
 *
 * The resulting scenario is a PREVIEW. It never overwrites what the user typed;
 * only an explicit "Apply" writes back through onApplyScenario.
 *
 * @param {object|null} context          Non-PII computed context (buildAdvisorContext).
 * @param {object} [values]              Phase 1 form values (base for what-ifs).
 * @param {object} [compare]              Compare dashboard state `{ scenario, inputs, year }`.
 * @param {'phase1'|'compare'} [surface]  Which screen this instance is mounted on.
 *                                        It selects the toolset server-side.
 * @param {(overrides: object) => void} [onApplyScenario]  Commit a scenario to the real inputs.
 * @param {boolean} [inline]              Mounted inside another overlay (Compare is
 *                                        `fixed inset-0 z-50`, so a second fixed
 *                                        layer at the same z-index needs to sit
 *                                        above it rather than beside it).
 */
// How long the "Ask Plinthly AI" tooltip stays up after a page load or phase change.
const TIP_MS = 8000

export default function AdvisorFab({ context, values, compare, surface = 'phase1', onApplyScenario, inline = false, tipKey, consented: consentedProp, onConsent }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  // Consent is shared with the comment layer when the App owns it; an instance
  // mounted on its own (Compare) keeps a local gate.
  const [localConsent, setLocalConsent] = useState(false)
  const consented = consentedProp ?? localConsent
  const setConsented = () => (onConsent ? onConsent() : setLocalConsent(true))
  const [messages, setMessages] = useState([]) // {role, content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [mock, setMock] = useState(false)
  const [scenario, setScenario] = useState(null) // {label, overrides, maxPrice} — preview only
  const [showTip, setShowTip] = useState(false)

  // "Ask Plinthly AI" from a glossary tooltip: open the chat with the question
  // filled in (the consent gate still applies; nothing is sent until the user does).
  useEffect(() => {
    if (tipKey === undefined) return undefined
    const onAsk = (e) => {
      setOpen(true)
      setShowTip(false)
      setInput(e.detail?.question || '')
    }
    window.addEventListener('plinthly:ask', onAsk)
    return () => window.removeEventListener('plinthly:ask', onAsk)
  }, [tipKey])

  // Re-show the tooltip on every page load and whenever `tipKey` changes (the
  // App passes the phase), for TIP_MS. Instances without a tipKey (Compare)
  // never show it.
  useEffect(() => {
    if (tipKey === undefined) return undefined
    setShowTip(true)
    const id = setTimeout(() => setShowTip(false), TIP_MS)
    return () => clearTimeout(id)
  }, [tipKey])

  if (!context) return null

  const isUs = context.market === 'us'
  /** Human label for a Compare side key ("own" → "owning"). US copy first: the
   *  US model has its own sides (cheaper, buyPrice) that only US copy names. */
  const sideLabel = (key) => {
    if (!key) return ''
    if (isUs) {
      const us = ut(`compare.win.${key}`)
      if (us !== `compare.win.${key}`) return us
    }
    return t(`compare.win.${key}`)
  }
  /** Attach readable labels to a Compare tool result before the model sees it. */
  const withLabels = (content) => {
    if (!content || !content.result) return content
    const tag = (shape) =>
      shape && {
        ...shape,
        sideA: { ...shape.sideA, label: sideLabel(shape.sideA.key) },
        sideB: { ...shape.sideB, label: sideLabel(shape.sideB.key) },
        aheadLabel: sideLabel(shape.ahead),
      }
    return { ...content, result: tag(content.result), onScreen: tag(content.onScreen) }
  }
  const clientMock = (mode) => {
    const d = context.dream
    if (isUs) {
      if (surface === 'compare') return ut('advisor.mockCompare')
      return d
        ? ut('advisor.mockDream', { max: money(context.maxPrice), price: money(d.price) })
        : ut('advisor.mock', { max: money(context.maxPrice) })
    }
    if (mode === 'plan') {
      return d
        ? `(Preview) Illustrative roadmap to ${money(d.price)}: close the ~${money(d.equityGap)} equity gap by saving steadily, max your Pillar 3a (counts as hard equity), and revisit the affordability ratio. Connect an API key for a tailored plan.`
        : '(Preview) Enter a dream price and I\'ll outline a savings roadmap.'
    }
    return d
      ? `(Preview) Your max today is ${money(context.maxPrice)} vs a ${money(d.price)} goal — a ~${money(d.equityGap)} equity gap. Connect an API key for live, tailored answers.`
      : `(Preview) Your current max is ${money(context.maxPrice)}. Connect an API key for live answers.`
  }

  async function send(text, mode) {
    const planLabel = isUs ? ut('advisor.planButton') : t('advisor.planButton')
    const userMsg = mode === 'plan' ? { role: 'user', content: planLabel } : { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setBusy(true)
    track('advisor_message_sent', { mode: mode === 'plan' ? 'plan' : 'chat' })

    let reply = ''
    let isMock = false
    try {
      // The agent loop lives in lib/advisorClient.js (shared with the comment
      // layer): the model picks the inputs, the engine runs here in the browser.
      const turn = await runAdvisorTurn({
        context, messages: next, mode, surface, values, compare,
        labelResult: withLabels,
        onScenario: setScenario,
        onToolRun: ({ name, ok }) => track('advisor_tool_run', { tool: name, ok }),
      })
      isMock = turn.mock
      reply = turn.error ? t('advisor.errorNote') : turn.reply || t('advisor.errorNote')
    } catch {
      reply = clientMock(mode)
      isMock = true
    }
    setMock(isMock)
    setMessages((m) => [...m, { role: 'assistant', content: reply }])
    setBusy(false)
  }

  // Starters are surface-specific: on Compare, the useful openers are about the
  // scenarios on screen, not about the Phase 1 equity gap.
  const starters = isUs
    ? ut(surface === 'compare' ? 'advisor.cStarters' : 'advisor.starters')
    : surface === 'compare'
      ? [t('advisor.cStarter1'), t('advisor.cStarter2'), t('advisor.cStarter3')]
      : [t('advisor.starter1'), t('advisor.starter2'), t('advisor.starter3')]

  return (
    <div className={`fixed bottom-5 right-5 no-print ${inline ? 'z-[60]' : 'z-50'}`}>
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
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
                <button type="button" onClick={() => setConsented()} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-on-primary transition hover:bg-teal-700">
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
                      <button type="button" onClick={() => send(null, 'plan')} className="block w-full rounded-lg bg-teal-600 px-3 py-2 text-left text-sm font-semibold text-on-primary transition hover:bg-teal-700">
                        {isUs ? ut('advisor.planButton') : t('advisor.planButton')}
                      </button>
                    )}
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                    <span className={'inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ' + (m.role === 'user' ? 'bg-ink text-on-dark' : 'bg-surface text-ink')}>
                      {m.content}
                    </span>
                  </div>
                ))}
                {busy && <p className="text-sm text-muted">…</p>}
                {mock && !busy && <p className="text-xs italic text-muted">{t('advisor.mockNote')}</p>}
              </div>

              {/* Scenario chip — a PREVIEW of a what-if, never auto-applied */}
              {scenario && (
                <div className="mx-3 mb-2 rounded-xl border border-teal-600/40 bg-teal-50 px-3 py-2">
                  <p className="text-xs font-semibold text-ink">
                    {scenario.label || t('advisor.scenarioLabel')} →{' '}
                    {scenario.target === 'compare'
                      ? t('advisor.scenarioAhead', { who: sideLabel(scenario.aheadKey), amount: money(scenario.gap) })
                      : scenario.headline}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted">{t('advisor.scenarioNote')}</p>
                  <div className="mt-1.5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onApplyScenario?.(scenario.overrides)
                        track('advisor_scenario_applied')
                        setScenario(null)
                      }}
                      disabled={!onApplyScenario}
                      className="rounded-full bg-teal-600 px-3 py-1 text-xs font-bold text-on-primary transition hover:bg-teal-700 disabled:opacity-40"
                    >
                      {t('advisor.scenarioApply')}
                    </button>
                    <button type="button" onClick={() => setScenario(null)} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-body hover:border-ink">
                      {t('advisor.scenarioDiscard')}
                    </button>
                  </div>
                </div>
              )}

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
                <button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-teal-600 px-3 py-2 text-sm font-bold text-on-primary transition hover:bg-teal-700 disabled:opacity-40">
                  {t('advisor.send')}
                </button>
              </form>
              <p className="px-3 pb-2 text-[10px] leading-snug text-muted">{t('advisor.disclaimer')}</p>
            </>
          )}
        </div>
      )}

      {/* "Ask Plinthly AI" tooltip — up for 8 s after each load / phase change */}
      {showTip && !open && (
        <div
          id="advisor-tip"
          role="tooltip"
          className="advisor-tip absolute bottom-[4.5rem] right-0 whitespace-nowrap rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-on-dark shadow-lg"
        >
          {t('advisorTip')}
          <span aria-hidden="true" className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 bg-ink" />
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => {
          if (!open) track('advisor_opened', undefined, { once: true })
          setShowTip(false)
          setOpen(!open)
        }}
        aria-label={t('advisor.fabLabel')}
        aria-describedby={showTip && !open ? 'advisor-tip' : undefined}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-on-primary shadow-lg transition hover:bg-teal-700"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.4-4.2A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        </svg>
      </button>
    </div>
  )
}
