'use client'

import { useState, useRef, useEffect } from 'react'
import { LANGS, useI18n } from '../lib/i18n'

export default function SelectorIdioma({ className = '' }) {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  const currentLang = LANGS.find((l) => l.code === lang) || LANGS[0]

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (code) => {
    setLang(code)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={`selector-idioma-custom ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="selector-idioma-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('comun.idioma')}
      >
        <span className="selector-idioma-chip" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9.5" />
            <path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5S14.6 18.7 12 21.5M12 2.5C9.4 5.3 8.1 8.5 8.1 12s1.3 6.7 3.9 9.5" />
          </svg>
        </span>
        <span className="selector-idioma-label">{currentLang.label}</span>
        <span className="selector-idioma-arrow" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▾
        </span>
      </button>

      {open && (
        <ul className="selector-idioma-dropdown" role="listbox" aria-label={t('comun.idioma')}>
          {LANGS.map((l) => {
            const isSelected = l.code === lang
            return (
              <li key={l.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelect(l.code)}
                  className={`selector-idioma-opt ${isSelected ? 'is-selected' : ''}`}
                >
                  <span className="opt-name">{l.label}</span>
                  {isSelected && (
                    <span className="opt-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
