import { useI18n } from '../../i18n/I18nContext'

/**
 * Landing — the top-of-funnel front door (before onboarding).
 *
 * A hero that introduces Plinthly; the primary CTA leads into the 5-question
 * onboarding, and a secondary link skips straight to the calculator. Skipping
 * is offered here as well as on the onboarding page itself, so the intake is
 * never a hard gate.
 *
 * NOTE: this is an app-tokened interim of the "Onward Hero" design — the flow
 * and wiring are final; the hero's inner markup is meant to be replaced with the
 * imported Onward Hero.dc.html once it's available in the workspace.
 */
export default function Landing({ onStart, onSkip }) {
  const { t } = useI18n()
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto"
      style={{ background: 'var(--surface-page)' }}
    >
      {/* Top bar — brand + skip */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:px-8 lg:px-[60px]">
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/plinthly-mark.png"
            alt=""
            className="h-9 w-9"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="ds-wordmark text-lg text-ink">Plinthly</span>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline"
        >
          {t('landing.skip')}
        </button>
      </div>

      {/* Hero */}
      <div className="ds-hero relative flex-1 border-b border-line">
        <img
          src="/brand/voxel-landscape-hero.png"
          alt=""
          className="ds-hero-land hidden sm:block"
        />
        <div className="mx-auto flex h-full max-w-[1320px] flex-col justify-center px-5 py-16 md:px-8 lg:px-[60px] lg:py-24">
          <div className="max-w-2xl">
            <p className="ds-eyebrow text-xs text-teal-700">{t('landing.eyebrow')}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {t('landing.title')}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-body lg:text-lg">
              {t('landing.blurb')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={onStart}
                className="rounded-full bg-teal-700 px-7 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
              >
                {t('landing.cta')}
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="text-sm font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline"
              >
                {t('landing.skipInline')}
              </button>
            </div>

            <p className="ds-eyebrow mt-8 text-[10px] text-faint">{t('landing.trust')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
