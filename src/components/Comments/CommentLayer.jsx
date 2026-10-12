import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/I18nContext'
import { runAdvisorTurn } from '../../lib/advisorClient'
import { track } from '../../lib/track'

/**
 * Comment layer — ask the advisor on the figure (docs/specs/COMMENT_LAYER_SPEC.md).
 *
 * Press "Comment", click anywhere: a numbered pin anchors to the nearest
 * `[data-anchor]` element (a figure row, the headline price) or the nearest
 * card, and a thread opens beside it. The advisor answers through the same
 * agent loop as the bubble (lib/advisorClient.js) with the pinned figure added
 * to the context. Threads live in component state only, like the bubble's chat.
 *
 * Pins follow their element: positions are recomputed from the element's rect
 * on scroll and resize, so a pin stays on its row when the layout moves.
 *
 * @param {object|null} context   Advisor context (buildAdvisorContext / buildUsAdvisorContext).
 * @param {object} [values]       Form values the tools recompute from.
 * @param {string} screen         Human label of the screen, for the model.
 * @param {boolean} consented     Shared consent gate (owned by App).
 * @param {() => void} onConsent
 */

const MAX_COMMENTS = 20
const POP_W = 340

/** Nearest commentable element for a click, with its label and current value. */
function resolveAnchor(target, fallbackLabel) {
  const el = target.closest('[data-anchor]') || target.closest('section, .card, article') || null
  if (!el) return { el: null, label: fallbackLabel, value: null }
  if (el.dataset && el.dataset.anchor) return { el, label: el.dataset.anchor, value: readValue(el) }
  const h = el.querySelector('h1, h2, h3, [class*="eyebrow"]')
  return { el, label: (h && h.textContent.trim().slice(0, 80)) || fallbackLabel, value: null }
}

function readValue(el) {
  if (el.dataset.anchorValue != null) return el.dataset.anchorValue
  const v = el.querySelector('.tabular-nums, .ds-figure')
  const txt = v ? v.textContent : ''
  return txt ? txt.trim().slice(0, 40) : null
}

