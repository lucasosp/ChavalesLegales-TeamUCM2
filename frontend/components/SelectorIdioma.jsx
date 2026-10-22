'use client'

import { useState, useRef, useEffect } from 'react'
import { LANGS, useI18n } from '../lib/i18n'

function Bandera({ code }) {
  return <img className="selector-idioma-flag" src={`/flags/${code}.svg`} alt="" width="26" height="18" aria-hidden="true" />
}

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
        <Bandera code={currentLang.code} />
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
                  <span className="opt-name">
                    <Bandera code={l.code} />
                    {l.label}
                  </span>
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
