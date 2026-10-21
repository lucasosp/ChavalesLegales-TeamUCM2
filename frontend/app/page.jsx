'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getInfoSala, unirseASala } from '../lib/api'
import { getWsBaseUrl, createGameSocket } from '../lib/socket'
import SalaEsperaAlumnos from '../components/SalaEsperaAlumnos'
import SelectorIdioma from '../components/SelectorIdioma'
import { useT } from '../lib/i18n'

export default function Home() {
  const router = useRouter()
  const t = useT()
  const [step, setStep] = useState('PIN') // 'PIN' | 'NICKNAME' | 'GAME'
  const [pin, setPin] = useState('')
  const [nickname, setNickname] = useState('')
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const [playerData, setPlayerData] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [selectedSoloGame, setSelectedSoloGame] = useState(null)
  const socketRef = useRef(null)

  // Enrutado directo si se accede con enlace que incluye PIN/caso/sesion
  useEffect(() => {
    if (typeof window === 'undefined') return
    const searchParams = new URLSearchParams(window.location.search)
    const directPin = searchParams.get('pin') || searchParams.get('caso') || searchParams.get('sesion')
    if (directPin) {
      router.push('/novela')
    }
  }, [router])

  const handleSoloGameSelect = (gameKey) => {
    // De momento no navega; listo para enlazar próximamente (ej. /historia o /juicio)
    setSelectedSoloGame((prev) => (prev === gameKey ? null : gameKey))
  }

  // =========================================================================
  // PASO 1: VALIDAR PIN CON EL BACKEND
  // =========================================================================
  const handlePinSubmit = async (e) => {
    e.preventDefault()
    const rawInput = pin.trim()
    if (!rawInput) return

    // Acceso inteligente: si se introduce el codigo de Asistentes Sociales en la casilla principal
    const upper = rawInput.toUpperCase().replace(/\s+/g, '')
    if (upper.includes('SOCIAL') || upper.startsWith('SOC') || upper.includes('ASISTENT') || upper === '2026') {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chavales_asistente_social_auth', 'true')
      }
      router.push('/asistentes-sociales')
      return
    }

    const cleanPin = rawInput.replace(/\s+/g, '')

    router.push('/novela')
  }

  // =========================================================================
  // PASO 2: INTRODUCIR APODO Y UNIRSE EN EL BACKEND
  // =========================================================================
  const handleNicknameSubmit = async (e) => {
    e.preventDefault()
    const cleanNick = nickname.trim()
    if (!cleanNick) return

    router.push('/novela')
  }

  // =========================================================================
  // PASO 3: CONEXIÓN WEBSOCKET DEL ALUMNO DURANTE LA PARTIDA
  // =========================================================================
  useEffect(() => {
    if (step !== 'GAME' || !playerData || !pin) return

    const wsBase = getWsBaseUrl()
    const wsUrl = `${wsBase}/ws/player/${pin}?player_id=${playerData.player_id}`

    const socket = createGameSocket({
      url: wsUrl,
      onOpen: () => {
        try {
          const guardado = localStorage.getItem('chavales_mi_avatar')
          if (guardado) {
            const avatar = JSON.parse(guardado)
            socket.send('UPDATE_AVATAR', {
              baseType: avatar.baseType,
              colorPelo: avatar.colorPelo,
              colorRopa: avatar.colorRopa,
              tieneGorro: avatar.tieneGorro,
            })
          }
        } catch {}
      },
      onMessage: (data) => {
        if (data.event === 'LAUNCH_GAME' && data.url) {
          router.push(data.url)
          return
        }
        if (data.event === 'ROOM_STATE') {
          if (data.active_game?.url) {
            router.push(data.active_game.url)
            return
          }
          setGameState(data)
        }
      },
      onError: () => {
        setErrorMsg(t('inicio.errorConexionSala'))
      },
    })

    socketRef.current = socket

    return () => {
      socket.close()
    }
  }, [step, playerData, pin, router])

  const handleSalirPartida = () => {
    socketRef.current?.close()
    setStep('PIN')
    setPin('')
    setNickname('')
    setPlayerData(null)
    setGameState(null)
    setSelectedOption(null)
    setErrorMsg(null)
  }

  // =========================================================================
  // VISTA DEL ALUMNO EN LA SALA DE ESPERA (ESPERANDO A QUE EL PROFESOR LANCE EL JUEGO)
  // =========================================================================
  if (step === 'GAME') {
    router.push('/novela')
    return null
  }

  // =========================================================================
  // VISTA INICIAL: INTRODUCIR PIN O APODO
  // =========================================================================
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

      {/* Accesos profesionales en la barra superior */}
      <header className="kahoot-topbar" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/profesores"
          className="btn-pro-opt1"
          aria-label={t('inicio.accesoEducadores')}
        >
          <span className="pro-icon-chip" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
            </svg>
          </span>
          <span className="pro-label">{t('inicio.accesoEducadores')}</span>
          <span className="pro-arrow" aria-hidden="true">→</span>
        </Link>

        <SelectorIdioma className="selector-idioma-topbar" />
      </header>

      {/* Contenido principal */}
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
          {/* PASO 1: INTRODUCE PIN */}
          {step === 'PIN' && (
            <section className="pin-section-card" aria-label={t('inicio.accesoPinAria')}>
              <div className="pin-card-header">
                <span className="pin-badge-title">{t('inicio.pinTitulo')}</span>
              </div>

              <form className="pin-form" onSubmit={handlePinSubmit}>
                <div className="pin-input-container">
                  <input
                    type="text"
                    maxLength={20}
                    placeholder={t('inicio.pinPlaceholder')}
                    className="pin-input"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                    disabled={cargando}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-pin-submit"
                  disabled={cargando || !pin.trim()}
                >
                  <span>{cargando ? t('inicio.buscando') : t('inicio.entrar')}</span>
                </button>
              </form>

              {errorMsg && (
                <div style={{ marginTop: 12, color: '#DC2626', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}
            </section>
          )}

          {/* PASO 2: INTRODUCE APODO / NOMBRE */}
          {step === 'NICKNAME' && (
            <section className="pin-section-card" aria-label={t('inicio.apodoAria')}>
              <div className="pin-card-header">
                <span className="pin-badge-title">{t('inicio.apodoTitulo', { pin })}</span>
              </div>

              <form className="pin-form" onSubmit={handleNicknameSubmit}>
                <div className="pin-input-container">
                  <input
                    type="text"
                    maxLength={18}
                    placeholder={t('inicio.apodoPlaceholder')}
                    className="pin-input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                    autoFocus
                    disabled={cargando}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-pin-submit"
                  disabled={cargando || !nickname.trim()}
                >
                  <span>{cargando ? t('inicio.entrando') : t('inicio.listoEntrar')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('PIN'); setErrorMsg(null); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#4B5563',
                    fontSize: 12,
                    fontWeight: 700,
                    marginTop: 8,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {t('inicio.cambiarPin')}
                </button>
              </form>

              {errorMsg && (
                <div style={{ marginTop: 12, color: '#DC2626', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}
            </section>
          )}

          {/* SECCIÓN INFERIOR: JUGAR SIN PIN (SELECTOR DE JUEGOS MODO HISTORIETA Y MODO JUICIO) */}
          <section className="solo-section-card" aria-label={t('inicio.jugarSinPinAria')}>
            <div style={{ textAlign: 'center', marginBottom: 2 }}>
              <h2 className="solo-title" style={{ margin: 0, fontSize: 16 }}>
                {t('inicio.jugarSinPinTitulo')}
              </h2>
            </div>

            <div className="solo-games-grid">
              {[
                { href: '/novela', tag: t('inicio.juegoHistoriaTag'), title: t('inicio.juegoHistoriaTitulo'), bg: '#FEF08A', color: '#854D0E', icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></> },
                { href: '/experiments/cid-table', tag: t('inicio.juegoFamiliaTag'), title: t('inicio.juegoFamiliaTitulo'), bg: '#D1FAE5', color: '#047857', icon: <><ellipse cx="12" cy="12" rx="7" ry="4.5"/><circle cx="12" cy="4" r="1.6"/><circle cx="12" cy="20" r="1.6"/><circle cx="3" cy="12" r="1.6"/><circle cx="21" cy="12" r="1.6"/></> },
                { href: '/experiments/caja-arena', tag: t('inicio.juegoArenaTag'), title: t('inicio.juegoArenaTitulo'), bg: '#FFEDD5', color: '#C2410C', icon: <><path d="M4 7c0-1.5 1-2.5 2.5-2.5L9 7h3.5c2.5 0 4.5 2 4.5 4.5V13l3 1v3h-3l-1 3H8l-1-3H5.5L4 13z"/><circle cx="7.5" cy="8.5" r=".7" fill="currentColor"/></> },
                { href: '/novela?avatar=1', tag: t('inicio.juegoAvatarTag'), title: t('inicio.juegoAvatarTitulo'), bg: '#EDE9FE', color: '#6D28D9', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
              ].map((g) => (
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

      {/* Pie de página */}
      <footer className="kahoot-footer">
        <div className="footer-inner">
          <div className="footer-links-row">
            <a href="https://www.ucm.es/" target="_blank" rel="noopener noreferrer" className="footer-link">UCM</a>
            <span>•</span>
            <a href="https://dataforumjusticia.es/datathon-2026/" target="_blank" rel="noopener noreferrer" className="footer-link">Datathon Justicia</a>
            <span>•</span>
            <a href="https://www.administraciondejusticia.gob.es/" target="_blank" rel="noopener noreferrer" className="footer-link">{t('inicio.pieAdminJusticia')}</a>
            <span>•</span>
            <Link href="/asistentes-sociales" className="footer-link">Pide ayuda</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
