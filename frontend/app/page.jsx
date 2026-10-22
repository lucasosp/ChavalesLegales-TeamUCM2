'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SelectorIdioma from '../components/SelectorIdioma'
import { useT } from '../lib/i18n'

// El profesor genera un caso y comparte su código; el alumno lo teclea en /alumno.
// Un enlace directo con ?caso= o ?pin= (que es el código del caso) entra sin pasar por ahí.
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

  const juegosLibres = [
    { href: '/novela', tag: t('inicio.juegoHistoriaTag'), title: t('inicio.juegoHistoriaTitulo'), bg: '#FEF08A', color: '#854D0E', icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></> },
    { href: '/experiments/cid-table', tag: t('inicio.juegoFamiliaTag'), title: t('inicio.juegoFamiliaTitulo'), bg: '#D1FAE5', color: '#047857', icon: <><ellipse cx="12" cy="12" rx="7" ry="4.5"/><circle cx="12" cy="4" r="1.6"/><circle cx="12" cy="20" r="1.6"/><circle cx="3" cy="12" r="1.6"/><circle cx="21" cy="12" r="1.6"/></> },
    { href: '/experiments/caja-arena', tag: t('inicio.juegoArenaTag'), title: t('inicio.juegoArenaTitulo'), bg: '#FFEDD5', color: '#C2410C', icon: <><path d="M4 7c0-1.5 1-2.5 2.5-2.5L9 7h3.5c2.5 0 4.5 2 4.5 4.5V13l3 1v3h-3l-1 3H8l-1-3H5.5L4 13z"/><circle cx="7.5" cy="8.5" r=".7" fill="currentColor"/></> },
    { href: '/novela?avatar=1', tag: t('inicio.juegoAvatarTag'), title: t('inicio.juegoAvatarTitulo'), bg: '#EDE9FE', color: '#6D28D9', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
  ]

  return (
    <div className="kahoot-page">
      {/* Fondo orgánico curvado estilo Kahoot */}
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
            fill="var(--granate)"
            fillOpacity="0.45"
          />
          <path
            d="M-50 780 C320 620 680 720 1100 520 C1300 420 1480 460 1600 410 L1600 950 L-50 950 Z"
            fill="var(--verde-oscuro)"
            fillOpacity="0.35"
          />
          <path
            d="M-80 -80 C200 -20 320 220 180 440 C80 580 -40 620 -120 600 Z"
            fill="var(--verde-light)"
            fillOpacity="0.20"
          />
          <circle cx="1350" cy="150" r="480" fill="var(--verde)" fillOpacity="0.25" />
          <circle cx="1350" cy="150" r="340" fill="var(--amarillo)" fillOpacity="0.12" />
        </svg>
      </div>

      <header
        className="kahoot-topbar"
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Link href="/profesores" className="btn-pro-opt1" aria-label={t('inicio.accesoEducadores')}>
          <span className="pro-icon-chip" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
            </svg>
          </span>
          <span className="pro-label">{t('inicio.accesoEducadores')}</span>
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
          {/* ENTRADA DEL ALUMNO: el código del caso se teclea en /alumno */}
          <section className="pin-section-card" aria-label={t('inicio.entradaAlumnoAria')}>
            <div className="pin-card-header">
              <span className="pin-badge-title">{t('inicio.entradaAlumnoTitulo')}</span>
            </div>
            <p className="pin-card-texto">{t('inicio.entradaAlumnoTexto')}</p>
            <Link href="/alumno" className="btn-pin-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              <span>{t('inicio.entradaAlumnoBoton')}</span>
            </Link>
          </section>

          {/* JUEGOS SIN CÓDIGO */}
          <section className="solo-section-card" aria-label={t('inicio.jugarSinPinAria')}>
            <div style={{ textAlign: 'center', marginBottom: 2 }}>
              <h2 className="solo-title" style={{ margin: 0, fontSize: 16 }}>
                {t('inicio.jugarSinPinTitulo')}
              </h2>
            </div>

            <div className="solo-games-grid">
              {juegosLibres.map((g) => (
                <Link key={g.href} href={g.href} className="solo-game-tile">
                  <span className="solo-game-icon" style={{ background: g.bg, color: g.color }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{g.icon}</svg>
                  </span>
                  <span className="solo-game-tag" style={{ color: g.color }}>{g.tag}</span>
                  <strong className="solo-game-title">{g.title}</strong>
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
            <span>•</span>
            <Link href="/informe" className="footer-link">{t('inicio.pideAyuda')}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