export default function CommentLayer({ context, values, screen, consented, onConsent, surface = 'phase1' }) {
  const { t } = useI18n()
  const [threads, setThreads] = useState([]) // {id, n, label, value, askedValue, msgs, resolved, busy, mock, error, ox, oy}
  const [active, setActive] = useState(null)
  const [commenting, setCommenting] = useState(false)
  const [panel, setPanel] = useState(false)
  const [showResolved, setShowResolved] = useState(false)
  const [filter, setFilter] = useState('all')
  const [, setTick] = useState(0)
  const els = useRef(new Map()) // thread id → anchored element (DOM, not state)
  const nextId = useRef(1)
  const [slot, setSlot] = useState(null)

  // Header slot for the toolbar (App renders <div id="comment-toolbar" />).
  useEffect(() => { setSlot(document.getElementById('comment-toolbar')) }, [])

  // Re-layout pins on scroll and resize (rAF-throttled).
  useEffect(() => {
    let raf = 0
    const bump = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; setTick((x) => x + 1) }) }
    window.addEventListener('scroll', bump, true)
    window.addEventListener('resize', bump)
    const id = setInterval(bump, 1000) // values re-render without a scroll; cheap
    return () => { window.removeEventListener('scroll', bump, true); window.removeEventListener('resize', bump); clearInterval(id); if (raf) cancelAnimationFrame(raf) }
  }, [])

  // Comment mode: capture the next click anywhere, stop it reaching the page.
  useEffect(() => {
    if (!commenting) return undefined
    const onClick = (e) => {
      if (e.target.closest('[data-comment-ui]')) return
      e.preventDefault()
      e.stopPropagation()
      if (threads.length >= MAX_COMMENTS) { setCommenting(false); return }
      const { el, label, value } = resolveAnchor(e.target, t('comments.screenFallback'))
      const r = el ? el.getBoundingClientRect() : { left: e.clientX, top: e.clientY }
      const id = nextId.current++
      if (el) els.current.set(id, el)
      const th = { id, n: threads.length + 1, label, value, askedValue: null, msgs: [], resolved: false, busy: false, mock: false, error: false, ox: e.clientX - r.left, oy: e.clientY - r.top, fx: e.clientX + window.scrollX, fy: e.clientY + window.scrollY }
      setThreads((ts) => [...ts, th])
      setActive(id)
      setCommenting(false)
      track('comment_pinned', { anchored: !!el })
    }
    const onKey = (e) => { if (e.key === 'Escape') setCommenting(false) }
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey) }
  }, [commenting, threads.length, t])

  // Escape closes the open thread; a click outside it too.
  useEffect(() => {
    if (active == null) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setActive(null) }
    const onDown = (e) => { if (!e.target.closest('[data-comment-ui]')) setActive(null) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [active])

  /** Screen position of a thread's pin (fixed coordinates). */
  const pinPos = useCallback((th) => {
    const el = els.current.get(th.id)
    if (el && el.isConnected) {
      const r = el.getBoundingClientRect()
      return { x: r.left + th.ox, y: r.top + th.oy }
    }
    return { x: th.fx - window.scrollX, y: th.fy - window.scrollY }
  }, [])

  /** The anchored figure as it reads now (null when not anchored or gone). */
  const currentValue = (th) => {
    const el = els.current.get(th.id)
    return el && el.isConnected && el.dataset ? readValue(el) : th.value
  }

  const update = (id, patch) => setThreads((ts) => ts.map((x) => (x.id === id ? { ...x, ...(typeof patch === 'function' ? patch(x) : patch) } : x)))

  async function post(id, text) {
    const th = threads.find((x) => x.id === id)
    if (!th || !text.trim() || th.busy || !context) return
    const value = currentValue(th)
    const next = [...th.msgs, { role: 'user', content: text.trim() }]
    update(id, { msgs: next, busy: true, error: false, askedValue: value, value })
    track('comment_message_sent', { first: th.msgs.length === 0 })
    const ctx = { ...context, anchor: { label: th.label, value, screen } }
    let reply = null
    let mock = false
    let error = false
    try {
      const turn = await runAdvisorTurn({ context: ctx, messages: next, surface, values, onToolRun: ({ name, ok }) => track('advisor_tool_run', { tool: name, ok }) })
      reply = turn.reply
      mock = turn.mock
      error = turn.error || !reply
    } catch {
      error = true
    }
    update(id, (x) => ({ busy: false, mock, error, msgs: error ? x.msgs : [...x.msgs, { role: 'assistant', content: reply }] }))
    if (!error) track('comment_answered', { mock })
  }

  const resolve = (id) => { update(id, { resolved: true }); setActive(null); track('comment_resolved') }
  const reopen = (id) => { update(id, { resolved: false }); setActive(id) }
  const remove = (id) => { setThreads((ts) => ts.filter((x) => x.id !== id).map((x, i) => ({ ...x, n: i + 1 }))); els.current.delete(id); setActive(null) }
  const jump = (id) => {
    const th = threads.find((x) => x.id === id)
    if (th && th.resolved) setShowResolved(true)
    setActive(id)
    const el = els.current.get(id)
    if (el && el.isConnected) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  if (!context) return null

  const openCount = threads.filter((x) => !x.resolved && x.msgs.length).length
  const act = active != null ? threads.find((x) => x.id === active) : null
  const shown = threads.filter((x) => (filter === 'all' ? true : filter === 'open' ? !x.resolved : x.resolved))

  const toolbar = (
    <div className="flex items-center gap-2" data-comment-ui>
      <button
        type="button"
        onClick={() => setPanel((p) => !p)}
        aria-expanded={panel}
        aria-controls="comment-panel"
        className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-body transition hover:border-ink"
      >
        {t('comments.panelButton', { n: openCount })}
      </button>
      <button
        type="button"
        onClick={() => { setActive(null); setCommenting((c) => !c) }}
        aria-pressed={commenting}
        className={'rounded-full px-3 py-1.5 text-xs font-bold transition ' + (commenting ? 'bg-ink text-on-dark' : 'bg-coral-400 text-on-accent hover:bg-coral-500')}
        style={commenting ? undefined : { background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
      >
        {commenting ? '× ' + t('comments.cancel') : '+ ' + t('comments.button')}
      </button>
    </div>
  )

  return (
    <div className="no-print">
      {slot ? createPortal(toolbar, slot) : <div className="fixed right-5 top-3 z-40">{toolbar}</div>}

      {/* Comment mode: crosshair + hint */}
      {commenting && (
        <>
          <style>{'body, body * { cursor: crosshair !important }'}</style>
          <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-on-dark shadow-lg" data-comment-ui>
            {t('comments.hint')}
          </div>
        </>
      )}

      {/* Pins */}
      {threads.map((th) => {
        if (th.resolved && !showResolved) return null
        const p = pinPos(th)
        const answered = th.msgs.some((m) => m.role === 'assistant')
        const changed = th.askedValue != null && currentValue(th) !== th.askedValue
        return (
          <button
            key={th.id}
            type="button"
            data-comment-ui
            onClick={() => setActive(active === th.id ? null : th.id)}
            aria-label={t('comments.pinLabel', { n: th.n, anchor: th.label })}
            className={
              'fixed z-40 flex h-7 w-7 items-center justify-center border-2 border-white text-xs font-bold shadow-md transition ' +
              (th.resolved ? 'bg-white text-moss-700' : answered ? 'text-on-primary' : 'text-on-accent') +
              (active === th.id ? ' ring-2 ring-teal-200' : '')
            }
            style={{
              left: p.x - 4,
              top: p.y - 28,
              borderRadius: '999px 999px 999px 4px',
              background: th.resolved ? 'var(--surface-card)' : answered ? 'var(--surface-moss)' : 'var(--color-accent)',
              color: th.resolved ? 'var(--color-success-ink)' : undefined,
              outline: changed ? '2px solid var(--color-warning)' : undefined,
            }}
          >
            {th.resolved ? '✓' : th.n}
          </button>
        )
      })}

      {/* Thread popover */}
      {act && (() => {
        const p = pinPos(act)
        // Beside the pin, inside the viewport: below it when there is room,
        // otherwise pushed up so the whole popover stays on screen.
        const popH = Math.min(520, Math.round(window.innerHeight * 0.7))
        const left = Math.max(8, Math.min(p.x + 14, window.innerWidth - POP_W - 8))
        const top = Math.max(8, Math.min(p.y + 6, window.innerHeight - popH - 8))
        const now = currentValue(act)
        const changed = act.askedValue != null && now !== act.askedValue
        return (
          <div
            data-comment-ui
            role="dialog"
            aria-label={t('comments.commentN', { n: act.n })}
            className="fixed z-50 flex flex-col rounded-2xl border border-line bg-card p-3.5 text-sm shadow-xl"
            style={{ left, top, width: Math.min(POP_W, window.innerWidth - 16), maxHeight: 'min(70vh, 520px)' }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="ds-eyebrow text-[10px] text-moss-700" style={{ color: 'var(--color-success-ink)' }}>
                {t('comments.commentN', { n: act.n })}{act.resolved ? ' · ' + t('comments.resolved') : ''}
              </span>
              <span className="flex items-center gap-1">
                {act.msgs.length > 0 && !act.resolved && (
                  <button type="button" onClick={() => resolve(act.id)} className="rounded-full border border-line px-2.5 py-1 text-xs text-body hover:border-ink">{t('comments.resolve')}</button>
                )}
                {act.resolved && (
                  <button type="button" onClick={() => reopen(act.id)} className="rounded-full border border-line px-2.5 py-1 text-xs text-body hover:border-ink">{t('comments.reopen')}</button>
                )}
                <button type="button" onClick={() => setActive(null)} aria-label={t('comments.close')} className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-sm text-muted hover:border-ink hover:text-ink">×</button>
              </span>
            </div>
            <div className="mb-2 rounded-md bg-surface px-2 py-1.5 text-xs text-muted">
              ● {t('comments.pinnedTo')} <span className="text-ink">{act.label}</span>{now != null && <span className="font-semibold text-ink"> · {now}</span>}
            </div>
            {changed && (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-warning-light px-2 py-1.5 text-xs text-amber-900">
                <span>{t('comments.changed', { old: act.askedValue, now })}</span>
                <button type="button" onClick={() => { const q = act.msgs.find((m) => m.role === 'user'); update(act.id, { resolved: false }); if (q) post(act.id, q.content) }} className="rounded-full border border-amber-300 px-2 py-0.5 text-xs">{t('comments.askAgain')}</button>
              </div>
            )}
            {!consented ? (
              <div className="rounded-lg border border-dashed border-line-strong p-3 text-xs leading-relaxed text-body">
                <p className="font-semibold text-ink">{t('comments.consentTitle')}</p>
                <p className="mt-1">{t('comments.consentBody')}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={onConsent} className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-teal-700">{t('comments.consentAccept')}</button>
                  <button type="button" onClick={() => remove(act.id)} className="rounded-full border border-line px-3 py-1.5 text-xs text-body hover:border-ink">{t('comments.consentDecline')}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
                  {act.msgs.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                      <span className={'inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ' + (m.role === 'user' ? 'bg-ink text-on-dark' : 'bg-surface text-ink')}>{m.content}</span>
                    </div>
                  ))}
                  {act.busy && <p className="text-xs text-muted">{t('comments.thinking')}</p>}
                  {act.error && !act.busy && <p className="text-xs text-error">{t('comments.errorNote')}</p>}
                  {act.mock && !act.busy && !act.error && <p className="text-xs italic text-muted">{t('comments.mockNote')}</p>}
                </div>
                {!act.resolved && (
                  <form
                    className="mt-2 border-t border-line pt-2"
                    onSubmit={(e) => { e.preventDefault(); const ta = e.currentTarget.elements.body; post(act.id, ta.value); ta.value = '' }}
                  >
                    <textarea
                      name="body"
                      id={`comment-body-${act.id}`}
                      rows={2}
                      autoFocus
                      placeholder={t('comments.placeholder')}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form.requestSubmit() } }}
                      className="w-full resize-y rounded-lg border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
                    />
                    <div className="mt-1.5 flex justify-end">
                      <button type="submit" disabled={act.busy} className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-teal-700 disabled:opacity-40">
                        {act.msgs.length ? t('comments.reply') : t('comments.post')}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* Comments panel */}
      <aside
        id="comment-panel"
        data-comment-ui
        aria-label={t('comments.panelTitle')}
        aria-hidden={!panel}
        className="fixed bottom-0 right-0 top-0 z-50 w-[22rem] max-w-full overflow-y-auto border-l border-line bg-card p-4 text-sm shadow-xl transition-transform"
        style={{ transform: panel ? 'none' : 'translateX(100%)' }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-display text-base font-semibold text-ink">{t('comments.panelTitle')}</p>
          <span className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> {t('comments.showResolved')}
            </label>
            <button type="button" onClick={() => setPanel(false)} aria-label={t('comments.close')} className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted hover:border-ink hover:text-ink">×</button>
          </span>
        </div>
        <div className="mb-2 flex gap-1.5" role="tablist">
          {['all', 'open', 'resolved'].map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={'rounded-full border px-2.5 py-1 text-xs ' + (filter === f ? 'border-teal-600 bg-teal-50 font-medium text-teal-800' : 'border-line text-muted hover:border-ink')}>
              {t(`comments.filter${f[0].toUpperCase()}${f.slice(1)}`)}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="text-xs text-muted">{threads.length ? t('comments.emptyFilter') : t('comments.empty')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((th) => {
              const answered = th.msgs.some((m) => m.role === 'assistant')
              const changed = th.askedValue != null && currentValue(th) !== th.askedValue
              return (
                <li key={th.id}>
                  <button type="button" onClick={() => jump(th.id)} className="flex w-full items-start gap-2 py-2 text-left hover:bg-surface">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: th.resolved ? 'var(--surface-sunken)' : answered ? 'var(--surface-moss)' : 'var(--color-accent)', color: th.resolved ? 'var(--color-success-ink)' : '#fff' }}>
                      {th.resolved ? '✓' : th.n}
                    </span>
                    <span className="min-w-0">
                      <span className={'block truncate ' + (th.resolved ? 'text-muted' : 'text-ink')}>{th.msgs.length ? th.msgs[0].content : <i>{t('comments.draft')}</i>}</span>
                      <span className="block text-[11px] text-muted">
                        {th.label}{th.value ? ' · ' + th.value : ''}{answered ? ' · ' + t('comments.answered') : ''}{changed ? ' · ' + t('comments.changedShort') : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>
    </div>
  )
}
