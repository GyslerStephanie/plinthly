import { useI18n } from '../i18n/I18nContext'
import InfoTerm from './InfoTerm'

/**
 * Render a translated string that may contain lightweight markup:
 *   **bold**        → <strong>
 *   [[term]]        → an <InfoTerm> using the `term` / `def` props
 * This lets translators keep whole sentences as a single string while still
 * supporting inline emphasis and the jargon tooltips.
 */
export function renderRich(text, { term, def } = {}) {
  if (text == null) return null
  const parts = String(text).split(/(\*\*[^*]+\*\*|\[\[term\]\])/g)
  return parts.map((p, i) => {
    if (!p) return null
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>
    }
    if (p === '[[term]]') {
      return (
        <InfoTerm key={i} term={term}>
          {def}
        </InfoTerm>
      )
    }
    return <span key={i}>{p}</span>
  })
}

/**
 * Convenience component: translate `k` (with optional `vars`) and render any
 * **bold** / [[term]] markup. `term` / `def` supply the inline tooltip.
 */
export function T({ k, vars, term, def, as: As = 'span', className }) {
  const { t } = useI18n()
  return <As className={className}>{renderRich(t(k, vars), { term, def })}</As>
}
