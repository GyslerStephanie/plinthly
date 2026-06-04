import { useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { Card } from './ui'

const GOAL_OPTIONS = [
  { value: 'first_home', key: 'feedback.goalFirstHome' },
  { value: 'renovate', key: 'feedback.goalRenovate' },
  { value: 'new_build', key: 'feedback.goalNewBuild' },
  { value: 'understand', key: 'feedback.goalUnderstand' },
  { value: 'other', key: 'feedback.goalOther' },
]

const STRATEGY_OPTIONS = [
  { value: 'yes', key: 'feedback.stratYes' },
  { value: 'maybe', key: 'feedback.stratMaybe' },
  { value: 'no', key: 'feedback.stratNo' },
]

const MAX_CHARS = 500

/** A single selectable chip in a question group. */
function Choice({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        'rounded-lg border px-3 py-2 text-sm font-medium transition ' +
        (active
          ? 'border-teal-600 bg-teal-50 text-teal-800'
          : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')
      }
    >
      {children}
    </button>
  )
}

/**
 * End-of-journey feedback. Two multiple-choice questions plus an optional free-
 * text field (max 500 chars). On submit it logs the response to the console and
 * stores it in React state (lifted to App) so it persists for the session — no
 * data is sent anywhere (v1 placeholder).
 *
 * `feedback` (object|null) is the already-submitted response, if any.
 * `onSubmit(payload)` records it at the App level.
 */
export default function FeedbackSection({ feedback, onSubmit }) {
  const { t } = useI18n()
  const [goal, setGoal] = useState('')
  const [strategy, setStrategy] = useState('')
  const [text, setText] = useState('')

  // Already submitted this session → show the thank-you confirmation.
  if (feedback) {
    return (
      <Card tone="teal" className="no-print">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-teal-600 text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{t('feedback.thanksTitle')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('feedback.thanksBody')}</p>
          </div>
        </div>
      </Card>
    )
  }

  const canSubmit = goal && strategy

  const submit = () => {
    if (!canSubmit) return
    onSubmit({
      goal,
      strategy,
      message: text.trim(),
    })
  }

  return (
    <Card title={t('feedback.title')} className="no-print">
      <p className="-mt-1 mb-4 text-sm leading-relaxed text-slate-600">{t('feedback.intro')}</p>

      {/* Q1 — main goal */}
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-medium text-slate-700">{t('feedback.q1')}</legend>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((o) => (
            <Choice key={o.value} active={goal === o.value} onClick={() => setGoal(o.value)}>
              {t(o.key)}
            </Choice>
          ))}
        </div>
      </fieldset>

      {/* Q2 — strategy interest */}
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-medium text-slate-700">{t('feedback.q2')}</legend>
        <div className="flex flex-wrap gap-2">
          {STRATEGY_OPTIONS.map((o) => (
            <Choice key={o.value} active={strategy === o.value} onClick={() => setStrategy(o.value)}>
              {t(o.key)}
            </Choice>
          ))}
        </div>
      </fieldset>

      {/* Open text */}
      <div className="mb-4">
        <label htmlFor="fbText" className="mb-1.5 block text-sm font-medium text-slate-700">
          {t('feedback.openLabel')}
        </label>
        <textarea
          id="fbText"
          value={text}
          maxLength={MAX_CHARS}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          placeholder={t('feedback.openPlaceholder')}
          className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
        <p className="mt-1 text-right text-xs text-slate-400">
          {t('feedback.charsLeft', { n: MAX_CHARS - text.length })}
        </p>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('feedback.submit')}
      </button>
    </Card>
  )
}
