'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SelectorIdioma from '../../components/SelectorIdioma'
import { useT } from '../../lib/i18n'

/**
 * Entrada del alumno. El educador genera un caso en /profesores y obtiene un código
 * (CL-12345). Aquí el alumno teclea esos 5 dígitos y entra en su sesión.
 *
 * El código se valida contra el backend a propósito: si el caso no existe, es mejor
 * decirlo que mandar al alumno a una sesión que no quedará registrada.
 */
export default function AccesoAlumno() {
  const router = useRouter()
  const t = useT()
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const digitos = codigo.replace(/\D/g, '').slice(0, 5)
  const listo = digitos.length === 5

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!listo || cargando) return

    const casoId = `CL-${digitos}`
    setCargando(true)
    setError(null)

    try {
      const res = await fetch(`/api/casos/${encodeURIComponent(casoId)}`, { cache: 'no-store' })
      if (res.status === 404) {
        setError(t('alumno.codigoNoEncontrado'))
        return
      }
      if (!res.ok) {
        setError(t('alumno.errorConexion'))
        return
      }
      router.push(`/novela?caso=${encodeURIComponent(casoId)}`)
    } catch {
      setError(t('alumno.errorConexion'))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="kahoot-page">
      <div className="kahoot-bg-canvas" aria-hidden="true">
        <div className="bg-wave-left" />
        <div className="bg-sphere-glow" />
      </div>

      <header
        className="kahoot-topbar"
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Link href="/" className="btn-back-home" aria-label={t('alumno.volver')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>{t('alumno.volver')}</span>
        </Link>
        <SelectorIdioma className="selector-idioma-topbar" />
      </header>

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 20px 40px',
          position: 'relative',
          zIndex: 10,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <section className="pin-section-card" style={{ width: '100%', maxWidth: 420 }} aria-label={t('alumno.titulo')}>
          <div className="pin-card-header">
            <span className="pin-badge-title">{t('alumno.titulo')}</span>
          </div>

          <p className="pin-card-texto">{t('alumno.subtitulo')}</p>

          <form className="pin-form" onSubmit={handleSubmit}>
            <div className="pin-input-container">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck="false"
                autoFocus
                maxLength={8}
                className="pin-input"
                placeholder={t('alumno.placeholder')}
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value)
                  setError(null)
                }}
                disabled={cargando}
                aria-label={t('alumno.placeholder')}
              />
            </div>

            <button type="submit" className="btn-pin-submit" disabled={!listo || cargando}>
              <span>{cargando ? t('alumno.buscando') : t('alumno.entrar')}</span>
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 12, color: '#DC2626', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <p className="pin-card-texto" style={{ marginTop: 14, fontSize: 12 }}>
            {t('alumno.ayuda')}
          </p>
        </section>
      </main>
    </div>
  )
}
