'use client'

import Link from 'next/link'
import PanelEducador from '../../components/PanelEducador'
import SelectorIdioma from '../../components/SelectorIdioma'
import { useT } from '../../lib/i18n'

/**
 * Portal del educador. Genera un caso y devuelve su código (CL-12345) y su enlace.
 * El alumno entra con ese código en /alumno.
 */
export default function ApartadoProfesores() {
  const t = useT()

  return (
    <div className="kahoot-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="kahoot-bg-canvas" aria-hidden="true">
        <div className="bg-wave-left" />
        <div className="bg-arc-right" />
        <div className="bg-sphere-glow" />
      </div>

      <header
        className="kahoot-topbar"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Link href="/" className="btn-back-home" aria-label={t('profesores.volverInicio')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>{t('profesores.inicio')}</span>
        </Link>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/informe" className="btn-back-home">
            <span>{t('profesores.verInformes')}</span>
          </Link>
          <SelectorIdioma className="selector-idioma-topbar" />
        </div>
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
        <div style={{ maxWidth: 760, width: '100%', textAlign: 'center' }}>
          <PanelEducador />
        </div>
      </main>
    </div>
  )
}
