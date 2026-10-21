'use client'

import { LANGS, useI18n } from '../lib/i18n'

export default function SelectorIdioma({ className = '' }) {
  const { lang, setLang, t } = useI18n()
  return (
    <label className={`selector-idioma ${className}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9.5" /><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5S14.6 18.7 12 21.5M12 2.5C9.4 5.3 8.1 8.5 8.1 12s1.3 6.7 3.9 9.5" />
      </svg>
      <span className="sr-only">{t('comun.idioma')}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('comun.idioma')}>
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  )
}
