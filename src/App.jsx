import { useEffect, useRef, useState } from 'react'
import AffordabilityForm from './components/AffordabilityForm'
import AffordabilityResult from './components/AffordabilityResult'
import DreamPricePhase from './components/DreamPricePhase'
import Phase2Exploration from './components/Phase2Exploration'
import Phase3Options from './components/Phase3Options'
import Phase4ActionPlan from './components/Phase4ActionPlan'
import { calculateAffordability } from './lib/affordability'
import { dataMeta } from './lib/cantons'
import { impliedSize } from './lib/exploration'
import { computeLedger, selectedMeasures } from './lib/retrofit'
import { decodeState, syncHash, shareableUrl } from './lib/share'
import { useI18n } from './i18n/I18nContext'
import { AppStateProvider, deriveAppState } from './state/AppStateContext'
import PhaseContextBanner from './components/PhaseContextBanner'
import StickySummaryBar from './components/StickySummaryBar'
import AdvisorFab from './components/AdvisorFab'
import { buildAdvisorContext } from './lib/advisorContext'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import { track } from './lib/track'

const PHASE_NUMBERS = [1, 2, 3, 4, 5]
const LAST_PHASE = 5

const DEFAULT_VALUES = {
  grossIncome: '',
  savings: '',
  pillar3a: '',
  pillar2: '',
  downPct: '20',
  canton: 'ZH',
  householdSize: '2',
}

const DEFAULT_EXPLORE = {
  budget: '',
  canton: '', // seeded from Phase 1 canton on entering Phase 2
  propertyType: 'apartment',
  condition: 'existing',
  sustainability: 'energy',
  chosenOption: '',
}

function calc(values) {
  return calculateAffordability({
    ...values,
    householdSize: Number(values.householdSize),
  })
}

