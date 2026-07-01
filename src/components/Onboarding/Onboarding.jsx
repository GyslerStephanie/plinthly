import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nContext'
import { cantonOptions } from '../../lib/cantons'

/**
 * Onboarding — the "where are you?" front door.
 *
 * Five single-select radio questions (spec §3). Only Q3 (focus) is required;
 * it routes the visitor to a mental model + a destination (spec §4). Once Q3 is
 * answered a live reflective summary appears: persona chip, mirror sentence, a
 * recommended-start card with ≤3 "why" bullets (spec §5), a primary CTA, and an
 * optional feedback textarea.
 *
 * This component owns the routing/persona logic and hands App a structured
 * result via onComplete(); App applies the seeding (spec §7) and routes.
 */

// Q3 focus → persona + destination (spec §4). `dest` is consumed by App:
//   phase1 → Phase 1 · compare → Compare · dream → Phase 2 · looking → Phase 3–4
const FOCUS = {
  learn: { dest: 'phase1', personaKey: 'newcomer' },
  compare: { dest: 'compare', personaKey: 'fenceSitter' },
  afford: { dest: 'phase1', personaKey: 'planner' },
  dream: { dest: 'dream', personaKey: 'dreamer' },
  // looking persona depends on whether a city is known (Ready Explorer / Mover)
  looking: { dest: 'looking', personaKey: 'explorer' },
}

const AGE_OPTS = ['18_29', '30_39', '40_49', '50_64', '65_plus']
// Lead with the settled case — most visitors here are (or see themselves as)
// long-term, so "This is home" first keeps the question from feeling loaded.
const DUR_OPTS = ['home', 'long', '5_10', 'few']
const FOCUS_OPTS = ['learn', 'compare', 'afford', 'dream', 'looking']
const WHO_OPTS = ['national', 'expat']
const CITY_OPTS = ['area', 'region', 'notyet']

// dur → Compare default horizon (spec §7).
const DUR_HORIZON = { few: 5, '5_10': 10, long: 20, home: 25 }

const LETTERS = ['A', 'B', 'C', 'D', 'E']

/** Compose the persona-appropriate "why this fits you" bullets (spec §5). */
function buildWhy(a, t) {
  const out = []
  if (a.focus === 'dream') out.push(t('onboarding.why.dream'))
  if (a.dur === 'few' && a.focus !== 'compare') out.push(t('onboarding.why.durFew'))
  if (a.who === 'expat') out.push(t('onboarding.why.expat'))
  if (a.age === '50_64' || a.age === '65_plus') out.push(t('onboarding.why.age'))
  if (a.focus === 'looking') out.push(t('onboarding.why.looking'))
  if (a.focus === 'afford') out.push(t('onboarding.why.afford'))
  if (a.city === 'area' && ['afford', 'looking', 'dream'].includes(a.focus)) {
    out.push(t('onboarding.why.cityArea'))
  }
  return out.slice(0, 3)
}

/** Mirror the answers back as a sentence (spec §6). Optional parts are skipped. */
function buildReflect(a, t) {
  const desc = [
    a.who && t(`onboarding.reflect.who.${a.who}`),
    a.age && t(`onboarding.reflect.age.${a.age}`),
    a.dur && t(`onboarding.reflect.dur.${a.dur}`),
  ].filter(Boolean)
  const tail = [
    t(`onboarding.reflect.focus.${a.focus}`),
    a.city && t(`onboarding.reflect.city.${a.city}`),
  ]
    .filter(Boolean)
    .join(', ')
  if (desc.length) {
    return `${t('onboarding.reflect.youre')} ${desc.join(', ')} — ${tail}.`
  }
  return `${t('onboarding.reflect.leadNoDesc')} ${tail}.`
}

function Question({ n, legend, options, name, value, onChange, tOpt }) {
  return (
    <fieldset className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <legend className="flex items-baseline gap-2 px-1">
        <span className="ds-figure text-sm font-semibold text-teal-700">{n}</span>
        <span className="text-sm font-semibold text-ink">{legend}</span>
      </legend>
      <ol className="mt-3 space-y-0.5">
        {options.map((opt, i) => {
          const on = value === opt
          return (
            <li key={opt}>
              <label className="group flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 text-sm transition hover:bg-teal-50/50">
                <input
                  type="radio"
                  name={name}
                  value={opt}
                  checked={on}
                  onChange={() => onChange(opt)}
                  className="h-4 w-4 shrink-0"
                  style={{ accentColor: 'var(--moss-600, #566d29)' }}
                />
                <span className={on ? 'font-medium text-ink' : 'text-body'}>
                  <span className="mr-2 font-semibold text-faint">{LETTERS[i]}</span>
                  {tOpt(opt)}
                </span>
              </label>
            </li>
          )
        })}
      </ol>
    </fieldset>
  )
}

