/**
 * A single "choose your next step" card: monochrome line icon, title, one-line
 * description, and a hover state (border + shadow shift). Routes on click.
 * Used inside NextSteps (spec §6e / §8). No emoji — line icons only.
 */
export default function OptionCard({ icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col items-start gap-2 rounded-xl border border-line bg-white p-5 text-left shadow-sm transition hover:border-ink hover:shadow-md"
    >
      <span className="text-ink" aria-hidden>{icon}</span>
      <span className="font-display text-base font-bold text-ink">{title}</span>
      <span className="text-sm leading-relaxed text-body">{description}</span>
      <span className="mt-auto pt-2 inline-flex items-center gap-1 text-sm font-semibold text-ink">
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </button>
  )
}

/** Monochrome line icons (24px, 1.5 stroke) used by the option cards. */
export const Icons = {
  leaf: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 9-9 0 7-3 11-8 13" />
      <path d="M11 20c0-3 1-6 4-8" />
    </svg>
  ),
  wrench: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8 7.2 20l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.3 2.3-2.5-.4-.4-2.5 2.2-2.4z" />
    </svg>
  ),
}
