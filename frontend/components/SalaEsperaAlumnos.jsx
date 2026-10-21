'use client'

import { useState, useEffect } from 'react'
import AvatarGeometrico from './AvatarGeometrico'
import { useT } from '../lib/i18n'

const TOTAL_SEATS = 12

const NOMBRES_MOCK = [
  'Lucía M.',
  'Mateo G.',
  'Sofía R.',
  'Hugo V.',
  'Martina D.',
  'Alejandro P.',
  'Valeria S.',
  'Lucas B.',
  'Emma C.',
  'Daniel T.',
  'Carla N.',
  'Pablo J.',
]

const OPCIONES_PELO = [
  { id: 'castano', label: 'Castaño', hex: '#4A2810' },
  { id: 'rubio', label: 'Rubio', hex: '#FACC15' },
  { id: 'oscuro', label: 'Oscuro', hex: '#18181B' },
  { id: 'pelirrojo', label: 'Pelirrojo', hex: '#B03921' },
  { id: 'verde', label: 'Verde', hex: '#86EFAC' },
  { id: 'rosa', label: 'Rosa', hex: '#F472B6' },
]

const OPCIONES_ROPA = [
  { id: 'granate', label: 'Granate', hex: '#4A1A1C' },
  { id: 'verdeBosque', label: 'Verde bosque', hex: '#3D4A27' },
  { id: 'amarillo', label: 'Amarillo', hex: '#FACC15' },
  { id: 'verdeClaro', label: 'Verde claro', hex: '#86EFAC' },
  { id: 'naranja', label: 'Naranja', hex: '#B03921' },
  { id: 'azul', label: 'Azul', hex: '#1E3A8A' },
]

const BASES_DISPONIBLES = [1, 3, 4, 5, 6]

const BASES_CATALOGO = [
  { id: 1, label: 'Curioso' },
  { id: 3, label: 'Sabio' },
  { id: 4, label: 'Coleta' },
  { id: 5, label: 'Diadema' },
  { id: 6, label: 'Legalín' },
]

// Genera un avatar aleatorio con la paleta de colores corporativa
function generarAvatarAleatorio(nombre = 'Tú') {
  const baseType = BASES_DISPONIBLES[Math.floor(Math.random() * BASES_DISPONIBLES.length)]
  const colorPelo = OPCIONES_PELO[Math.floor(Math.random() * OPCIONES_PELO.length)].hex
  const tieneGorro = Math.random() > 0.5
  const colorRopa = OPCIONES_ROPA[Math.floor(Math.random() * OPCIONES_ROPA.length)].hex

  return {
    nombre,
    baseType,
    colorPelo,
    tieneGorro,
    colorRopa,
  }
}

// Coordenadas fijas para las 12 sillas en 3 filas de 4
const SEAT_COORDS = [
  // Fila 1 (fondo)
  { id: 0, x: 155, y: 195, row: 1 },
  { id: 1, x: 370, y: 195, row: 1 },
  { id: 2, x: 590, y: 195, row: 1 },
  { id: 3, x: 805, y: 195, row: 1 },
  // Fila 2 (centro)
  { id: 4, x: 155, y: 330, row: 2 },
  { id: 5, x: 370, y: 330, row: 2 },
  { id: 6, x: 590, y: 330, row: 2 },
  { id: 7, x: 805, y: 330, row: 2 },
  // Fila 3 (frente)
  { id: 8, x: 155, y: 465, row: 3 },
  { id: 9, x: 370, y: 465, row: 3 },
  { id: 10, x: 590, y: 465, row: 3 },
  { id: 11, x: 805, y: 465, row: 3 },
]

// Generación dinámica de coordenadas de asientos para cualquier capacidad
function getSeatCoords(totalSeats) {
  const X_COLS = [155, 370, 590, 805]
  const Y_START = 195
  const Y_STEP = 135
  const seats = []
  for (let i = 0; i < totalSeats; i++) {
    const col = i % 4
    const row = Math.floor(i / 4) + 1
    seats.push({
      id: i,
      x: X_COLS[col],
      y: Y_START + (row - 1) * Y_STEP,
      row,
    })
  }
  return seats
}

