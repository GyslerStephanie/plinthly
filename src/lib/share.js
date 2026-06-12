/**
 * Client-side shareable state. With no backend, we encode the user's inputs
 * into the URL hash so a link is fully self-contained and restorable — a
 * "persistent web link" that needs no server (PRD open question §11).
 *
 * Only non-sensitive inputs are encoded (income, savings, selections). We keep
 * it compact and tolerant of garbage input.
 */

const KEYS = [
  ['gi', 'grossIncome'],
  ['sv', 'savings'],
  ['p3', 'pillar3a'],
  ['p2', 'pillar2'],
  ['dn', 'downPct'],
  ['ct', 'canton'],
  ['hs', 'householdSize'],
  ['bg', 'budget'],
  ['pt', 'propertyType'],
  ['cd', 'condition'],
  ['su', 'sustainability'],
  ['op', 'chosenOption'],
  ['ms', 'measures'],
  ['dp', 'dreamPrice'],
  ['ph', 'phase'],
]

/** Build a shareable URL hash from the flat state object. */
export function encodeState(state) {
  const params = new URLSearchParams()
  for (const [short, full] of KEYS) {
    const v = state[full]
    if (v !== undefined && v !== null && v !== '') params.set(short, String(v))
  }
  return params.toString()
}

/** Parse the current location hash back into a partial state object. */
export function decodeState(hash = window.location.hash.replace(/^#/, '')) {
  const params = new URLSearchParams(hash)
  const out = {}
  for (const [short, full] of KEYS) {
    if (params.has(short)) out[full] = params.get(short)
  }
  return out
}

/** Write state to the URL hash without adding a history entry. */
export function syncHash(state) {
  const hash = encodeState(state)
  const url = `${window.location.pathname}${window.location.search}#${hash}`
  window.history.replaceState(null, '', url)
}

/** Full shareable URL for copy-to-clipboard. */
export function shareableUrl(state) {
  return `${window.location.origin}${window.location.pathname}#${encodeState(state)}`
}
