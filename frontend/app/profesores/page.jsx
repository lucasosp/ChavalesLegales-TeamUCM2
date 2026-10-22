'use client'

import Link from 'next/link'
import PanelTrabajadorSocial from '../../components/PanelTrabajadorSocial'
import Barra from '../../components/Barra'
import { useT } from '../../lib/i18n'

/**
 * Portal del trabajador social. Genera un caso y devuelve su código (CL-12345) y su enlace.
 * El alumno entra con ese código en la portada.
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

      {/* Barra compartida: volver a la izquierda, rótulo mini en el centro y
          a la derecha el enlace a los informes + el idioma. */}
      <Barra
        href="/"
        texto={`← ${t('profesores.inicio')}`}
        acciones={<Link href="/servicios" className="btn-back-home">{t('profesores.verInformes')}</Link>}
      />

      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.8rem 20px 40px',
          position: 'relative',
          zIndex: 10,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: 760, width: '100%', textAlign: 'center' }}>
          <PanelTrabajadorSocial />
        </div>
      </main>
    </div>
  )
}
