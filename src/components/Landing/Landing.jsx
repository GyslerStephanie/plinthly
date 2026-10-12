import { useI18n } from '../../i18n/I18nContext'
import Hero from '../hero/Hero'
import { useDialogFocus } from '../../lib/useDialogFocus'

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
  // Trapped, but deliberately NOT role="dialog": this is the front door, a page
  // in its own right, not a modal layered over content the visitor was reading.
  // The trap is still needed because the phase-1 form sits behind it, invisible
  // but focusable. No Escape — there is nothing to dismiss back to.
  const landingRef = useDialogFocus()
  return (
    <div ref={landingRef} className="fixed inset-0 z-50 overflow-y-auto">
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
