import { createContext, useContext, useEffect, useState } from 'react'
import { translations, LANGUAGES } from './translations'

const I18nContext = createContext(null)

/** Resolve a dotted key path against a nested object. */
function resolve(obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const fromHash = new URLSearchParams(
        window.location.hash.replace(/^#/, ''),
      ).get('lng')
      const stored =
        localStorage.getItem('plinthly.lang') || localStorage.getItem('designify.lang')
      const cand = fromHash || stored
      if (cand && translations[cand]) return cand
    } catch {
      /* ignore */
    }
    return 'en'
  })

  const setLang = (l) => {
    if (!translations[l]) return
    setLangState(l)
    try {
      localStorage.setItem('plinthly.lang', l)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    try {
      document.documentElement.lang = lang
    } catch {
      /* ignore */
    }
  }, [lang])

  /**
   * Translate a key with optional {placeholder} interpolation.
   * Falls back to English, then to the raw key, so the app never shows blanks.
   */
  const t = (key, vars) => {
    let s = resolve(translations[lang], key)
    if (s == null) s = resolve(translations.en, key)
    if (s == null) return key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.split(`{${k}}`).join(String(v))
      }
    }
    return s
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
