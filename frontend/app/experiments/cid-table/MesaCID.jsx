'use client'

import styles from './cid.module.css'
import { VIEW, seatAngleDeg, seatPosition } from './metrics'
import { characterName, childLabel } from './config'
import { useT } from '../../../lib/i18n'
import AvatarGeometrico from '../../../components/AvatarGeometrico'

const TABLE_RX = 218
const TABLE_RY = 120

// Rasgos visuales por personaje (los personajes nuevos reciben uno de la lista por orden)
const LOOKS = {
  mother: { baseType: 4, hairColor: '#4A2810', colorRopa: '#4ECDC4' },
  father: { baseType: 1, hairColor: '#18181B', colorRopa: '#45B7D1' },
  grandfather: { baseType: 3, hairColor: '#E5E7EB', colorRopa: '#96CEB4' },
  random: { baseType: 5, hairColor: '#3F3F46', colorRopa: '#D4A5A5' },
  brother: { baseType: 1, hairColor: '#B03921', colorRopa: '#FFE66D' },
  child: { baseType: 4, hairColor: '#4A2810', colorRopa: '#FF6B6B' },
}
const FALLBACK_LOOKS = Object.values(LOOKS)

function Persona({ x, y, color, label, look, isChild, appear }) {
  return (
    <g transform={`translate(${x} ${y - 6})`}>
      <g className={appear ? styles.pop : undefined}>
        {/* Sombra plana en el suelo */}
        <ellipse cx="0" cy="18" rx="28" ry="7" fill="#18181B" opacity="0.08" />

        {/* Halo / Indicador para el avatar del jugador */}
        {isChild && (
          <g>
            <circle cx="0" cy="-24" r="38" fill="#FEF08A" opacity="0.25" />
            <circle cx="0" cy="-24" r="38" fill="none" stroke="#FACC15" strokeWidth="2" strokeDasharray="3 3" />
          </g>
        )}

        {/* Componente modular de avatar geométrico */}
        <AvatarGeometrico
          x={0}
          y={0}
          baseType={isChild ? 4 : (look?.baseType ?? 1)}
          colorPelo={look?.hairColor ?? '#4A2810'}
          colorRopa={color || look?.colorRopa || '#4A1A1C'}
          tieneGorro={false}
        />
      </g>
      <NameTag y={36} text={label} star={isChild} />
    </g>
  )
}

function NameTag({ y, text, star }) {
  const w = Math.max(48, text.length * 7.4 + (star ? 34 : 22))
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x={-w / 2} y="-8" width={w} height="22" rx="11" fill="#18181B" opacity="0.12" />
      <rect x={-w / 2} y="-10" width={w} height="22" rx="11" fill={star ? '#FEF08A' : '#FFFFFF'} stroke="#18181B" strokeWidth="2" />
      <text y="5" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#18181B" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">{star ? `★ ${text}` : text}</text>
    </g>
  )
}

function Silla({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
      <rect x="-26" y="-22" width="52" height="46" rx="10" fill="#18181B" opacity="0.08" />
      <rect x="-24" y="-20" width="48" height="42" rx="9" fill="#8D5524" stroke="#18181B" strokeWidth="2.2" />
      <rect x="-18" y="-14" width="36" height="30" rx="7" fill="#FDF8F0" stroke="#18181B" strokeWidth="1.8" />
      <rect x="-14" y="-18" width="28" height="4" rx="2" fill="#6B3F19" />
    </g>
  )
}

function Plato({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
      <ellipse rx="19" ry="17" fill="#18181B" opacity="0.08" transform="translate(1 2)" />
      <ellipse rx="19" ry="17" fill="#FFFDF9" stroke="#18181B" strokeWidth="2.2" />
      <ellipse rx="12.5" ry="11" fill="#F5EFE6" stroke="#E5DACD" strokeWidth="1.5" />
      <rect x="-25" y="-10" width="3" height="20" rx="1.5" fill="#94A3B8" />
      <rect x="22" y="-10" width="3" height="20" rx="1.5" fill="#94A3B8" />
      <circle cx="21" cy="-18" r="5.5" fill="#0284C7" />
      <circle cx="21" cy="-18" r="4.5" fill="#38BDF8" />
      <ellipse cx="21" cy="-18" rx="2.8" ry="1.4" fill="#BAE6FD" />
    </g>
  )
}