export default function SalaEsperaAlumnos({
  pin = '734 912',
  cleanPin: rawCleanPin,
  students: externalStudents,
  onVolver,
  onIniciar,
  customActions,
  isHost = false,
  currentSeat = null,
  roomUrl = '',
  onUpdateAvatar,
  capacidad: externalCapacidad = null,
  modoInfinito: externalModoInfinito = null,
  onCapacidadChange,
}) {
  const t = useT()
  const isLive = Array.isArray(externalStudents)
  const cleanPin = rawCleanPin || (pin ? String(pin).replace(/\s+/g, '') : '')

  // Estado para la capacidad del aula y modo infinito (sincronizado con backend)
  const [localCapacidadAula, setLocalCapacidadAula] = useState(TOTAL_SEATS)
  const [localModoInfinito, setLocalModoInfinito] = useState(false)

  const capacidadAula = externalCapacidad !== null && externalCapacidad !== undefined
    ? externalCapacidad
    : localCapacidadAula

  const modoInfinito = externalModoInfinito !== null && externalModoInfinito !== undefined
    ? externalModoInfinito
    : localModoInfinito

  // Mantener sincronizado el estado local si cambian las props externas
  useEffect(() => {
    if (externalCapacidad !== null && externalCapacidad !== undefined) {
      setLocalCapacidadAula(externalCapacidad)
    }
  }, [externalCapacidad])

  useEffect(() => {
    if (externalModoInfinito !== null && externalModoInfinito !== undefined) {
      setLocalModoInfinito(externalModoInfinito)
    }
  }, [externalModoInfinito])

  const aumentarCapacidad = () => {
    const nueva = capacidadAula + 4
    setLocalCapacidadAula(nueva)
    if (onCapacidadChange) {
      onCapacidadChange(nueva, modoInfinito)
    }
  }

  const disminuirCapacidad = () => {
    const count = isLive ? (externalStudents?.length || 0) : (mockStudents?.length || 0)
    const minOcupado = Math.ceil(count / 4) * 4 || 4
    const nueva = Math.max(minOcupado, capacidadAula - 4)
    setLocalCapacidadAula(nueva)
    if (onCapacidadChange) {
      onCapacidadChange(nueva, modoInfinito)
    }
  }

  const toggleModoInfinito = () => {
    const nuevo = !modoInfinito
    setLocalModoInfinito(nuevo)
    if (onCapacidadChange) {
      onCapacidadChange(capacidadAula, nuevo)
    }
  }

  const [mostrarPersonalizador, setMostrarPersonalizador] = useState(false)

  // Configuración del avatar del alumno actual (recupera de localStorage o genera aleatorio)
  const [miAvatar, setMiAvatar] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const guardado = localStorage.getItem('chavales_mi_avatar')
        if (guardado) return JSON.parse(guardado)
      } catch {}
    }
    return generarAvatarAleatorio('Tú')
  })

  // Estado del avatar confirmado que se visualiza en el pupitre
  const [avatarConfirmado, setAvatarConfirmado] = useState(miAvatar)

  const miAsiento = currentSeat !== null && currentSeat !== undefined ? currentSeat : 0

  // Estado local para los alumnos en la sala de espera simulada
  const [mockStudents, setMockStudents] = useState(() => {
    return [
      {
        id: 'player-1',
        nombre: miAvatar.nombre || 'Tú',
        seatIndex: miAsiento,
        baseType: miAvatar.baseType,
        colorPelo: miAvatar.colorPelo,
        tieneGorro: miAvatar.tieneGorro,
        colorRopa: miAvatar.colorRopa,
        isPlayer: true,
      },
    ]
  })

  // Al confirmar el avatar modificado, actualiza el pupitre y notifica cambios
  const confirmarMiAvatar = () => {
    setMostrarPersonalizador(false)
    setAvatarConfirmado(miAvatar)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chavales_mi_avatar', JSON.stringify(miAvatar))
      } catch {}
    }

    if (onUpdateAvatar) {
      onUpdateAvatar(miAvatar)
    }

    setMockStudents((prev) => {
      const alumnoJugador = {
        id: 'player-1',
        nombre: miAvatar.nombre || 'Tú',
        seatIndex: miAsiento,
        baseType: miAvatar.baseType,
        colorPelo: miAvatar.colorPelo,
        tieneGorro: miAvatar.tieneGorro,
        colorRopa: miAvatar.colorRopa,
        isPlayer: true,
      }
      const sinMiAsiento = prev.filter((s) => s.seatIndex !== miAsiento)
      return [alumnoJugador, ...sinMiAsiento]
    })
  }

  // Cancelar personalización y revertir a la versión confirmada
  const cancelarPersonalizacion = () => {
    setMostrarPersonalizador(false)
    setMiAvatar(avatarConfirmado)
  }

  // Abrir modal asegurando sincronización con el confirmado
  const abrirPersonalizador = () => {
    setMiAvatar(avatarConfirmado)
    setMostrarPersonalizador(true)
  }

  // Genera otro avatar aleatorio dentro del modal
  const aleatorizarMiAvatar = () => {
    const nuevo = generarAvatarAleatorio(miAvatar.nombre || 'Tú')
    setMiAvatar(nuevo)
  }

  // Simulación de entrada paulatina de compañeros bots cada 2-3 segundos solo si NO estamos en vivo
  useEffect(() => {
    if (isLive) return
    if (mockStudents.length >= capacidadAula) return

    const timer = setTimeout(() => {
      setMockStudents((prev) => {
        if (prev.length >= capacidadAula) return prev

        // Buscar siguiente asiento libre
        const asientosOcupados = prev.map((s) => s.seatIndex)
        let siguienteAsiento = 0
        for (let i = 0; i < capacidadAula; i++) {
          if (!asientosOcupados.includes(i)) {
            siguienteAsiento = i
            break
          }
        }

        // Generar alumno ficticio con avatar paramétrico aleatorio
        const nuevo = {
          id: `bot-${siguienteAsiento + 1}`,
          nombre: NOMBRES_MOCK[siguienteAsiento % NOMBRES_MOCK.length] || t('sala.alumnoN', { n: siguienteAsiento + 1 }),
          seatIndex: siguienteAsiento,
          baseType: BASES_DISPONIBLES[siguienteAsiento % BASES_DISPONIBLES.length],
          colorPelo: OPCIONES_PELO[siguienteAsiento % OPCIONES_PELO.length].hex,
          tieneGorro: siguienteAsiento % 2 === 0,
          colorRopa: OPCIONES_ROPA[(siguienteAsiento + 1) % OPCIONES_ROPA.length].hex,
          isPlayer: false,
        }
        return [...prev, nuevo]
      })
    }, 2400)

    return () => clearTimeout(timer)
  }, [isLive, mockStudents.length, capacidadAula])

  // Helpers para testing rápido
  const reiniciarAula = () => {
    // Mantener al jugador en el asiento 0 y vaciar el resto
    const jugador = mockStudents.find((s) => s.isPlayer)
    setMockStudents(jugador ? [jugador] : [])
  }

  const llenarAula = () => {
    const currentCoords = getSeatCoords(capacidadAula)
    const todos = currentCoords.map((seat, idx) => {
      if (idx === miAsiento) {
        const activo = avatarConfirmado || miAvatar
        return {
          id: 'player-1',
          nombre: activo.nombre || 'Tú',
          seatIndex: miAsiento,
          baseType: activo.baseType,
          colorPelo: activo.colorPelo,
          tieneGorro: activo.tieneGorro,
          colorRopa: activo.colorRopa,
          isPlayer: true,
        }
      }
      return {
        id: `bot-${idx + 1}`,
        nombre: NOMBRES_MOCK[idx % NOMBRES_MOCK.length] || t('sala.alumnoN', { n: idx + 1 }),
        seatIndex: idx,
        baseType: BASES_DISPONIBLES[idx % BASES_DISPONIBLES.length],
        colorPelo: OPCIONES_PELO[idx % OPCIONES_PELO.length].hex,
        tieneGorro: idx % 2 === 0,
        colorRopa: OPCIONES_ROPA[idx % OPCIONES_ROPA.length].hex,
        isPlayer: false,
      }
    })
    setMockStudents(todos)
  }

  const students = isLive ? externalStudents : mockStudents
  const porcentajeLleno = Math.min(100, Math.round((students.length / capacidadAula) * 100))
  const seatCoords = getSeatCoords(capacidadAula)
  const numRows = Math.max(3, Math.ceil(capacidadAula / 4))
  const svgHeight = 195 + (numRows - 1) * 135 + 95

  // Modo Infinito: añade automáticamente una fila de pupitres vacíos cuando se llena el aforo
  useEffect(() => {
    if (modoInfinito && students.length >= capacidadAula) {
      const nueva = capacidadAula + 4
      setLocalCapacidadAula(nueva)
      if (isHost && onCapacidadChange) {
        onCapacidadChange(nueva, modoInfinito)
      }
    }
  }, [modoInfinito, students.length, capacidadAula, isHost, onCapacidadChange])

  return (
    <div className="sala-page-wrapper">
      <style>{`
        .sala-page-wrapper {
          min-height: 100vh;
          width: 100%;
          background: #F8F4EC;
          color: #18181B;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 0;
          box-sizing: border-box;
          position: relative;
        }

        .sala-card-container {
          width: 100%;
          max-width: 100%;
          min-height: 100vh;
          background: #F8F4EC;
          border-radius: 0;
          box-shadow: none;
          overflow: hidden;
          border: none;
          display: flex;
          flex-direction: column;
        }

        .sala-top-banner {
          background: #461020;
          color: #FFFFFF;
          padding: 16px 28px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.2);
        }

        .sala-badge-live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #3e6b32;
          border: 2px solid #608841;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .sala-dot-pulse {
          width: 9px;
          height: 9px;
          background: #86EFAC;
          border-radius: 50%;
          box-shadow: 0 0 10px #86EFAC;
          animation: pulseAnim 1.6s infinite ease-in-out;
        }

        .sala-title-main {
          font-size: 24px;
          font-weight: 800;
          margin: 6px 0 2px;
          color: #FFFFFF;
        }

        .sala-subtitle {
          font-size: 14px;
          color: #fdc623;
          font-weight: 500;
          margin: 0;
        }

        .sala-pin-pill {
          background: #FFFFFF;
          color: #18181B;
          border: 3px solid #18181B;
          border-radius: 16px;
          padding: 8px 18px;
          text-align: center;
          box-shadow: 0 4px 0 #18181B;
        }

        .sala-pin-label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          color: #3e6b32;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sala-pin-value {
          display: block;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #461020;
        }

        .sala-subbar {
          background: #FDFBF7;
          padding: 12px 28px;
          border-bottom: 2px solid #E2D9CC;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .sala-counter-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .sala-counter-text {
          font-size: 14px;
          font-weight: 700;
          color: #18181B;
        }

        .sala-progress-track {
          width: 140px;
          height: 12px;
          background: #E5E7EB;
          border-radius: 999px;
          overflow: hidden;
          border: 2px solid #18181B;
        }

        .sala-progress-fill {
          height: 100%;
          background: #608841;
          transition: width 0.4s ease;
        }

        .sala-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-sala-pill {
          background: #FFFFFF;
          border: 2px solid #18181B;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          color: #18181B;
          cursor: pointer;
          transition: transform 0.1s ease, background 0.15s ease;
        }

        .btn-sala-pill:hover {
          background: #fdc623;
          transform: translateY(-1px);
        }

        .btn-sala-pill:active {
          transform: translateY(1px);
        }

        .btn-avatar-edit {
          background: #fdc623;
          border: 2.5px solid #18181B;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 800;
          color: #18181B;
          cursor: pointer;
          box-shadow: 0 3px 0 #18181B;
          transition: transform 0.1s ease, background 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-avatar-edit:hover {
          background: #fed857;
          transform: translateY(-1px);
        }

        .btn-sala-volver {
          background: #461020;
          color: #FFFFFF;
          border: 2px solid #18181B;
          padding: 6px 14px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-sala-volver:hover {
          background: #3e6b32;
        }

        .btn-sala-iniciar {
          background: #608841;
          color: #FFFFFF;
          border: 2px solid #18181B;
          padding: 8px 18px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 4px 0 #18181B;
          transition: transform 0.1s ease, filter 0.15s ease;
        }

        .btn-sala-iniciar:hover:not(:disabled) {
          background: #74A152;
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #18181B;
        }

        .btn-sala-iniciar:disabled {
          background: #94A3B8;
          color: #475569;
          cursor: not-allowed;
          box-shadow: none;
        }

        .sala-canvas-stage {
          background: #F8F4EC;
          position: relative;
          width: 100%;
          flex: 1;
          padding: 16px 20px 32px;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow-y: auto;
          min-height: calc(100vh - 150px);
        }

        .sala-canvas-stage::-webkit-scrollbar {
          width: 8px;
        }
        .sala-canvas-stage::-webkit-scrollbar-track {
          background: #EFE8DD;
          border-radius: 4px;
        }
        .sala-canvas-stage::-webkit-scrollbar-thumb {
          background: #C5B7A1;
          border-radius: 4px;
        }
        .sala-canvas-stage::-webkit-scrollbar-thumb:hover {
          background: #461020;
        }

        .classroom-svg {
          width: 100%;
          max-width: 1180px;
          height: auto;
          display: block;
          flex-shrink: 0;
        }

        .sala-aforo-controls {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          border: 2px solid #18181B;
          border-radius: 12px;
          padding: 3px 8px;
          box-shadow: 0 2px 0 #18181B;
        }

        .sala-aforo-label {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #461020;
        }

        .btn-aforo-stepper {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: 1.5px solid #18181B;
          background: #F4F1EA;
          color: #18181B;
          font-weight: 900;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          line-height: 1;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .btn-aforo-stepper:hover:not(:disabled) {
          background: #fdc623;
          transform: translateY(-1px);
        }

        .btn-aforo-stepper:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .sala-aforo-val {
          font-size: 13px;
          font-weight: 900;
          color: #18181B;
          min-width: 20px;
          text-align: center;
        }

        .btn-aforo-infinito {
          background: #F4F1EA;
          border: 1.5px solid #18181B;
          border-radius: 8px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 800;
          color: #18181B;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-left: 2px;
          transition: all 0.15s ease;
        }

        .btn-aforo-infinito:hover {
          background: #fdc623;
        }

        .btn-aforo-infinito.active {
          background: #608841;
          color: #FFFFFF;
          border-color: #3e6b32;
          box-shadow: 0 1px 0 #18181B;
        }

        .sala-footer-legal {
          background: #FFFFFF;
          border-top: 1px solid #E2D9CC;
          padding: 12px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 13px;
          color: #4B5563;
        }

        .sala-tip-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #3D4A27;
        }

        /* ==============================================================
           MODAL DE PERSONALIZACIÓN DE AVATAR (ESTILO KAHOOT / DUOLINGO)
           ============================================================== */
        .avatar-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(29, 4, 12, 0.78);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }

        .avatar-modal-card {
          background: #FFFFFF;
          width: 100%;
          max-width: 490px;
          border-radius: 28px;
          border: 4px solid #18181B;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 6px 0 #18181B;
          overflow: hidden;
          animation: popModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          background: #461020;
          color: #FFFFFF;
          padding: 16px 22px;
          border-bottom: 3px solid #18181B;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 900;
          margin: 0;
          color: #FFFFFF;
        }

        .modal-subtitle {
          font-size: 13px;
          color: #fdc623;
          margin-top: 2px;
          font-weight: 600;
        }

        .btn-modal-close {
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid #FFFFFF;
          color: #FFFFFF;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .btn-modal-close:hover {
          background: #b03921;
          transform: scale(1.08);
        }

        .modal-body {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .preview-box {
          background: #FAF6EE;
          border: 3px solid #18181B;
          border-radius: 22px;
          padding: 12px 24px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 240px;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.06);
          position: relative;
        }

        .btn-randomize-pill {
          background: #fdc623;
          border: 2px solid #18181B;
          color: #18181B;
          font-size: 11px;
          font-weight: 800;
          padding: 5px 14px;
          border-radius: 999px;
          margin-top: 6px;
          cursor: pointer;
          box-shadow: 0 2px 0 #18181B;
          transition: transform 0.1s ease, background 0.15s ease;
        }

        .btn-randomize-pill:hover {
          background: #fed857;
          transform: scale(1.05);
        }

        .selector-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .selector-label {
          font-size: 12px;
          font-weight: 800;
          color: #461020;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Galería visual con las caras de los 5 avatares */
        .base-faces-gallery {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          width: 100%;
        }

        .btn-face-card {
          background: #F4F1EA;
          border: 2.5px solid #18181B;
          border-radius: 16px;
          padding: 6px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 0 #18181B;
          transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.15s ease, box-shadow 0.15s ease;
        }

        .btn-face-card:hover {
          background: #FFFBEB;
          transform: translateY(-2px);
        }

        .btn-face-card.active {
          background: #FACC15;
          box-shadow: 0 4px 0 #18181B;
          transform: translateY(-3px);
          border-color: #18181B;
        }

        .swatches-row {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-swatch {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid #18181B;
          cursor: pointer;
          box-shadow: 0 2px 0 #18181B;
          transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-swatch.active {
          transform: scale(1.18);
          border-color: #18181B;
          box-shadow: 0 4px 0 #18181B;
        }

        .swatch-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 1.5px solid #18181B;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .btn-confirm-avatar {
          background: #3D4A27;
          color: #FFFFFF;
          border: 3px solid #18181B;
          border-radius: 16px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          width: 100%;
          box-shadow: 0 4px 0 #18181B;
          transition: transform 0.1s ease, background 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
        }

        .btn-confirm-avatar:hover {
          background: #4D5E33;
          transform: translateY(-2px);
        }

        .btn-confirm-avatar:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #18181B;
        }

        @keyframes pulseAnim {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
        }

        @keyframes popModal {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes dropInAvatar {
          0% {
            transform: translateY(-90px) scale(0.92, 1.08);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          65% {
            transform: translateY(7px) scale(1.07, 0.93);
          }
          82% {
            transform: translateY(-3px) scale(0.98, 1.02);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes nameFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .anim-drop-avatar,
        .anim-pop-avatar {
          animation: dropInAvatar 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: transform, opacity;
        }

        .anim-name-float {
          animation: nameFloat 3s ease-in-out infinite;
        }
      `}</style>

      {/* ==============================================================
          MODAL DE PERSONALIZACIÓN DE AVATAR (ABIERTO SOLO SI EL USUARIO QUIERE)
          ============================================================== */}
      {mostrarPersonalizador && (
        <div className="avatar-modal-overlay" onClick={cancelarPersonalizacion}>
          <div className="avatar-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{t('sala.modalTitle')}</h2>
                <p className="modal-subtitle">{t('sala.modalSubtitle')}</p>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={cancelarPersonalizacion}
                title={t('sala.cerrarSinGuardar')}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Previsualización en tiempo real y botón de re-roll aleatorio */}
              <div className="preview-box">
                <AvatarGeometrico
                  standalone
                  size={120}
                  baseType={miAvatar.baseType}
                  colorPelo={miAvatar.colorPelo}
                  tieneGorro={miAvatar.tieneGorro}
                  colorRopa={miAvatar.colorRopa}
                />
                <button
                  type="button"
                  className="btn-randomize-pill"
                  onClick={aleatorizarMiAvatar}
                  title={t('sala.generarAleatorioTitle')}
                >
                  {t('sala.generarAleatorio')}
                </button>
              </div>

              {/* Selector de tipo de base con galería visual de las 5 caras */}
              <div className="selector-section">
                <span className="selector-label">{t('sala.eligeBase')}</span>
                <div className="base-faces-gallery">
                  {BASES_CATALOGO.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={`btn-face-card ${miAvatar.baseType === b.id ? 'active' : ''}`}
                      onClick={() => setMiAvatar((prev) => ({ ...prev, baseType: b.id }))}
                      title={t(`sala.base_${b.id}`)}
                      aria-label={t(`sala.base_${b.id}`)}
                    >
                      <AvatarGeometrico
                        standalone
                        size={46}
                        baseType={b.id}
                        colorPelo={miAvatar.colorPelo}
                        colorRopa={miAvatar.colorRopa}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Opciones fijas de personalización para todos los avatares */}
              <div className="selector-section">
                <div>
                  <span className="selector-label" style={{ display: 'block', marginBottom: '8px' }}>
                    {t('sala.colorRopa')}
                  </span>
                  <div className="swatches-row">
                    {OPCIONES_ROPA.map((ropa) => (
                      <button
                        key={ropa.hex}
                        type="button"
                        className={`btn-swatch ${miAvatar.colorRopa === ropa.hex ? 'active' : ''}`}
                        style={{ background: ropa.hex }}
                        title={t(`sala.ropa_${ropa.id}`)}
                        onClick={() => setMiAvatar((prev) => ({ ...prev, colorRopa: ropa.hex }))}
                      >
                        {miAvatar.colorRopa === ropa.hex && (
                          <span className="swatch-indicator" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="selector-label" style={{ display: 'block', marginBottom: '8px' }}>
                    {t('sala.colorPelo')}
                  </span>
                  <div className="swatches-row">
                    {OPCIONES_PELO.map((pelo) => (
                      <button
                        key={pelo.hex}
                        type="button"
                        className={`btn-swatch ${miAvatar.colorPelo === pelo.hex ? 'active' : ''}`}
                        style={{ background: pelo.hex }}
                        title={t(`sala.pelo_${pelo.id}`)}
                        onClick={() => setMiAvatar((prev) => ({ ...prev, colorPelo: pelo.hex }))}
                      >
                        {miAvatar.colorPelo === pelo.hex && (
                          <span className="swatch-indicator" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón de confirmación */}
              <button
                type="button"
                className="btn-confirm-avatar"
                onClick={confirmarMiAvatar}
              >
                {t('sala.guardarCambios')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor blanco principal de la sala */}
      <div className="sala-card-container">
        {/* Cabecera superior con estado, URL de acceso y PIN */}
        <div className="sala-top-banner">
          <div>
            <div className="sala-badge-live">
              <span className="sala-dot-pulse" />
              <span>{isHost ? t('sala.salaAulaActiva') : t('sala.salaEspera')}</span>
            </div>
            <h1 className="sala-title-main" style={{ fontSize: 22, margin: '6px 0 0' }}>
              {t('sala.aulaVirtual')}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="sala-pin-pill">
              <span className="sala-pin-label">{t('sala.codigoPin')}</span>
              <span className="sala-pin-value">{pin || cleanPin}</span>
            </div>
          </div>
        </div>

        {/* Barra de progreso y acciones */}
        <div className="sala-subbar">
          <div className="sala-counter-wrap">
            <span className="sala-counter-text">
              {t('sala.alumnosEnAula')} <b>{students.length}</b> / {capacidadAula}
            </span>
            <div className="sala-progress-track">
              <div
                className="sala-progress-fill"
                style={{ width: `${porcentajeLleno}%` }}
              />
            </div>

            {/* Controles de gestión de aforo para el profesor */}
            {(isHost || !isLive) && (
              <div className="sala-aforo-controls">
                <span className="sala-aforo-label">{t('sala.aforo')}</span>
                <button
                  type="button"
                  className="btn-aforo-stepper"
                  onClick={disminuirCapacidad}
                  disabled={capacidadAula <= Math.max(4, students.length)}
                  title={t('sala.reducirPupitres')}
                >
                  -
                </button>
                <span className="sala-aforo-val">{capacidadAula}</span>
                <button
                  type="button"
                  className="btn-aforo-stepper"
                  onClick={aumentarCapacidad}
                  title={t('sala.anadirPupitres')}
                >
                  +
                </button>
                <button
                  type="button"
                  className={`btn-aforo-infinito ${modoInfinito ? 'active' : ''}`}
                  onClick={toggleModoInfinito}
                  title={modoInfinito ? t('sala.modoInfinitoActivo') : t('sala.activarModoInfinito')}
                >
                  ∞ {t('sala.modoInfinito')}
                </button>
              </div>
            )}

            {/* Indicador de pupitre y botón de personalización para el alumno */}
            {!isHost && currentSeat !== null && (
              <span
                style={{
                  background: '#FEF08A',
                  color: '#854D0E',
                  border: '1.5px solid #EAB308',
                  borderRadius: 999,
                  padding: '3px 12px',
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {t('sala.tuPupitre', { n: currentSeat + 1 })}
              </span>
            )}

            {!isHost && (
              <button
                type="button"
                className="btn-avatar-edit"
                onClick={abrirPersonalizador}
                title={t('sala.personalizarMiPersonaje')}
              >
                {t('sala.personalizarAvatar')}
              </button>
            )}
          </div>

          <div className="sala-actions">
            {!isLive ? (
              <>
                <button
                  type="button"
                  className="btn-sala-pill"
                  onClick={reiniciarAula}
                  title={t('sala.reiniciarTitle')}
                >
                  {t('sala.reiniciar')}
                </button>
                <button
                  type="button"
                  className="btn-sala-pill"
                  onClick={llenarAula}
                  title={t('sala.llenarAulaTitle')}
                >
                  {t('sala.llenarAula')}
                </button>
                {onVolver && (
                  <button
                    type="button"
                    className="btn-sala-volver"
                    onClick={onVolver}
                  >
                    {t('sala.volver')}
                  </button>
                )}
              </>
            ) : customActions ? (
              customActions
            ) : isHost && onIniciar ? (
              <button
                type="button"
                className="btn-sala-iniciar"
                onClick={onIniciar}
                title={t('sala.iniciarActividad')}
              >
                {t('sala.iniciarPartida', { n: students.length })}
              </button>
            ) : !isHost ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                  {t('sala.esperandoProfesorJuego')}
                </span>
                {onVolver && (
                  <button
                    type="button"
                    className="btn-sala-volver"
                    style={{ background: '#EF4444', borderColor: '#DC2626' }}
                    onClick={onVolver}
                  >
                    {t('sala.salir')}
                  </button>
                )}
              </div>
            ) : null}

            {isLive && isHost && onVolver && (
              <button
                type="button"
                className="btn-sala-volver"
                onClick={onVolver}
              >
                {t('sala.cerrarSala')}
              </button>
            )}
          </div>
        </div>

        {/* Escenario del aula en SVG puro */}
        <div className="sala-canvas-stage">
          <svg
            className="classroom-svg"
            viewBox={`0 0 960 ${svgHeight}`}
            style={{ minHeight: svgHeight, width: '100%', maxWidth: 1180 }}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#18181B" floodOpacity="0.18" />
              </filter>
              <filter id="deskShadow" x="-20%" y="-20%" width="140%" height="150%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#18181B" floodOpacity="0.12" />
              </filter>
            </defs>

            {/* SUELO Y PARED POLIGONAL DEL AULA */}
            {/* Pared superior cálida y limpia */}
            <rect x="0" y="0" width="960" height="116" fill="#FAF6EE" />
            <rect x="0" y="112" width="960" height="4" fill="#461020" />
            <rect x="0" y="116" width="960" height="8" fill="#E8DBC9" />

            {/* Suelo continuo y amplio */}
            <rect x="0" y="124" width="960" height={svgHeight - 124} fill="#F8F4EC" />
            {Array.from({ length: numRows }, (_, i) => {
              const lineY = 265 + i * 135
              return (
                <line
                  key={`floor-line-${i}`}
                  x1="40"
                  y1={lineY}
                  x2="920"
                  y2={lineY}
                  stroke="#EDE4D6"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              )
            })}

            {/* PIZARRA DIGITAL FRONTAL */}
            <g transform="translate(220, 18)">
              {/* Marco exterior en granate corporativo */}
              <rect x="0" y="0" width="520" height="82" rx="16" fill="#461020" stroke="#18181B" strokeWidth="2.5" />
              {/* Borde interior decorativo */}
              <rect x="6" y="6" width="508" height="70" rx="12" fill="#3e6b32" opacity="0.35" />
              {/* Fondo de pizarra verde oscura */}
              <rect x="8" y="8" width="504" height="66" rx="10" fill="#1F2E22" />

              {/* Repisa para tizas con tizas decorativas */}
              <rect x="170" y="74" width="180" height="5" rx="2.5" fill="#fdc623" />
              <rect x="190" y="70" width="18" height="4" rx="2" fill="#FFFFFF" />
              <rect x="215" y="70" width="16" height="4" rx="2" fill="#fdc623" />
              <rect x="295" y="68" width="24" height="6" rx="2" fill="#8C7A6B" />

              {/* Texto único requerido en la pizarra */}
              <g transform="translate(260, 42)">
                <circle cx="-168" cy="-1" r="5" fill="#608841" />
                <circle cx="-168" cy="-1" r="8" fill="#86EFAC" opacity="0.4" className="sala-dot-pulse" />
                <text
                  x="-152"
                  y="4"
                  textAnchor="start"
                  fill="#FFFFFF"
                  fontSize="15"
                  fontWeight="800"
                  letterSpacing="0.3"
                  fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
                >
                  {t('sala.esperandoProfesorPartida')}
                </text>
              </g>
            </g>

            {/* DECORACIÓN IZQUIERDA: MESA DE PROFESOR CON MARTILLO DE JUEZ */}
            <g transform="translate(42, 26)">
              <ellipse cx="65" cy="84" rx="55" ry="6" fill="#18181B" opacity="0.08" />
              <rect x="14" y="52" width="6" height="30" rx="3" fill="#2C2830" />
              <rect x="110" y="52" width="6" height="30" rx="3" fill="#2C2830" />
              <rect x="10" y="44" width="110" height="32" rx="8" fill="#EADBC6" />
              <rect x="16" y="50" width="98" height="20" rx="6" fill="#FDFBF7" />
              <circle cx="65" cy="60" r="6" fill="#461020" />
              <circle cx="65" cy="60" r="4" fill="#fdc623" />
              <rect x="0" y="38" width="130" height="12" rx="6" fill="#FFFDF9" stroke="#DFD2BD" strokeWidth="1.5" />
              {/* Libros en mesa de juez */}
              <rect x="18" y="30" width="30" height="8" rx="2" fill="#461020" />
              <rect x="20" y="23" width="26" height="7" rx="2" fill="#3e6b32" />
              <rect x="22" y="17" width="22" height="6" rx="2" fill="#fdc623" />
              {/* Martillo de juez apoyado plano sobre la mesa */}
              <g id="teacher-gavel">
                {/* Taco de golpeo apoyado sobre la mesa */}
                <rect x="70" y="33" width="22" height="5" rx="2.5" fill="#461020" />
                {/* Cabeza del martillo apoyada horizontal sobre la mesa */}
                <rect x="96" y="29" width="14" height="9" rx="3" fill="#461020" />
                <rect x="94.5" y="30.5" width="2" height="6" rx="1" fill="#fdc623" />
                {/* Mango horizontal apoyado */}
                <rect x="74" y="32" width="24" height="3" rx="1.5" fill="#fdc623" />
                <circle cx="73.5" cy="33.5" r="2.2" fill="#461020" />
              </g>
            </g>

            {/* DECORACIÓN DERECHA: PLANTA POLIGONAL Y RELOJ */}
            <g transform="translate(846, 20)">
              {/* Reloj flat */}
              <g transform="translate(18, 0)">
                <circle cx="22" cy="22" r="22" fill="#461020" />
                <circle cx="22" cy="22" r="18" fill="#FFFFFF" />
                <circle cx="22" cy="7" r="1.5" fill="#3e6b32" />
                <circle cx="22" cy="37" r="1.5" fill="#3e6b32" />
                <circle cx="7" cy="22" r="1.5" fill="#3e6b32" />
                <circle cx="37" cy="22" r="1.5" fill="#3e6b32" />
                <line x1="22" y1="22" x2="16" y2="14" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="22" y1="22" x2="31" y2="17" stroke="#fdc623" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="22" cy="22" r="2.5" fill="#b03921" />
              </g>

              {/* Planta flat */}
              <g transform="translate(18, 52)">
                <ellipse cx="22" cy="46" rx="18" ry="4" fill="#18181B" opacity="0.08" />
                <ellipse cx="10" cy="18" rx="10" ry="15" fill="#3e6b32" transform="rotate(-35 10 18)" />
                <ellipse cx="11" cy="17" rx="7" ry="12" fill="#608841" transform="rotate(-35 10 18)" />
                <ellipse cx="34" cy="18" rx="10" ry="15" fill="#3e6b32" transform="rotate(35 34 18)" />
                <ellipse cx="33" cy="17" rx="7" ry="12" fill="#608841" transform="rotate(35 34 18)" />
                <ellipse cx="22" cy="10" rx="9" ry="16" fill="#608841" />
                <ellipse cx="22" cy="10" rx="5" ry="12" fill="#86EFAC" opacity="0.5" />
                <line x1="22" y1="12" x2="22" y2="30" stroke="#3e6b32" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 9 24 L 35 24 L 31 44 L 13 44 Z" fill="#b03921" />
                <rect x="7" y="22" width="30" height="5" rx="2.5" fill="#C44830" />
              </g>
            </g>

            {/* ==========================================================
                RENDERIZADO DE LOS 12 PUPITRES / SILLAS
                (Renderizados de atrás hacia adelante para correcta oclusión)
               ========================================================== */}
            {seatCoords.map((seat) => {
              const student = students.find((s) => (s.seatIndex !== undefined ? s.seatIndex : s.seat_index) === seat.id)
              const { x, y } = seat
              const isMe = student && ((!isHost && (currentSeat !== null && currentSeat !== undefined ? (student.seatIndex !== undefined ? student.seatIndex : student.seat_index) === currentSeat : seat.id === 0)) || Boolean(student.isPlayer))
              const activeAvatar = isMe ? (avatarConfirmado || miAvatar) : student
              const activeBase = (activeAvatar && (activeAvatar.baseType ?? activeAvatar.base_type)) || (student && (student.baseType ?? student.base_type)) || (student && student.avatarTipo !== undefined ? BASES_DISPONIBLES[student.avatarTipo % BASES_DISPONIBLES.length] : 1)
              const activePelo = (activeAvatar && (activeAvatar.colorPelo ?? activeAvatar.color_pelo)) || (student && (student.colorPelo ?? student.color_pelo)) || OPCIONES_PELO[seat.id % OPCIONES_PELO.length].hex
              const activeRopa = (activeAvatar && (activeAvatar.colorRopa ?? activeAvatar.color_ropa)) || (student && (student.colorRopa ?? student.color_ropa)) || OPCIONES_ROPA[(seat.id + 1) % OPCIONES_ROPA.length].hex
              const activeGorro = activeAvatar ? Boolean(activeAvatar.tieneGorro !== undefined ? activeAvatar.tieneGorro : activeAvatar.tiene_gorro) : (student ? Boolean(student.tieneGorro !== undefined ? student.tieneGorro : student.tiene_gorro) : false)

              return (
                <g
                  key={`seat-${seat.id}`}
                  id={`desk-group-${seat.id}`}
                  onClick={isMe ? abrirPersonalizador : undefined}
                  style={{ cursor: isMe ? 'pointer' : 'default' }}
                >
                  {/* --- SILLA VACÍA (SIEMPRE DETRÁS DEL PUPITRE) --- */}
                  <g>
                    {/* Patas del respaldo */}
                    <rect x={x - 18} y={y - 6} width="5" height="14" rx="2.5" fill="#4B4552" />
                    <rect x={x + 13} y={y - 6} width="5" height="14" rx="2.5" fill="#4B4552" />
                    {/* Respaldo suave redondeado */}
                    <rect
                      x={x - 26}
                      y={y - 28}
                      width="52"
                      height="26"
                      rx="10"
                      fill={student ? '#608841' : '#E8DFD0'}
                      stroke={student ? '#3e6b32' : '#D2C5B4'}
                      strokeWidth="2"
                    />
                    {/* Brillo / relieve superior del respaldo */}
                    <rect
                      x={x - 20}
                      y={y - 26}
                      width="40"
                      height="5"
                      rx="2.5"
                      fill="#FFFFFF"
                      opacity={student ? 0.22 : 0.4}
                    />
                    {/* Cojín del asiento */}
                    <rect
                      x={x - 23}
                      y={y - 4}
                      width="46"
                      height="12"
                      rx="5"
                      fill={student ? '#3e6b32' : '#D6CBBA'}
                    />
                  </g>

                  {/* --- AVATAR GEOMÉTRICO (ESTILO DUOLINGO SIN CONTORNOS) --- */}
                  {student && (
                    <g
                      key={`avatar-seated-${student.id || student.player_id || seat.id}`}
                      className="anim-drop-avatar"
                      style={{ transformOrigin: `${x}px ${y}px` }}
                    >
                      <AvatarGeometrico
                        standalone={false}
                        x={x}
                        y={y}
                        baseType={activeBase}
                        colorPelo={activePelo}
                        tieneGorro={activeGorro}
                        colorRopa={activeRopa}
                      />
                    </g>
                  )}

                  {/* --- PUPITRE DE MADERA (EN FRENTE DEL ALUMNO) --- */}
                  <g>
                    {/* Sombra suave en el suelo */}
                    <ellipse cx={x} cy={y + 64} rx="56" ry="6" fill="#18181B" opacity="0.08" />

                    {/* Patas cilíndricas del pupitre */}
                    <rect x={x - 48} y={y + 36} width="7" height="26" rx="3.5" fill="#2C2830" />
                    <rect x={x + 41} y={y + 36} width="7" height="26" rx="3.5" fill="#2C2830" />
                    <ellipse cx={x - 44.5} cy={y + 62} rx="5.5" ry="2.5" fill="#18181B" />
                    <ellipse cx={x + 44.5} cy={y + 62} rx="5.5" ry="2.5" fill="#18181B" />
                    {/* Barra transversal */}
                    <rect x={x - 44} y={y + 49} width="88" height="4" rx="2" fill="#4B4552" />

                    {/* Tablero del pupitre con borde 2.5D redondeado */}
                    <rect
                      x={x - 64}
                      y={y + 6}
                      width="128"
                      height="30"
                      rx="10"
                      fill="#FFFDF9"
                      stroke="#E5DAC9"
                      strokeWidth="2"
                    />
                    {/* Canto frontal biselado de madera cálida */}
                    <rect
                      x={x - 62}
                      y={y + 26}
                      width="124"
                      height="9"
                      rx="4.5"
                      fill="#E8DEC9"
                    />
                  </g>

                  {/* --- ELEMENTO ENCIMA DEL PUPITRE (VACÍO O CON UTENSILIOS) --- */}
                  {!student ? (
                    <g>
                      <rect
                        x={x - 38}
                        y={y + 12}
                        width="76"
                        height="18"
                        rx="9"
                        fill="#F4EFE6"
                        stroke="#D5CBB9"
                        strokeWidth="1.5"
                      />
                      <circle cx={x - 26} cy={y + 21} r="3" fill="#B0A694" />
                      <text
                        x={x + 4}
                        y={y + 25}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="800"
                        fill="#7D715F"
                        letterSpacing="0.03em"
                        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
                      >
                        {t('sala.pupitreN', { n: seat.id + 1 })}
                      </text>
                    </g>
                  ) : (
                    <g>
                      {/* Manos apoyadas en la mesa estilo flat */}
                      <ellipse cx={x - 22} cy={y + 14} rx="4.5" ry="3.5" fill="#FDE0C5" />
                      <ellipse cx={x + 22} cy={y + 14} rx="4.5" ry="3.5" fill="#FDE0C5" />

                      {/* Utensilio sobre el pupitre */}
                      {renderDeskItem(x, y, seat.id)}
                    </g>
                  )}

                  {/* --- CARTEL FLOTANTE CON NOMBRE DEL ALUMNO --- */}
                  {student && (
                    <g
                      className="anim-name-float"
                      style={{ transformOrigin: `${x}px ${y - 60}px` }}
                    >
                      {/* Fondo blanco puro o dorado si es el alumno actual */}
                      <rect
                        x={x - (isMe ? 54 : 48)}
                        y={y - 74}
                        width={isMe ? 108 : 96}
                        height={24}
                        rx={12}
                        fill={isMe ? '#FEF08A' : '#FFFFFF'}
                        stroke={isMe ? '#CA8A04' : '#18181B'}
                        strokeWidth={isMe ? '2.8' : '2.2'}
                        filter="url(#cardShadow)"
                      />
                      {/* Punto verde de conexión */}
                      <circle cx={x - (isMe ? 40 : 36)} cy={y - 62} r={3.5} fill={isMe ? '#CA8A04' : '#608841'} />
                      {/* Nombre del alumno */}
                      <text
                        x={x + 4}
                        y={y - 58}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight={isMe ? '900' : '800'}
                        fill="#18181B"
                        letterSpacing="0.02em"
                      >
                        {isMe ? `${!student.nombre || student.nombre === 'Tú' ? t('sala.tu') : student.nombre} (${t('sala.tu')})` : student.nombre}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Pie informativo de la sala */}
        <div className="sala-footer-legal">
          <div className="sala-tip-badge">
            <span><b>{t('sala.consejoTitulo')}</b> {t('sala.consejoTexto')}</span>
          </div>

          <div>
            <span>{t('sala.ayuda')} <b>017</b> {t('sala.ayudaInfo')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function renderDeskItem(x, y, id) {
  const itemVariant = id % 3

  if (itemVariant === 0) {
    return (
      <g>
        <rect x={x - 16} y={y + 10} width="32" height="14" rx="7" fill="#b03921" />
        <line x1={x - 12} y1={y + 17} x2={x + 12} y2={y + 17} stroke="#fdc623" strokeWidth="2" strokeLinecap="round" />
        <circle cx={x + 10} cy={y + 17} r="2" fill="#FFFFFF" />
      </g>
    )
  }

  if (itemVariant === 1) {
    return (
      <g>
        <rect
          x={x - 15}
          y={y + 9}
          width="26"
          height="18"
          rx="3"
          fill="#608841"
          transform={`rotate(-4 ${x - 2} ${y + 18})`}
        />
        <rect
          x={x - 11}
          y={y + 12}
          width="18"
          height="12"
          rx="2"
          fill="#FAF8F5"
          transform={`rotate(-4 ${x - 2} ${y + 18})`}
        />
        <line x1={x + 13} y1={y + 10} x2={x + 20} y2={y + 24} stroke="#fdc623" strokeWidth="2.8" strokeLinecap="round" />
        <circle cx={x + 20} cy={y + 24} r="1.4" fill="#b03921" />
      </g>
    )
  }

  return (
    <g>
      <rect x={x - 16} y={y + 9} width="32" height="18" rx="3" fill="#461020" />
      <rect x={x - 13} y={y + 11} width="26" height="14" rx="2" fill="#5A182B" />
      <text x={x} y={y + 22} textAnchor="middle" fontSize="9" fontWeight="900" fill="#fdc623" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">
        § LEX
      </text>
      <path d={`M ${x + 6} ${y + 25} L ${x + 6} ${y + 29} L ${x + 8} ${y + 27} L ${x + 10} ${y + 29} L ${x + 10} ${y + 25} Z`} fill="#fdc623" />
    </g>
  )
}
