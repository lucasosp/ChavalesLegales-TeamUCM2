'use client'

import { useState, useRef, useEffect } from 'react'
import { LANGS, useI18n } from '../lib/i18n'

// Banderas en SVG (los emojis de bandera no se ven en Windows y las regionales no existen como emoji)
const FLAGS = {
  es: (
    <>
      <rect width="27" height="18" fill="#c60b1e" />
      <rect y="4.5" width="27" height="9" fill="#ffc400" />
    </>
  ),
  ca: (
    <>
      <rect width="27" height="18" fill="#fcdd09" />
      {[2, 6.5, 11, 15.5].map((y) => <rect key={y} y={y - 1} width="27" height="2" fill="#da121a" />)}
    </>
  ),
  va: (
    <>
      <rect width="27" height="18" fill="#fcdd09" />
      {[2, 6.5, 11, 15.5].map((y) => <rect key={y} y={y - 1} width="27" height="2" fill="#da121a" />)}
      <rect width="8" height="18" fill="#0a4ea1" />
    </>
  ),
  gl: (
    <>
      <rect width="27" height="18" fill="#fff" />
      <path d="M0 18L27 0v3.2L5 18z M22 18l5-3.4V18z" fill="#0b5fa5" />
    </>
  ),
  eu: (
    <>
      <rect width="27" height="18" fill="#d52b1e" />
      <path d="M0 0L27 18M27 0L0 18" stroke="#009b48" strokeWidth="2.4" />
      <path d="M13.5 0v18M0 9h27" stroke="#fff" strokeWidth="2.4" />
    </>
  ),
  oc: (
    <>
      <rect width="27" height="18" fill="#fcdd09" />
      <rect width="27" height="9" fill="#da121a" />
      <rect x="10.5" y="5" width="6" height="8" fill="#222" />
    </>
  ),
}

function Bandera({ code }) {
  return (
    <svg className="selector-idioma-flag" viewBox="0 0 27 18" width="22" height="15" aria-hidden="true">
      <g>{FLAGS[code]}</g>
    </svg>
  )
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