function Centro({ theme }) {
  const { cx, cy } = VIEW
  if (theme === 'celebration') {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        {[[-90, -40, '#F43F5E'], [80, -50, '#3B82F6'], [-60, 55, '#FACC15'], [100, 40, '#10B981'], [-130, 10, '#8B5CF6'], [140, -5, '#F97316']].map(([dx, dy, c], i) => (
          <rect key={i} x={dx} y={dy} width="7" height="4" rx="1.5" fill={c} transform={`rotate(${i * 37} ${dx} ${dy})`} />
        ))}
        <ellipse cy="22" rx="54" ry="14" fill="#18181B" opacity="0.1" />
        <ellipse cy="18" rx="52" ry="13" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.2" />
        <rect x="-42" y="-6" width="84" height="22" rx="8" fill="#F472B6" stroke="#18181B" strokeWidth="2.2" />
        <rect x="-42" y="-10" width="84" height="10" rx="5" fill="#FFF1F2" stroke="#18181B" strokeWidth="2" />
        <ellipse cy="-6" rx="42" ry="7" fill="#FFF1F2" />
        {[-20, 0, 20].map((dx, i) => (
          <g key={dx} transform={`translate(${dx} -8)`}>
            <rect x="-2.5" y="-18" width="5" height="18" rx="2" fill={i === 1 ? '#38BDF8' : '#FACC15'} stroke="#18181B" strokeWidth="1.8" />
            <circle className={styles.flame} cx="0" cy="-24" r="4.5" fill="#F97316" />
            <circle cx="0" cy="-24" r="2.5" fill="#FEF08A" />
          </g>
        ))}
      </g>
    )
  }
  if (theme === 'closing') {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        <ellipse cy="16" rx="48" ry="12" fill="#18181B" opacity="0.1" />
        <path d="M-44 0 Q0 38 44 0 Z" fill="#FACC15" stroke="#18181B" strokeWidth="2.2" />
        <ellipse cy="0" rx="44" ry="10" fill="#EAB308" />
        <circle cx="-18" cy="-8" r="12" fill="#EF4444" stroke="#18181B" strokeWidth="2" />
        <ellipse cx="-18" cy="-21" rx="2.5" ry="4.5" fill="#22C55E" />
        <circle cx="5" cy="-11" r="13" fill="#F97316" stroke="#18181B" strokeWidth="2" />
        <circle cx="25" cy="-7" r="11" fill="#84CC16" stroke="#18181B" strokeWidth="2" />
        <g transform="translate(-100 -6)">
          <rect x="-8" y="-12" width="16" height="24" rx="6" fill="#BBF7D0" stroke="#18181B" strokeWidth="2.2" />
          <line x1="0" y1="-12" x2="0" y2="-20" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="-24" r="6.5" fill="#F43F5E" />
          <circle cx="0" cy="-24" r="2.8" fill="#FEF08A" />
        </g>
      </g>
    )
  }
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cy="20" rx="46" ry="12" fill="#18181B" opacity="0.1" />
      <ellipse cy="16" rx="44" ry="11" fill="#D97706" stroke="#18181B" strokeWidth="2.2" />
      <rect x="-36" y="-3" width="72" height="23" rx="10" fill="#E11D48" stroke="#18181B" strokeWidth="2.2" />
      <rect x="-34" y="9" width="68" height="8" rx="4" fill="#BE123C" />
      <rect x="-44" y="2" width="10" height="6" rx="3" fill="#E11D48" stroke="#18181B" strokeWidth="2" />
      <rect x="34" y="2" width="10" height="6" rx="3" fill="#E11D48" stroke="#18181B" strokeWidth="2" />
      <ellipse cy="-3" rx="36" ry="11" fill="#BE123C" stroke="#18181B" strokeWidth="2.2" />
      <ellipse cy="-3" rx="32" ry="9" fill="#F59E0B" />
      <circle cx="-14" cy="-3" r="3" fill="#22C55E" />
      <circle cx="-2" cy="-5" r="3.2" fill="#EA580C" />
      <circle cx="10" cy="-2" r="3" fill="#22C55E" />
      <circle cx="18" cy="-4" r="2.8" fill="#EA580C" />
      <circle cx="-6" cy="0" r="2.5" fill="#EF4444" />
      <g className={styles.steam}>
        <circle cx="-8" cy="-17" r="4.5" fill="#FFFFFF" opacity="0.75" />
        <circle cx="-10" cy="-24" r="3.5" fill="#FFFFFF" opacity="0.6" />
        <circle cx="8" cy="-15" r="4" fill="#FFFFFF" opacity="0.75" />
        <circle cx="10" cy="-22" r="3" fill="#FFFFFF" opacity="0.6" />
      </g>
      <g transform="translate(100 4)">
        <ellipse rx="26" ry="14" fill="#B45309" stroke="#18181B" strokeWidth="2.2" />
        <ellipse cy="-2" rx="24" ry="11" fill="#D97706" />
        <ellipse cx="-8" cy="-4" rx="10" ry="6" fill="#FDE68A" stroke="#18181B" strokeWidth="1.8" transform="rotate(-15 -8 -4)" />
        <ellipse cx="8" cy="-3" rx="10" ry="6" fill="#FDE68A" stroke="#18181B" strokeWidth="1.8" transform="rotate(15 8 -3)" />
      </g>
      <g transform="translate(-100 2)">
        <rect x="-9" y="-22" width="18" height="30" rx="7" fill="#E0F2FE" stroke="#18181B" strokeWidth="2.2" />
        <rect x="-7" y="-7" width="14" height="13" rx="4" fill="#38BDF8" />
        <rect x="-4" y="-27" width="8" height="6" rx="2" fill="#0284C7" stroke="#18181B" strokeWidth="2" />
        <ellipse cx="-3" cy="-14" rx="2" ry="5" fill="#FFFFFF" opacity="0.6" />
      </g>
    </g>
  )
}

