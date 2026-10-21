'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Lenguas oficiales y cooficiales de España. El aranés es la variante occitana cooficial en Cataluña.
export const LANGS = [
  { code: 'es', label: 'Castellano' },
  { code: 'ca', label: 'Català' },
  { code: 'va', label: 'Valencià' },
  { code: 'gl', label: 'Galego' },
  { code: 'eu', label: 'Euskara' },
  { code: 'oc', label: 'Aranés' },
]
export const DEFAULT_LANG = 'es'
export const LANG_STORAGE_KEY = 'chavales_lang'

// Cada archivo locales/<lang>/<espacio>.json aporta claves "<espacio>.<clave>"
const ctx = require.context('../locales', true, /\.json$/)
const DICTS = {}
ctx.keys().forEach((path) => {
  const m = path.match(/^\.\/([a-z]{2})\/([\w-]+)\.json$/)
  if (!m) return
  const [, lang, ns] = m
  DICTS[lang] ??= {}
  for (const [k, v] of Object.entries(ctx(path))) DICTS[lang][`${ns}.${k}`] = v
})

function format(str, vars) {
  return vars ? str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`)) : str
}

export function translate(lang, key, vars) {
  const s = DICTS[lang]?.[key] ?? DICTS[DEFAULT_LANG]?.[key] ?? key
  return typeof s === 'string' ? format(s, vars) : s
}

const I18nContext = createContext({ lang: DEFAULT_LANG, setLang: () => {}, t: (k, v) => translate(DEFAULT_LANG, k, v) })

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY)
      if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved)
    } catch {}
  }, [])

  useEffect(() => {
    // El valenciano y el aranés usan sus códigos BCP 47 para lectores de pantalla
    document.documentElement.lang = { va: 'ca-valencia', oc: 'oc-aranes' }[lang] ?? lang
  }, [lang])

  const setLang = useCallback((code) => {
    setLangState(code)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, code)
    } catch {}
  }, [])

  const value = useMemo(() => ({ lang, setLang, t: (k, v) => translate(lang, k, v) }), [lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)
export const useT = () => useContext(I18nContext).t
