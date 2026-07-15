import { useI18n } from '../../i18n/I18nContext'
import Hero from '../hero/Hero'

/**
 * Landing — the top-of-funnel front door (before onboarding).
 *
 * The primary CTA leads into the 5-question onboarding; a secondary link skips
 * straight to the calculator. Skipping is offered here as well as on the
 * onboarding page itself, so the intake is never a hard gate.
 *
 * The hero visual is the imported "Onward Hero" — an animated voxel landscape.
 * Its CTA and skip labels use the localized landing.* strings; the surrounding
 * marketing copy ships English for now (i18n is a follow-up).
 */
export default function Landing({ onStart, onSkip }) {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <Hero
        onCtaClick={onStart}
        ctaLabel={t('landing.cta')}
        ctaArrow={false}
        onSkip={onSkip}
        skipLabel={t('landing.skipInline')}
      />
    </div>
  )
}