export default function MesaCID({ totalSeats, seating, childSeat, childAvatar, theme, onSelect, onHover, locked }) {
  const t = useT()
  const { width, height, cx, cy } = VIEW
  const occupied = new Map(seating.map((c) => [c.seat, c]))
  const lookOf = (c, i) => LOOKS[c.id] ?? FALLBACK_LOOKS[i % FALLBACK_LOOKS.length]
  const seats = Array.from({ length: totalSeats }, (_, i) => ({ i, ...seatPosition(i, totalSeats), angle: seatAngleDeg(i, totalSeats) }))
  // Orden de pintado por profundidad: las sillas de abajo tapan a las de arriba
  const byDepth = [...seats].sort((a, b) => a.y - b.y)

  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={t('juegos.cidMesaAria')}>
      {/* Fondo plano cálido (estilo Aula Virtual / Duolingo) */}
      <rect width={width} height={height} rx="22" fill="#F7F1E8" stroke="#D8C8B5" strokeWidth="2.5" />
      <rect width={width} height="46" rx="22" fill="#EFE4D6" />
      <rect y="22" width={width} height="24" fill="#EFE4D6" />
      <line x1="0" y1="46" x2={width} y2="46" stroke="#3E2723" strokeWidth="2.5" />

      {/* Alfombra plana suave bajo la mesa */}
      <ellipse cx={cx} cy={cy + 14} rx="380" ry="240" fill={theme === 'celebration' ? '#FCE7F3' : '#F1E3D3'} stroke={theme === 'celebration' ? '#F472B6' : '#D4A373'} strokeWidth="2.5" strokeDasharray="6 8" />

      {/* Guirnalda festiva en modo celebración */}
      {theme === 'celebration' && (
        <g>
          <path d={`M10 18 Q${width / 4} 65 ${width / 2} 22 T${width - 10} 18`} fill="none" stroke="#18181B" strokeWidth="2" />
          {Array.from({ length: 13 }, (_, i) => {
            const tVal = (i + 0.5) / 13
            const bx = 10 + tVal * (width - 20)
            const by = 22 - Math.sin(tVal * Math.PI * 2) * 20
            const colors = ['#F43F5E', '#3B82F6', '#FACC15', '#10B981', '#8B5CF6']
            return <path key={i} d={`M${bx - 10} ${by} L${bx + 10} ${by} L${bx} ${by + 18} Z`} fill={colors[i % colors.length]} stroke="#18181B" strokeWidth="1.5" />
          })}
        </g>
      )}

      {byDepth.filter((s) => s.y < cy).map((s) => <Silla key={`chair-${s.i}`} x={s.x} y={s.y} angle={s.angle} />)}

      {/* Mesa central: sombra 2.5D, borde de madera cálida y superficie de roble acogedora */}
      <ellipse cx={cx} cy={cy + 18} rx={TABLE_RX + 12} ry={TABLE_RY + 12} fill="#18181B" opacity="0.10" />
      <ellipse cx={cx} cy={cy + 8} rx={TABLE_RX + 10} ry={TABLE_RY + 10} fill="#8D5524" stroke="#18181B" strokeWidth="2.5" />
      <ellipse cx={cx} cy={cy} rx={TABLE_RX + 10} ry={TABLE_RY + 10} fill="#C0834B" stroke="#18181B" strokeWidth="2.5" />
      <ellipse cx={cx} cy={cy} rx={TABLE_RX - 12} ry={TABLE_RY - 12} fill="none" stroke="#A76834" strokeWidth="2.5" strokeDasharray="8 6" />

      {seats.map((s) => (
        <Plato key={`plate-${s.i}`} x={cx + (s.x - cx) * 0.6} y={cy + (s.y - cy) * 0.6} angle={s.angle} />
      ))}

      <Centro theme={theme} />

      {byDepth.filter((s) => s.y >= cy).map((s) => <Silla key={`chair-${s.i}`} x={s.x} y={s.y} angle={s.angle} />)}

      {byDepth.map(({ i, x, y }) => {
        const person = occupied.get(i)
        if (person) {
          const idx = seating.indexOf(person)
          return <Persona key={`p-${i}`} x={x} y={y} color={person.color} label={characterName(t, person)} look={lookOf(person, idx)} />
        }
        if (childSeat === i) {
          const childLook = { baseType: 4, hairColor: childAvatar?.colorPelo || '#4A2810' }
          return <Persona key={`p-${i}`} x={x} y={y} color={childAvatar?.color || '#FF6B6B'} label={childLabel(t, childAvatar)} look={childLook} isChild appear />
        }
        if (locked) return null
        return (
          <g
            key={`empty-${i}`}
            className={styles.emptySeat}
            role="button"
            tabIndex={0}
            aria-label={t('juegos.cidSentarseAria', { n: i + 1 })}
            onClick={() => onSelect(i)}
            onPointerEnter={() => onHover?.(i)}
            onFocus={() => onHover?.(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(i)
              }
            }}
          >
            {/* Halo pulsante de llamada a la acción */}
            <circle className={styles.glow} cx={x} cy={y} r="32" fill="#FEF08A" opacity="0.45" stroke="#FACC15" strokeWidth="2.5" strokeDasharray="4 4" />
            <circle cx={x} cy={y} r="38" fill="transparent" />
            {/* Botón flat con relieve inferior estilo Duolingo */}
            <circle cx={x} cy={y + 3} r="18" fill="#CA8A04" pointerEvents="none" />
            <circle cx={x} cy={y} r="18" fill="#FACC15" stroke="#18181B" strokeWidth="2.2" pointerEvents="none" />
            <ellipse cx={x} cy={y - 7} rx="9" ry="3" fill="#FFFFFF" opacity="0.35" pointerEvents="none" />
            {/* Icono + en negrita */}
            <path d={`M${x - 7} ${y} H${x + 7} M${x} ${y - 7} V${y + 7}`} stroke="#18181B" strokeWidth="3.2" strokeLinecap="round" pointerEvents="none" />
          </g>
        )
      })}
    </svg>
  )
}