export default function Onboarding({ onComplete, onSkip }) {
  const { t } = useI18n()
  const [answers, setAnswers] = useState({
    age: '',
    dur: '',
    focus: '',
    who: '',
    city: '',
    canton: '',
  })
  const [note, setNote] = useState('')

  const set = (key) => (val) => setAnswers((p) => ({ ...p, [key]: val }))

  const focus = answers.focus
  const meta = focus ? FOCUS[focus] : null
  // Persona nuance: E · looking splits Ready Explorer (no city) / The Mover (city).
  const personaKey =
    focus === 'looking' && (answers.city === 'area' || answers.city === 'region')
      ? 'mover'
      : meta?.personaKey
  const why = useMemo(() => (focus ? buildWhy(answers, t) : []), [answers, focus, t])
  const reflect = useMemo(() => (focus ? buildReflect(answers, t) : ''), [answers, focus, t])

  const hasCity = answers.city === 'area' || answers.city === 'region'
  // Every question must be answered before routing (the canton sub-picker stays
  // optional — it only refines the city answer).
  const allAnswered = !!(answers.age && answers.dur && focus && answers.who && answers.city)

  const handleGo = () => {
    if (!allAnswered) return
    onComplete({
      focus,
      persona: personaKey,
      dest: meta.dest,
      seed: {
        horizon: answers.dur ? DUR_HORIZON[answers.dur] : undefined,
        residentStatus: answers.who || undefined,
        canton: answers.canton || undefined,
      },
      note: note.trim() || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'var(--surface-page)' }}
    >
      <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
        {/* Header — brand + skip */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/plinthly-mark.png"
              alt=""
              className="h-8 w-8"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="ds-wordmark text-base text-ink">Plinthly</span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline"
          >
            {t('onboarding.skip')}
          </button>
        </div>

        <p className="ds-eyebrow text-xs text-teal-700">{t('onboarding.eyebrow')}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">
          {t('onboarding.title')}
        </h1>
        <p className="mt-2 text-sm text-muted">{t('onboarding.intro')}</p>

        {/* Questions */}
        <div className="mt-6 space-y-4">
          <Question
            n="1"
            name="ob-age"
            legend={t('onboarding.q1.label')}
            options={AGE_OPTS}
            value={answers.age}
            onChange={set('age')}
            tOpt={(o) => t(`onboarding.q1.opt.${o}`)}
          />
          <Question
            n="2"
            name="ob-dur"
            legend={t('onboarding.q2.label')}
            options={DUR_OPTS}
            value={answers.dur}
            onChange={set('dur')}
            tOpt={(o) => t(`onboarding.q2.opt.${o}`)}
          />
          <Question
            n="3"
            name="ob-focus"
            legend={t('onboarding.q3.label')}
            options={FOCUS_OPTS}
            value={answers.focus}
            onChange={set('focus')}
            tOpt={(o) => t(`onboarding.q3.opt.${o}`)}
          />
          <Question
            n="4"
            name="ob-who"
            legend={t('onboarding.q4.label')}
            options={WHO_OPTS}
            value={answers.who}
            onChange={set('who')}
            tOpt={(o) => t(`onboarding.q4.opt.${o}`)}
          />
          <div>
            <Question
              n="5"
              name="ob-city"
              legend={t('onboarding.q5.label')}
              options={CITY_OPTS}
              value={answers.city}
              onChange={(v) =>
                setAnswers((p) => ({ ...p, city: v, canton: v === 'notyet' ? '' : p.canton }))
              }
              tOpt={(o) => t(`onboarding.q5.opt.${o}`)}
            />
            {hasCity && (
              <label className="mt-2 block px-1 text-xs text-muted">
                {t('onboarding.q5.cantonLabel')}
                <select
                  value={answers.canton}
                  onChange={(e) => set('canton')(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">{t('onboarding.q5.cantonPlaceholder')}</option>
                  {cantonOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        {/* Reflective summary — appears once Q3 is answered (spec §6) */}
        {focus ? (
          <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="ds-eyebrow text-[10px] text-teal-700">
                {t('onboarding.summary.eyebrow')}
              </span>
              <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                {t(`onboarding.persona.${personaKey}`)}
              </span>
            </div>

            <p className="mt-3 text-base leading-relaxed text-ink">{reflect}</p>

            {/* Recommended-start card */}
            <div className="mt-4 rounded-xl border border-line bg-white p-5">
              <p className="ds-eyebrow text-[10px] text-muted">
                {t('onboarding.recommendedStart')}
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {t(`onboarding.dest.${focus}.phase`)}
              </p>
              <p className="mt-1 text-sm text-body">{t(`onboarding.dest.${focus}.copy`)}</p>
              {why.length > 0 && (
                <>
                  <p className="mt-4 ds-eyebrow text-[10px] text-muted">
                    {t('onboarding.summary.whyTitle')}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {why.map((w, i) => (
                      <li key={i} className="flex gap-2 text-sm text-body">
                        <span className="mt-0.5 text-teal-600">✓</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Optional open feedback */}
            <label className="mt-4 block text-xs text-muted">
              {t('onboarding.feedback.label')}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder={t('onboarding.feedback.placeholder')}
                className="mt-1 block w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </label>

            <button
              type="button"
              onClick={handleGo}
              disabled={!allAnswered}
              className="mt-5 w-full rounded-full bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition enabled:hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {t('onboarding.cta', { dest: t(`onboarding.dest.${focus}.target`) })}
            </button>
            {!allAnswered && (
              <p className="mt-2 text-center text-xs text-muted">
                {t('onboarding.completeAll')}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-line bg-white/60 p-5 text-center text-sm text-muted">
            {t('onboarding.hint')}
          </p>
        )}
      </div>
    </div>
  )
}