export default function App() {
  const { t, lang, setLang, languages } = useI18n()
  const [phase, setPhase] = useState(1)
  const [maxVisited, setMaxVisited] = useState(1)
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [phase1, setPhase1] = useState(null)
  const [explore, setExplore] = useState(DEFAULT_EXPLORE)
  const [feedback, setFeedback] = useState(null) // session-only (Feature 6)
  const [dreamContext, setDreamContext] = useState(null) // dream-price gap for the AI advisor
  const restored = useRef(false)

  // Record end-of-journey feedback: log it (v1 placeholder — no backend) and
  // keep it in state so it persists for the session.
  const handleFeedback = (payload) => {
    // eslint-disable-next-line no-console
    console.log('[Plinthly feedback]', payload)
    setFeedback(payload)
  }

  // Restore from a shared URL hash on first load.
  useEffect(() => {
    if (restored.current) return
    restored.current = true
    const s = decodeState()
    if (!s || Object.keys(s).length === 0) return

    const nextValues = {
      grossIncome: s.grossIncome ?? '',
      savings: s.savings ?? '',
      pillar3a: s.pillar3a ?? '',
      pillar2: s.pillar2 ?? '',
      downPct: s.downPct ?? DEFAULT_VALUES.downPct,
      canton: s.canton ?? DEFAULT_VALUES.canton,
      householdSize: s.householdSize ?? DEFAULT_VALUES.householdSize,
    }
    setValues(nextValues)
    setExplore({
      budget: s.budget ?? '',
      canton: s.canton ?? DEFAULT_EXPLORE.canton,
      propertyType: s.propertyType ?? DEFAULT_EXPLORE.propertyType,
      condition: s.condition ?? DEFAULT_EXPLORE.condition,
      sustainability: s.sustainability ?? DEFAULT_EXPLORE.sustainability,
      chosenOption: s.chosenOption ?? '',
      measures: s.measures, // undefined → configurator default
    })

    if (nextValues.grossIncome && nextValues.savings) {
      const result = calc(nextValues)
      setPhase1(result)
      const target = Math.min(LAST_PHASE, Math.max(1, Number(s.phase) || 1))
      setPhase(target)
      setMaxVisited(target)
    }
  }, [])

  // Keep the URL hash in sync so the current view is always shareable.
  useEffect(() => {
    syncHash({
      ...values,
      canton: explore.canton || values.canton,
      budget: explore.budget,
      propertyType: explore.propertyType,
      condition: explore.condition,
      sustainability: explore.sustainability,
      chosenOption: explore.chosenOption,
      measures: explore.measures,
      phase,
    })
  }, [values, explore, phase])

  const flatState = {
    ...values,
    canton: explore.canton || values.canton,
    budget: explore.budget,
    propertyType: explore.propertyType,
    condition: explore.condition,
    sustainability: explore.sustainability,
    chosenOption: explore.chosenOption,
    measures: explore.measures,
    phase,
  }

  // Fully live: the result reflects the current inputs continuously (no "run"
  // button). phase1 is set whenever income + savings are valid, which is also
  // what unlocks the later phases.
  const isValid = (v) =>
    Number(String(v.grossIncome).replace(/[^0-9.]/g, '')) > 0 &&
    Number(String(v.savings).replace(/[^0-9.]/g, '')) > 0
  const previewResult = phase1

  const handleValuesChange = (next) => {
    setValues(next)
    const ok = isValid(next)
    setPhase1(ok ? calc(next) : null)
    if (ok) track('calculation_completed', undefined, { once: true })
  }

  // Phase 3 canton is the single source of truth once we're past Phase 1;
  // mirror it back so the Phase 1 tax note stays consistent if revisited.
  const handleExploreChange = (next) => {
    setExplore(next)
    if (next.canton !== values.canton) {
      const nv = { ...values, canton: next.canton }
      setValues(nv)
      if (phase1) setPhase1(calc(nv))
    }
  }

  const goToPhase = (n) => {
    if (n < 1 || n > LAST_PHASE) return
    if (n > 1 && !phase1) return
    // Entering exploration (phase 3) for the first time: seed budget + canton.
    if (n === 3) {
      setExplore((e) => ({
        ...e,
        budget: e.budget || String(phase1?.maxPrice || ''),
        canton: e.canton || values.canton,
      }))
    }
    if (n === 2) track('dream_price_opened', undefined, { once: true })
    setPhase(n)
    setMaxVisited((m) => Math.max(m, n))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const canContinue = phase < LAST_PHASE && (phase > 1 || !!phase1)
  const mtNotice = t('meta.mtNotice')

  // Derived, read-only view of state shared with descendants via context.
  const appState = deriveAppState({ values, phase1, explore, phase, maxVisited })

  // If the buyer has modelled a renovation (Phase 3, Option A), surface its net
  // cost back in Phase 1 as an "effective property budget".
  const renovation = (() => {
    if (!phase1 || explore.chosenOption !== 'renovate') return null
    const budget = Number(String(explore.budget).replace(/[^0-9.]/g, '')) || phase1.maxPrice
    const measures = selectedMeasures(explore.measures)
    if (!measures.length || !budget) return null
    const size = impliedSize(explore.canton || values.canton, budget, explore.propertyType)
    const led = computeLedger(size, budget, measures)
    return led.netCost > 0 ? { netCost: led.netCost, newClass: led.newClass } : null
  })()

  return (
    <AppStateProvider value={appState}>
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-5 py-4 md:px-8 lg:px-[60px]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
              P
            </span>
            <div>
              <p className="text-sm font-semibold leading-tight text-slate-900">
                Plinthly
              </p>
              <p className="text-xs leading-tight text-slate-500">
                {t('header.tagline')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 lg:inline">
              {t('header.badge')}
            </span>
            <LanguageSwitcher
              lang={lang}
              setLang={setLang}
              languages={languages}
              label={t('lang.label')}
            />
          </div>
        </div>
      </header>

      {mtNotice && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 no-print">
          {mtNotice}
        </div>
      )}

      <StickySummaryBar />

      <main className="mx-auto max-w-[1320px] px-5 py-10 md:px-8 lg:px-[60px] lg:py-16">
        <div className="mb-8 no-print">
          <PhaseNav
            current={phase}
            maxVisited={maxVisited}
            onJump={goToPhase}
          />
        </div>

        <div className="mb-8 max-w-2xl no-print">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {t(`heading.${phase}.title`)}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600 lg:mt-3 lg:text-lg">
            {t(`heading.${phase}.blurb`)}
          </p>
        </div>

        {/* Phase 1 — two-column on desktop: inputs left, live output right */}
        {phase === 1 && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
                <h2 className="mb-5 text-lg font-bold text-slate-900">
                  {t('form.title')}
                </h2>
                <AffordabilityForm
                  values={values}
                  onChange={handleValuesChange}
                />
              </div>
            </div>
            {/* Sticky so the live result stays in view while scrolling inputs */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              {previewResult ? (
                <AffordabilityResult
                  result={previewResult}
                  renovation={renovation}
                  onNavigate={goToPhase}
                />
              ) : (
                <EmptyResult />
              )}
            </div>
          </div>
        )}

        {/* Phase 2 — Calculate dream price */}
        {phase === 2 && phase1 && (
          <DreamPricePhase result={phase1} onNavigate={goToPhase} onDreamContext={setDreamContext} />
        )}

        {/* Phase 3 — exploration */}
        {phase === 3 && (
          <>
            <PhaseContextBanner phase={3} />
            <Phase2Exploration explore={explore} onChange={handleExploreChange} />
          </>
        )}

        {/* Phase 4 — real options */}
        {phase === 4 && (
          <>
            <PhaseContextBanner phase={4} />
            <Phase3Options explore={explore} onChange={handleExploreChange} phase1={phase1} />
          </>
        )}

        {/* Phase 5 — action plan */}
        {phase === 5 && phase1 && (
          <>
            <PhaseContextBanner phase={5} />
            <Phase4ActionPlan
              phase1={phase1}
              explore={explore}
              shareUrl={shareableUrl(flatState)}
              feedback={feedback}
              onSubmitFeedback={handleFeedback}
            />
          </>
        )}

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between no-print">
          <button
            type="button"
            onClick={() => goToPhase(phase - 1)}
            disabled={phase === 1}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition enabled:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-0"
          >
            {t('btn.back')}
          </button>

          {canContinue ? (
            <button
              type="button"
              onClick={() => goToPhase(phase + 1)}
              className="rounded-full bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
            >
              {phase === 1
                ? t('btn.continueDream')
                : phase === 2
                ? t('btn.continueExplore')
                : phase === 3
                ? t('btn.seeOptions')
                : t('btn.buildPlan')}
            </button>
          ) : phase === 1 && !phase1 ? (
            <span className="text-sm text-slate-400">{t('btn.runToContinue')}</span>
          ) : (
            <span />
          )}
        </div>

        {/* Other tracks — only on the entry phase */}
        {phase === 1 && (
          <div className="mt-12 border-t border-slate-200 pt-8 no-print">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {t('tracks.heading')}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TrackCard title={t('tracks.ownTitle')} desc={t('tracks.ownDesc')} badge={t('tracks.comingSoon')} />
              <TrackCard title={t('tracks.landTitle')} desc={t('tracks.landDesc')} badge={t('tracks.comingSoon')} />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1320px] px-5 py-8 md:px-8 lg:px-[60px] text-xs leading-relaxed text-slate-400">
          {t('footer.disclaimer', { date: dataMeta.last_updated })}
        </div>
      </footer>

      {/* AI advisor — available once a result exists */}
      {previewResult && (
        <AdvisorFab context={buildAdvisorContext(previewResult, lang, phase === 2 ? dreamContext : null)} />
      )}

      {/* Vercel Speed Insights — anonymous Web Vitals, no PII */}
      <SpeedInsights />
      {/* Vercel Web Analytics — cookieless pageviews + the 5 product events */}
      <Analytics />
    </div>
    </AppStateProvider>
  )
}

function PhaseNav({ current, maxVisited, onJump }) {
  const { t } = useI18n()
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      {PHASE_NUMBERS.map((n, i) => {
        const active = n === current
        const done = n < current
        const reachable = n <= maxVisited
        return (
          <li key={n} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reachable && onJump(n)}
              disabled={!reachable}
              className={
                'flex items-center gap-2 rounded-full py-0.5 pr-2 ' +
                (reachable ? 'cursor-pointer' : 'cursor-not-allowed')
              }
            >
              <span
                className={
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                  (active
                    ? 'bg-teal-700 text-white'
                    : done
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-400')
                }
              >
                {n}
              </span>
              <span
                className={
                  active ? 'font-medium text-slate-900' : 'text-slate-400'
                }
              >
                {t(`nav.${n}`)}
              </span>
            </button>
            {i < PHASE_NUMBERS.length - 1 && (
              <span className="mx-1 hidden text-slate-300 sm:inline">→</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function LanguageSwitcher({ lang, setLang, languages, label }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="rounded-lg border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.short} · {l.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function EmptyResult() {
  const { t } = useI18n()
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12 L12 3 l9 9" />
          <path d="M5 10 v10 h14 V10" />
          <path d="M9 20 v-6 h6 v6" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-700">{t('empty.title')}</p>
      <p className="mt-1 max-w-xs text-sm text-slate-500">{t('empty.body')}</p>
    </div>
  )
}

function TrackCard({ title, desc, badge }) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5 opacity-90">
      <span className="absolute right-4 top-4 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        {badge}
      </span>
      <h3 className="pr-24 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </div>
  )
}
