import data from '../data/swiss-cantonal-data.json'

/** Sorted [{ code, nameDe, nameEn, region }] for the canton picker. */
export const cantonOptions = Object.entries(data.cantons)
  .map(([code, c]) => ({
    code,
    nameDe: c.name_de,
    nameEn: c.name_en,
    region: c.region,
  }))
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn))

export function getCanton(code) {
  return data.cantons[code] || null
}

export const eigenmietwert = data.eigenmietwert
export const mortgageRules = data.mortgage_rules
export const dataMeta = data.meta
