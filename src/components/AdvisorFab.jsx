import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { track } from '../lib/track'
import { runAdvisorTool } from '../lib/advisorTools'
import { money } from '../lib/format'

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
const MAX_TOOL_ROUNDTRIPS = 3

export default function AdvisorFab({ context, values, compare, surface = 'phase1', onApplyScenario, inline = false }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [consented, setConsented] = useState(false)
  const [messages, setMessages] = useState([]) // {role, content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [mock, setMock] = useState(false)
  const [scenario, setScenario] = useState(null) // {label, overrides, maxPrice} — preview only

  if (!context) return null

  /** Human label for a Compare side key ("own" → "owning"). */
  const sideLabel = (key) => (key ? t(`compare.win.${key}`) : '')
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
    if (mode === 'plan') {
      return d
        ? `(Preview) Illustrative roadmap to ${money(d.price)}: close the ~${money(d.equityGap)} equity gap by saving steadily, max your Pillar 3a (counts as hard equity), and revisit the affordability ratio. Connect an API key for a tailored plan.`
        : '(Preview) Enter a dream price and I\'ll outline a savings roadmap.'
    }
    return d
      ? `(Preview) Your max today is ${money(context.maxPrice)} vs a ${money(d.price)} goal — a ~${money(d.equityGap)} equity gap. Connect an API key for live, tailored answers.`
      : `(Preview) Your current max is ${money(context.maxPrice)}. Connect an API key for live answers.`
  }

  /** POST one leg of the conversation. Throws to trigger the offline fallback. */
  async function post(history, mode) {
    const res = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ context, messages: history, mode, surface }),
    })
    const ct = res.headers.get('content-type') || ''
    if (!res.ok || !ct.includes('application/json')) throw new Error('no-api')
    return res.json()
  }

  async function send(text, mode) {
    const userMsg = mode === 'plan' ? { role: 'user', content: t('advisor.planButton') } : { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setBusy(true)
    track('advisor_message_sent', { mode: mode === 'plan' ? 'plan' : 'chat' })

    let reply = ''
    let isMock = false
    try {
      // --- the agent loop ---------------------------------------------------
      // Keep going while the model asks for a calculation, up to a hard cap so
      // a model that keeps probing can't spin.
      let history = next
      let data = await post(history, mode)
      isMock = !!data.mock

      for (let hop = 0; data.stop === 'tool_use' && hop < MAX_TOOL_ROUNDTRIPS; hop++) {
        const results = []
        for (const call of data.toolUse || []) {
          // The engine runs HERE, in the browser, on the user's own numbers.
          const outcome = runAdvisorTool(call.name, call.input, { values: values || {}, compare })
          track('advisor_tool_run', { tool: call.name, ok: outcome.ok })
          if (outcome.ok && outcome.scenario) setScenario(outcome.scenario)
          results.push({
            type: 'tool_result',
            tool_use_id: call.id,
            // lib/ is pure and has no i18n, so it returns model-side keys
            // ("own", "buyLater"). Translate them here so the model writes the
            // user's own words back to them, in their own language.
            content: JSON.stringify(withLabels(outcome.content)),
            ...(outcome.ok ? {} : { is_error: true }),
          })
        }
        history = [...history, { role: 'assistant', content: data.assistant }, { role: 'user', content: results }]
        data = await post(history, mode)
        isMock = isMock || !!data.mock
      }

      reply = data.reply || t('advisor.errorNote')
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
  const starters =
    surface === 'compare'
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
                <button type="button" onClick={() => setConsented(true)} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-on-primary transition hover:bg-teal-700">
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
                        {t('advisor.planButton')}
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

      {/* FAB */}
      <button
        type="button"
        onClick={() => {
          if (!open) track('advisor_opened', undefined, { once: true })
          setOpen(!open)
        }}
        aria-label={t('advisor.fabLabel')}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-on-primary shadow-lg transition hover:bg-teal-700"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 20l1.4-4.2A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        </svg>
      </button>
    </div>
  )
}
