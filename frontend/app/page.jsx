'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EntradaCodigo from '../components/EntradaCodigo'
import SelectorIdioma from '../components/SelectorIdioma'
import { useT } from '../lib/i18n'

// Un enlace directo con ?caso= o ?pin= (que es el código del caso) entra sin teclear nada.
function codigoDesdeUrl(searchParams) {
  const caso = searchParams.get('caso')
  if (caso) return caso.startsWith('CL-') ? caso : `CL-${caso.replace(/\D/g, '')}`

  const pin = searchParams.get('pin')
  if (pin) {
    const digitos = String(pin).replace(/\D/g, '').slice(0, 5)
    return digitos ? `CL-${digitos}` : null
  }

  if (searchParams.get('sesion')) return 'DEMO'
  return null
}

export default function Home() {
  const router = useRouter()
  const t = useT()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const destino = codigoDesdeUrl(new URLSearchParams(window.location.search))
    if (destino) router.push(`/novela?caso=${encodeURIComponent(destino)}`)
  }, [router])

  // Juegos sueltos: no piden código y no registran informe. Solo queda el de la historia.
  const juegosLibres = [
    { href: '/novela', tag: t('inicio.juegoHistoriaTag'), title: t('inicio.juegoHistoriaTitulo'), bg: 'var(--verde-500)', borde: 'var(--verde-700)', color: 'var(--verde-700)', icon: <><path d="M12 7.4C10.4 6 8.2 5.3 5.4 5.3H3.6v13.4h1.8c2.8 0 5 .7 6.6 2.1 1.6-1.4 3.8-2.1 6.6-2.1h1.8V5.3h-1.8c-2.8 0-5 .7-6.6 2.1Z"/><path d="M12 7.4v13.4"/></> },
  ]

  return (
    <div className="kahoot-page">
      {/* Fondo orgánico curvado, todo en la escala verde */}
      <div className="kahoot-bg-canvas" aria-hidden="true">
        <div className="bg-wave-left" />
        <div className="bg-arc-right" />
        <div className="bg-sphere-glow" />
        <svg
          className="bg-curved-svg"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M-100 200 C300 120 500 500 1000 350 C1250 270 1400 480 1550 420 L1550 1000 L-100 1000 Z"
            fill="var(--verde-800)"
            fillOpacity="0.45"
          />
          <path
            d="M-50 780 C320 620 680 720 1100 520 C1300 420 1480 460 1600 410 L1600 950 L-50 950 Z"
            fill="var(--verde-700)"
            fillOpacity="0.35"
          />
          <path
            d="M-80 -80 C200 -20 320 220 180 440 C80 580 -40 620 -120 600 Z"
            fill="var(--verde-400)"
            fillOpacity="0.20"
          />
          <circle cx="1350" cy="150" r="480" fill="var(--verde-500)" fillOpacity="0.25" />
          <circle cx="1350" cy="150" r="340" fill="var(--naranja-400)" fillOpacity="0.12" />
        </svg>
      </div>

      <header className="kahoot-topbar">
        <Link href="/profesores" className="btn-pro-opt1" aria-label={t('inicio.accesoTrabajadores')}>
          <span className="pro-icon-chip" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
            </svg>
          </span>
          <span className="pro-label pro-label-largo">{t('inicio.accesoTrabajadores')}</span>
          <span className="pro-label pro-label-corto">{t('inicio.accesoTrabajadoresCorto')}</span>
        </Link>

        <SelectorIdioma className="selector-idioma-topbar" />
      </header>

      <main className="kahoot-main-content">
        <div className="kahoot-title-wrapper">
          <Link href="/" className="brand-title-link" style={{ textDecoration: 'none' }}>
            <h1 className="brand-title" aria-label="Chavales Legales">
              <span className="title-left-col">
                <span className="title-word">
                  {'CHAVAL'.split('').map((char, idx) => (
                    <span
                      key={idx}
                      className="title-letter"
                      style={{ '--char-index': idx, animationDelay: `${idx * 0.055}s` }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
                <span className="title-word">
                  {'LEGAL'.split('').map((char, idx) => (
                    <span
                      key={idx}
                      className="title-letter"
                      style={{ '--char-index': 6 + idx, animationDelay: `${(6 + idx) * 0.055}s` }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </span>
              <span className="title-suffix-es">
                {'ES'.split('').map((char, idx) => (
                  <span
                    key={idx}
                    className="title-letter"
                    style={{ '--char-index': 11 + idx, animationDelay: `${(11 + idx) * 0.055}s` }}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </h1>
          </Link>
        </div>

        <div className="kahoot-sections-stack">
          {/* Entrada del alumno: el código de 5 dígitos se teclea aquí mismo */}
          <EntradaCodigo />

          {/* Juegos que no piden código */}
          <section className="solo-section-card" aria-label={t('inicio.juegosLibresAria')}>
            <h2 className="solo-title">{t('inicio.juegosLibresTitulo')}</h2>

            <div className="solo-games-grid">
              {juegosLibres.map((g) => (
                <Link
                  key={g.href}
                  href={g.href}
                  className="solo-game-tile"
                  style={{ '--tile-bg': g.bg, '--tile-borde': g.borde, '--tile-tinta': g.color }}
                >
                  <span className="solo-game-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{g.icon}</svg>
                  </span>
                  {/* Dos líneas: título del juego y, debajo, el subtítulo */}
                  <span className="solo-game-text">
                    <strong className="solo-game-title">{g.title}</strong>
                    <span className="solo-game-tag">{g.tag}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="kahoot-footer">
        <div className="footer-inner">
          <div className="footer-links-row">
            <a href="https://www.ucm.es/" target="_blank" rel="noopener noreferrer" className="footer-link">UCM</a>
            <span>•</span>
            <a href="https://dataforumjusticia.es/datathon-2026/" target="_blank" rel="noopener noreferrer" className="footer-link">Datathon Justicia</a>
            <span>•</span>
            <a href="https://www.administraciondejusticia.gob.es/" target="_blank" rel="noopener noreferrer" className="footer-link">{t('inicio.pieAdminJusticia')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
