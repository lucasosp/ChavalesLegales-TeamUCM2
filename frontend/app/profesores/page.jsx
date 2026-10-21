'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import SalaEsperaAlumnos from '../../components/SalaEsperaAlumnos'
import PanelEducador from '../../components/PanelEducador'
import { crearSala } from '../../lib/api'
import { getWsBaseUrl, createGameSocket } from '../../lib/socket'

export default function ApartadoProfesores({ initialPin = null }) {
  const router = useRouter()
  const [pin, setPin] = useState(initialPin)
  const [token, setToken] = useState('')
  const [roomState, setRoomState] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [isAuth, setIsAuth] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('educador_auth') === 'true'
    }
    return false
  })
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
        <div style={{ maxWidth: 760, width: '100%', textAlign: 'center' }}>
          {isAuth ? (
            <PanelEducador
              onCerrarSesion={() => {
                setIsAuth(false)
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('educador_auth')
                }
              }}
            />
          ) : (
            <div
              style={{
                maxWidth: 580,
                margin: '0 auto',
                background: '#FFFFFF',
                border: '3px solid #18181B',
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
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>

              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#4A1A1C', margin: '0 0 10px' }}>
                Acceso para Educadores Sociales
              </h1>

              <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.4, margin: '0 0 24px' }}>
                Identifícate con tus credenciales profesionales para generar casos individualizados con IA y gestionar enlaces de intervención.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setIsAuth(true)
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('educador_auth', 'true')
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
                    Email profesional o colegial
                  </label>
                  <input
                    type="email"
                    defaultValue="educador.social@chavaleslegales.es"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '2px solid #18181B',
                      fontSize: 14,
                      fontWeight: 600,
                      background: '#F8FAFC',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
                    Clave de acreditación
                  </label>
                  <input
                    type="password"
                    defaultValue="demo1234"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '2px solid #18181B',
                      fontSize: 14,
                      fontWeight: 600,
                      background: '#F8FAFC',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    marginTop: 10,
                    background: '#22C55E',
                    color: '#0F172A',
                    border: '3px solid #18181B',
                    borderRadius: 16,
                    padding: '14px 24px',
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 5px 0 #18181B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <span>Acceder al Panel de Casos</span>
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
