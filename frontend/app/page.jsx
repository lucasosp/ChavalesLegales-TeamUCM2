'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getInfoSala, unirseASala } from '../lib/api'
import { getWsBaseUrl, createGameSocket } from '../lib/socket'
import SalaEsperaAlumnos from '../components/SalaEsperaAlumnos'

export default function Home() {
  const router = useRouter()
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

  const handleSoloGameSelect = (gameKey) => {
    // De momento no navega; listo para enlazar próximamente (ej. /historia o /juicio)
    setSelectedSoloGame((prev) => (prev === gameKey ? null : gameKey))
  }

  // =========================================================================
  // PASO 1: VALIDAR PIN CON EL BACKEND
  // =========================================================================
  const handlePinSubmit = async (e) => {
    e.preventDefault()
    const cleanPin = pin.replace(/\s+/g, '').trim()
    if (!cleanPin) return

    setCargando(true)
    setErrorMsg(null)
    try {
      const info = await getInfoSala(cleanPin)
      if (!info.is_open) {
        throw new Error('La partida ya ha comenzado en esta sala.')
      }
      setPin(cleanPin)
      setStep('NICKNAME')
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo conectar a la sala con ese PIN.')
    } finally {
      setCargando(false)
    }
  }

  // =========================================================================
  // PASO 2: INTRODUCIR APODO Y UNIRSE EN EL BACKEND
  // =========================================================================
  const handleNicknameSubmit = async (e) => {
    e.preventDefault()
    const cleanNick = nickname.trim()
    if (!cleanNick) return

    setCargando(true)
    setErrorMsg(null)
    try {
      let miAvatar = {}
      if (typeof window !== 'undefined') {
        try {
          const guardado = localStorage.getItem('chavales_mi_avatar')
          if (guardado) miAvatar = JSON.parse(guardado)
        } catch {}
      }
      const res = await unirseASala(pin, cleanNick, miAvatar)
      setPlayerData(res)
      setStep('GAME')
    } catch (err) {
      setErrorMsg(err.message || 'Error al entrar en la sala.')
    } finally {
      setCargando(false)
    }
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
        setErrorMsg('Error en la conexión en directo con la sala.')
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
    const formattedPin = pin.length === 6 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin
    const player = gameState?.player || playerData

    const studentList = (gameState?.players && gameState.players.length > 0)
      ? gameState.players
      : (player ? [{
          id: player.id || player.player_id,
          nombre: player.nickname,
          seatIndex: player.seat_index,
          avatarTipo: player.avatar_tipo,
          baseType: player.base_type,
          colorPelo: player.color_pelo,
          colorRopa: player.color_ropa,
          tieneGorro: player.tiene_gorro,
        }] : [])

    return (
      <SalaEsperaAlumnos
        pin={formattedPin}
        cleanPin={pin}
        students={studentList}
        isHost={false}
        currentSeat={player?.seat_index ?? (player?.seatIndex ?? 0)}
        roomUrl={`http://localhost:3001/profesores/sala/${pin}`}
        onVolver={handleSalirPartida}
        onUpdateAvatar={(nuevoAvatar) => {
          socketRef.current?.send('UPDATE_AVATAR', {
            baseType: nuevoAvatar.baseType,
            base_type: nuevoAvatar.baseType,
            colorPelo: nuevoAvatar.colorPelo,
            color_pelo: nuevoAvatar.colorPelo,
            colorRopa: nuevoAvatar.colorRopa,
            color_ropa: nuevoAvatar.colorRopa,
            tieneGorro: nuevoAvatar.tieneGorro,
            tiene_gorro: nuevoAvatar.tieneGorro,
          })
        }}
        capacidad={gameState?.capacidad_aula ?? playerData?.capacidad_aula}
        modoInfinito={gameState?.modo_infinito ?? playerData?.modo_infinito}
      />
    )
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

      {/* Acceso a profesores en la barra superior */}
      <header className="kahoot-topbar">
        <Link
          href="/profesores"
          className="btn-pro-opt1"
          aria-label="Acceso a profesores"
        >
          <span className="pro-icon-chip" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18C5 19.94 8.13 22 12 22C15.87 22 19 19.94 19 17.18V13.18L12 17L5 13.18Z" />
            </svg>
          </span>
          <span className="pro-label">Acceso a profesores</span>
          <span className="pro-arrow" aria-hidden="true">→</span>
        </Link>
      </header>

      {/* Contenido principal */}
      <main className="kahoot-main-content">
        <div className="kahoot-title-wrapper">
          <Link href="/" className="brand-title-link" style={{ textDecoration: 'none' }}>
            <h1 className="brand-title" aria-label="Chavales Legales">
              <span className="title-left-col">
                <span className="title-word">CHAVAL</span>
                <span className="title-word">LEGAL</span>
              </span>
              <span className="title-suffix-es">ES</span>
            </h1>
          </Link>
        </div>

        <div className="kahoot-sections-stack">
          {/* PASO 1: INTRODUCE PIN */}
          {step === 'PIN' && (
            <section className="pin-section-card" aria-label="Acceso por PIN a sesiones">
              <div className="pin-card-header">
                <span className="pin-badge-title">PIN DE LA SESIÓN</span>
              </div>

              <form className="pin-form" onSubmit={handlePinSubmit}>
                <div className="pin-input-container">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={9}
                    placeholder="Introduce el PIN"
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
                  <span>{cargando ? 'Buscando...' : 'Entrar'}</span>
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
            <section className="pin-section-card" aria-label="Elegir apodo de clase">
              <div className="pin-card-header">
                <span className="pin-badge-title">SALA {pin} · TU NOMBRE</span>
              </div>

              <form className="pin-form" onSubmit={handleNicknameSubmit}>
                <div className="pin-input-container">
                  <input
                    type="text"
                    maxLength={18}
                    placeholder="¿Cómo te llamas en clase?"
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
                  <span>{cargando ? 'Entrando...' : '¡Listo! Entrar'}</span>
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
                  Cambiar PIN
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
          <section className="solo-section-card" aria-label="Jugar sin PIN">
            <div style={{ textAlign: 'center', marginBottom: 2 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#4A1A1C',
                  background: '#FEF08A',
                  border: '1.5px solid #18181B',
                  borderRadius: 999,
                  padding: '2px 10px',
                  marginBottom: 6,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Modo Individual
              </span>
              <h2 className="solo-title" style={{ margin: 0, fontSize: 16 }}>
                Jugar sin PIN · Elige un modo
              </h2>
            </div>

            <div className="solo-games-grid">
              {[
                { href: '/novela', tag: 'Historia', title: 'Sara · Mi historia sigue', bg: '#FEF08A', color: '#854D0E', icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></> },
                { href: '/experiments/cid-table', tag: 'Familia', title: 'La mesa de la familia', bg: '#D1FAE5', color: '#047857', icon: <><ellipse cx="12" cy="12" rx="7" ry="4.5"/><circle cx="12" cy="4" r="1.6"/><circle cx="12" cy="20" r="1.6"/><circle cx="3" cy="12" r="1.6"/><circle cx="21" cy="12" r="1.6"/></> },
                { href: '/experiments/caja-arena', tag: 'Caja de arena', title: 'Mi mundo con perros', bg: '#FFEDD5', color: '#C2410C', icon: <><path d="M4 7c0-1.5 1-2.5 2.5-2.5L9 7h3.5c2.5 0 4.5 2 4.5 4.5V13l3 1v3h-3l-1 3H8l-1-3H5.5L4 13z"/><circle cx="7.5" cy="8.5" r=".7" fill="currentColor"/></> },
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
          <p className="footer-highlight">Chavales Legales · Tu escudo digital</p>
          <div className="footer-links-row">
            <a href="https://www.ucm.es/" target="_blank" rel="noopener noreferrer" className="footer-link">UCM</a>
            <span>•</span>
            <a href="https://www.juventudinfancia.gob.es/" target="_blank" rel="noopener noreferrer" className="footer-link">Infancia y juventud</a>
            <span>•</span>
            <a href="https://www.administraciondejusticia.gob.es/" target="_blank" rel="noopener noreferrer" className="footer-link">Administración de Justicia</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
