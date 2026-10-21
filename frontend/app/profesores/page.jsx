'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SalaEsperaAlumnos from '../../components/SalaEsperaAlumnos'
import { crearSala } from '../../lib/api'
import { getWsBaseUrl, createGameSocket } from '../../lib/socket'

export default function ApartadoProfesores({ initialPin = null }) {
  const router = useRouter()
  const [pin, setPin] = useState(initialPin)
  const [token, setToken] = useState('')
  const [roomState, setRoomState] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const socketRef = useRef(null)

  // Recuperar sesión activa si se pasa initialPin o hay una sala abierta en sesión
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Revisar si viene por query param ?sala= o props
    const searchParams = new URLSearchParams(window.location.search)
    const urlPin = initialPin || searchParams.get('sala')

    if (urlPin) {
      const cleanUrlPin = String(urlPin).replace(/\s+/g, '').trim()
      const storedToken = sessionStorage.getItem(`host_token_${cleanUrlPin}`)
      if (storedToken) {
        setPin(cleanUrlPin)
        setToken(storedToken)
      }
    }
  }, [initialPin])

  // Conexión WebSocket del anfitrión cuando hay PIN y Token
  useEffect(() => {
    if (!token || !pin) return

    const cleanPin = String(pin).replace(/\s+/g, '').trim()
    const wsBase = getWsBaseUrl()
    const wsUrl = `${wsBase}/ws/host/${cleanPin}?token=${token}`

    const socket = createGameSocket({
      url: wsUrl,
      onMessage: (data) => {
        if (data.event === 'ROOM_STATE') {
          setRoomState(data)
        }
      },
      onError: () => {
        setError('Error en la conexión con la sala en tiempo real.')
      },
      onClose: () => {
        // createGameSocket gestiona reconexión
      },
    })

    socketRef.current = socket

    return () => {
      socket.close()
    }
  }, [token, pin])

  // Activar y solicitar código automático desde el portal
  const handleSolicitarCodigo = async (modo = 'general') => {
    setCargando(true)
    setError(null)
    try {
      const res = await crearSala(modo)
      const cleanPin = String(res.pin).replace(/\s+/g, '').trim()
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`host_token_${cleanPin}`, res.host_token)
        sessionStorage.setItem('current_teacher_pin', cleanPin)
        window.history.replaceState(null, '', `/profesores?sala=${cleanPin}`)
      }
      setToken(res.host_token)
      setPin(cleanPin)
    } catch (err) {
      setError(err.message || 'No se pudo generar el código de clase.')
    } finally {
      setCargando(false)
    }
  }

  const handleCerrarSala = () => {
    socketRef.current?.close()
    socketRef.current = null
    if (typeof window !== 'undefined' && pin) {
      sessionStorage.removeItem(`host_token_${pin}`)
      sessionStorage.removeItem('current_teacher_pin')
      window.history.replaceState(null, '', '/profesores')
    }
    setPin(null)
    setToken('')
    setRoomState(null)
    setError(null)
  }

  const handleLaunchGame = (url, gameName) => {
    socketRef.current?.send('LAUNCH_GAME', { url, game: gameName })
    router.push(url)
  }

  const cleanPin = pin ? String(pin).replace(/\s+/g, '').trim() : ''
  const formattedPin = cleanPin.length === 6 ? `${cleanPin.slice(0, 3)} ${cleanPin.slice(3)}` : cleanPin

  // =========================================================================
  // SALA ACTIVA EN LOBBY: SE MUESTRA EL AULA Y LOS BOTONES PARA LANZAR CADA JUEGO
  // =========================================================================
  if (pin && roomState?.state === 'LOBBY') {
    const playersCount = roomState.players?.length || 0

    const launcherActions = (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="btn-sala-iniciar"
          style={{ background: '#3B82F6', color: '#FFFFFF' }}
          onClick={() => handleLaunchGame('/novela', 'novela')}
          title="Lanzar la aventura interactiva de Sara a los alumnos conectados"
        >
          Lanzar «Sara» {playersCount > 0 ? `(${playersCount})` : ''}
        </button>
      </div>
    )

    return (
      <SalaEsperaAlumnos
        pin={formattedPin}
        cleanPin={cleanPin}
        students={roomState.players || []}
        isHost={true}
        customActions={launcherActions}
        onVolver={handleCerrarSala}
        capacidad={roomState.capacidad_aula}
        modoInfinito={roomState.modo_infinito}
        onCapacidadChange={(nuevaCapacidad, nuevoModoInfinito) => {
          setRoomState((prev) => prev ? { ...prev, capacidad_aula: nuevaCapacidad, modo_infinito: nuevoModoInfinito } : prev)
          socketRef.current?.send('UPDATE_CAPACITY', {
            capacidad: nuevaCapacidad,
            capacidad_aula: nuevaCapacidad,
            modo_infinito: nuevoModoInfinito,
          })
        }}
      />
    )
  }

  // Si se solicitó código pero está conectando con el WebSocket
  if (pin && !roomState) {
    return (
      <div className="kahoot-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          background: '#FFFFFF',
          border: 'none',
          borderRadius: 24,
          padding: '36px 32px',
          maxWidth: 480,
          textAlign: 'center',
          boxShadow: '0 16px 32px rgba(0,0,0,0.3)',
        }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#4A1A1C', margin: '0 0 12px' }}>
            Iniciando Aula Virtual...
          </h2>
          <button
            type="button"
            onClick={handleCerrarSala}
            style={{
              background: '#EF4444',
              color: '#FFFFFF',
              border: '2px solid #18181B',
              borderRadius: 12,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // ESTADO INICIAL: PORTAL DE PROFESORES LIMPIO (CENTRADO EN EL MEDIO DE ALTURA)
  // =========================================================================
  return (
    <div className="kahoot-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div className="kahoot-bg-canvas" aria-hidden="true">
        <div className="bg-wave-left" />
        <div className="bg-arc-right" />
        <div className="bg-sphere-glow" />
      </div>

      <header className="kahoot-topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }}>
        <Link href="/" className="btn-back-home" aria-label="Volver al inicio">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Inicio</span>
        </Link>
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
        <div style={{ maxWidth: 680, width: '100%', textAlign: 'center' }}>
          <div
            style={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 28,
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.35)',
              padding: '36px 32px',
              color: '#18181B',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 8,
                background: 'linear-gradient(90deg, #FACC15 0%, #22C55E 50%, #4A1A1C 100%)',
              }}
            />

            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: '#FEF08A',
                border: '3px solid #18181B',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 0 #18181B',
                marginBottom: 16,
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4A1A1C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#4A1A1C', margin: '0 0 10px' }}>
              Portal de Profesores
            </h1>

            <p style={{ color: '#475569', fontSize: 16, lineHeight: 1.4, margin: '0 0 28px' }}>
              Solicita un código automático para abrir el aula virtual. Los alumnos se conectarán al instante con el PIN.
            </p>

            <button
              type="button"
              onClick={() => handleSolicitarCodigo('general')}
              disabled={cargando}
              style={{
                background: '#22C55E',
                color: '#0F172A',
                border: '3px solid #18181B',
                borderRadius: 18,
                padding: '16px 36px',
                fontSize: 18,
                fontWeight: 900,
                cursor: cargando ? 'wait' : 'pointer',
                boxShadow: '0 6px 0 #18181B',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 12,
                transition: 'transform 0.1s ease',
              }}
            >
              <span>{cargando ? 'Generando código...' : 'Solicitar código de clase'}</span>
            </button>

            {error && (
              <div
                style={{
                  marginTop: 18,
                  background: '#FEF2F2',
                  border: '2px solid #EF4444',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: '#B91C1C',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* ====================================================================
              LOS BOTONES GRANDES DE JUEGOS:
              1. Superior: "Modo historieta"
              ==================================================================== */}
          <div className="teacher-buttons-stack" style={{ marginTop: 28 }}>
            {/* BOTÓN SUPERIOR: MODO HISTORIETA */}
            <div className="teacher-game-btn teacher-game-btn--historia">
              <div className="game-btn-left">
                <div className="game-btn-icon-wrapper" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <div className="game-btn-text-group">
                  <span className="game-btn-badge">Narrativa & Toma de decisiones</span>
                  <span className="game-btn-title">Sara · Mi historia sigue</span>
                  <span className="game-btn-desc">
                    Acompaña a Sara en una historia sobre protección, apoyo y acceso a la justicia.
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleSolicitarCodigo('historieta')}
                  style={{
                    background: '#22C55E',
                    color: '#0F172A',
                    border: '2px solid #18181B',
                    borderRadius: 10,
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 2px 0 #18181B',
                  }}
                  title="Abrir sala multijugador con código PIN para que juegue toda la clase"
                >
                  Lanzar en el aula
                </button>
                <Link
                  href="/novela"
                  className="game-btn-action"
                  aria-label="Abrir la aventura de Sara"
                >
                  <span>Proyectar</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
