import GlossaryTerm from './GlossaryTerm'

/**
 * Inline jargon explainer. Thin wrapper that delegates to GlossaryTerm so every
 * existing `<InfoTerm term=... >definition</InfoTerm>` usage now gets the shared
 * click-to-open popover (desktop) / bottom sheet (mobile) behavior, with
 * outside-click / Escape / × dismissal.
 *
 * `term`     → the dotted-underlined label
 * `children` → the plain-language definition
 */
export default function InfoTerm({ term, children }) {
  return <GlossaryTerm term={term} def={children} />
}
