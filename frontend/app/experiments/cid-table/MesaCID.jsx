'use client'

import styles from './cid.module.css'
import { VIEW, seatAngleDeg, seatPosition } from './metrics'
import { characterName, childLabel } from './config'
import { useT } from '../../../lib/i18n'
import AvatarGeometrico from '../../../components/AvatarGeometrico'

const TABLE_RX = 218
const TABLE_RY = 120

// La escena se pinta con los tokens de la paleta (ESTILO.md §1), no con hex
// sueltos: tinta verde muy oscura para todo contorno, verde para el mobiliario,
// blanco para las superficies y el naranja solo en el detalle del centro.
const TINTA = 'var(--verde-950)'

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
        {/* Sombra dura bajo la silla: ancla el personaje sin desenfoque */}
        <ellipse cx="1.5" cy="16" rx="33" ry="10" fill={TINTA} opacity="0.12" />

        {/* Halo del avatar del jugador: aro ámbar de puntitos */}
        {isChild && (
          <g>
            <circle cx="0" cy="-24" r="38" fill="var(--marca-ambar)" opacity="0.18" />
            <circle cx="0" cy="-24" r="38" fill="none" stroke="var(--marca-ambar-sombra)" strokeWidth="2.2" strokeDasharray="3 4" />
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
      {/* Placa dura de la etiqueta */}
      <rect x={-w / 2 + 2} y="-8" width={w} height="22" rx="11" fill={TINTA} opacity="0.18" />
      <rect
        x={-w / 2}
        y="-10"
        width={w}
        height="22"
        rx="11"
        fill={star ? 'var(--marca-ambar)' : 'var(--superficie)'}
        stroke={TINTA}
        strokeWidth="2.2"
      />
      <text
        y="5"
        textAnchor="middle"
        fontSize="11.5"
        fontWeight="800"
        fill={TINTA}
        fontFamily="var(--font-display)"
      >
        {star ? `★ ${text}` : text}
      </text>
    </g>
  )
}

function Silla({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
      {/* Silla vista desde arriba: respaldo por fuera + asiento redondo. Misma
          forma que el asiento libre ámbar, para que se lean como el mismo objeto. */}
      <ellipse cx="2" cy="5" rx="25" ry="20" fill={TINTA} opacity="0.12" />
      <ellipse rx="25" ry="20" fill="var(--verde-500)" stroke={TINTA} strokeWidth="2.6" />
      <ellipse cy="-3" rx="17" ry="12.5" fill="var(--verde-400)" />
      <rect x="-23" y="-26" width="46" height="10" rx="5" fill="var(--verde-700)" stroke={TINTA} strokeWidth="2.2" />
    </g>
  )
}

function Plato({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
      <ellipse rx="19" ry="17" fill={TINTA} opacity="0.12" transform="translate(1.5 2.5)" />
      <ellipse rx="19" ry="17" fill="var(--superficie)" stroke={TINTA} strokeWidth="2.4" />
      <ellipse rx="12" ry="10.5" fill="none" stroke="var(--verde-200)" strokeWidth="2" />
      <rect x="-25" y="-10" width="3" height="20" rx="1.5" fill="var(--neutro-300)" stroke={TINTA} strokeWidth="1.2" />
      <rect x="22" y="-10" width="3" height="20" rx="1.5" fill="var(--neutro-300)" stroke={TINTA} strokeWidth="1.2" />
      {/* Vaso de agua */}
      <circle cx="21" cy="-18" r="5.5" fill="var(--verde-100)" stroke={TINTA} strokeWidth="2" />
      <circle cx="21" cy="-18" r="2.6" fill="var(--verde-300)" />
    </g>
  )
}

function Centro({ theme, animated }) {
  const { cx, cy } = VIEW
  if (theme === 'celebration') {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        {[
          [-90, -40, 'var(--naranja-400)'],
          [80, -50, 'var(--verde-400)'],
          [-60, 55, 'var(--marca-ambar)'],
          [100, 40, 'var(--verde-600)'],
          [-130, 10, 'var(--naranja-600)'],
          [140, -5, 'var(--verde-400)'],
        ].map(([dx, dy, c], i) => (
          <rect key={i} x={dx} y={dy} width="7" height="4" rx="1.5" fill={c} stroke={TINTA} strokeWidth="1" transform={`rotate(${i * 37} ${dx} ${dy})`} />
        ))}
        <ellipse cx="1.5" cy="22" rx="54" ry="14" fill={TINTA} opacity="0.12" />
        <ellipse cy="18" rx="52" ry="13" fill="var(--superficie)" stroke={TINTA} strokeWidth="2.4" />
        {/* Tarta */}
        <rect x="-42" y="-6" width="84" height="22" rx="8" fill="var(--superficie)" stroke={TINTA} strokeWidth="2.4" />
        <rect x="-42" y="-10" width="84" height="11" rx="5.5" fill="var(--naranja-200)" stroke={TINTA} strokeWidth="2.2" />
        <ellipse cy="-6" rx="40" ry="6" fill="var(--naranja-200)" />
        {/* Velas */}
        {[-20, 0, 20].map((dx, i) => (
          <g key={dx} transform={`translate(${dx} -8)`}>
            <rect x="-2.5" y="-18" width="5" height="18" rx="2" fill={i === 1 ? 'var(--verde-400)' : 'var(--naranja-400)'} stroke={TINTA} strokeWidth="1.8" />
            <circle className={animated ? styles.flame : undefined} cx="0" cy="-24" r="4.5" fill="var(--marca-ambar)" stroke={TINTA} strokeWidth="1.6" />
            <circle cx="0" cy="-24" r="1.8" fill="var(--superficie)" />
          </g>
        ))}
      </g>
    )
  }
  if (theme === 'closing') {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        <ellipse cx="1.5" cy="20" rx="48" ry="12" fill={TINTA} opacity="0.12" />
        <ellipse cy="16" rx="46" ry="11" fill="var(--superficie)" stroke={TINTA} strokeWidth="2.4" />
        {/* Caja de regalo: cierra la historia */}
        <rect x="-34" y="-2" width="68" height="22" rx="7" fill="var(--verde-500)" stroke={TINTA} strokeWidth="2.4" />
        <rect x="-38" y="-14" width="76" height="14" rx="6" fill="var(--verde-400)" stroke={TINTA} strokeWidth="2.4" />
        <rect x="-6" y="-14" width="12" height="34" rx="4" fill="var(--naranja-200)" stroke={TINTA} strokeWidth="2" />
        <circle cx="-13" cy="-18" r="8" fill="var(--naranja-300)" stroke={TINTA} strokeWidth="2" />
        <circle cx="13" cy="-18" r="8" fill="var(--naranja-300)" stroke={TINTA} strokeWidth="2" />
        <circle cx="0" cy="-18" r="4.5" fill="var(--naranja-400)" stroke={TINTA} strokeWidth="2" />
      </g>
    )
  }
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cx="1.5" cy="20" rx="52" ry="12" fill={TINTA} opacity="0.12" />
      <ellipse cy="16" rx="50" ry="11" fill="var(--superficie)" stroke={TINTA} strokeWidth="2.4" />
      {/* Olla de la cena */}
      <rect x="-36" y="-3" width="72" height="23" rx="10" fill="var(--naranja-400)" stroke={TINTA} strokeWidth="2.4" />
      <rect x="-42" y="4" width="8" height="7" rx="3" fill="var(--naranja-400)" stroke={TINTA} strokeWidth="2" />
      <rect x="34" y="4" width="8" height="7" rx="3" fill="var(--naranja-400)" stroke={TINTA} strokeWidth="2" />
      <ellipse cy="-3" rx="35" ry="10" fill="var(--naranja-200)" stroke={TINTA} strokeWidth="2.4" />
      <ellipse cy="-3" rx="29" ry="7.5" fill="var(--naranja-600)" />
      {/* Vapor: solo se mueve cuando la mesa se puede tocar */}
      <g className={animated ? styles.steam : undefined}>
        <circle cx="-8" cy="-17" r="4.5" fill="var(--superficie)" opacity="0.8" />
        <circle cx="-10" cy="-24" r="3.5" fill="var(--superficie)" opacity="0.6" />
        <circle cx="8" cy="-15" r="4" fill="var(--superficie)" opacity="0.8" />
        <circle cx="10" cy="-22" r="3" fill="var(--superficie)" opacity="0.6" />
      </g>
      {/* Cesta del pan */}
      <g transform="translate(102 4)">
        <ellipse rx="26" ry="14" fill="var(--naranja-200)" stroke={TINTA} strokeWidth="2.4" />
        <ellipse cy="-2" rx="23" ry="10.5" fill="var(--naranja-300)" />
        <ellipse cx="-8" cy="-4" rx="10" ry="6" fill="var(--marca-ambar)" stroke={TINTA} strokeWidth="1.8" transform="rotate(-15 -8 -4)" />
        <ellipse cx="8" cy="-3" rx="10" ry="6" fill="var(--marca-ambar)" stroke={TINTA} strokeWidth="1.8" transform="rotate(15 8 -3)" />
      </g>
      {/* Jarra de agua */}
      <g transform="translate(-104 2)">
        <rect x="-9" y="-22" width="18" height="30" rx="7" fill="var(--verde-100)" stroke={TINTA} strokeWidth="2.4" />
        <rect x="-6.5" y="-6" width="13" height="12" rx="4" fill="var(--verde-300)" />
        <rect x="-4" y="-27" width="8" height="6" rx="2" fill="var(--verde-500)" stroke={TINTA} strokeWidth="2" />
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
      {/* Alfombra: verde de la familia principal con trazo de tinta */}
      <ellipse cx={cx} cy={cy + 26} rx="352" ry="230" fill="var(--verde-100)" stroke={TINTA} strokeWidth="3" />
      <ellipse cx={cx} cy={cy + 26} rx="326" ry="208" fill="none" stroke="var(--verde-300)" strokeWidth="2.5" strokeDasharray="10 9" />

      {/* Guirnalda de banderines en la celebración */}
      {theme === 'celebration' && (
        <g>
          <path d={`M10 18 Q${width / 4} 65 ${width / 2} 22 T${width - 10} 18`} fill="none" stroke={TINTA} strokeWidth="2.4" />
          {Array.from({ length: 13 }, (_, i) => {
            const tVal = (i + 0.5) / 13
            const bx = 10 + tVal * (width - 20)
            const by = 22 - Math.sin(tVal * Math.PI * 2) * 20
            const colores = ['var(--verde-400)', 'var(--naranja-400)', 'var(--marca-ambar)', 'var(--verde-600)']
            return <path key={i} d={`M${bx - 10} ${by} L${bx + 10} ${by} L${bx} ${by + 18} Z`} fill={colores[i % colores.length]} stroke={TINTA} strokeWidth="1.8" />
          })}
        </g>
      )}

      {byDepth.filter((s) => s.y < cy).map((s) => <Silla key={`chair-${s.i}`} x={s.x} y={s.y} angle={s.angle} />)}

      {/* Mesa central: placa dura, borde de tinta y superficie blanca */}
      <ellipse cx={cx + 4} cy={cy + 20} rx={TABLE_RX + 10} ry={TABLE_RY + 10} fill={TINTA} opacity="0.14" />
      <ellipse cx={cx} cy={cy} rx={TABLE_RX + 10} ry={TABLE_RY + 10} fill="var(--verde-700)" stroke={TINTA} strokeWidth="3" />
      <ellipse cx={cx} cy={cy} rx={TABLE_RX - 2} ry={TABLE_RY - 2} fill="var(--neutro-50)" stroke={TINTA} strokeWidth="2.6" />
      <ellipse cx={cx} cy={cy} rx={TABLE_RX - 16} ry={TABLE_RY - 16} fill="none" stroke="var(--verde-200)" strokeWidth="2.5" strokeDasharray="8 7" />

      {seats.map((s) => (
        <Plato key={`plate-${s.i}`} x={cx + (s.x - cx) * 0.6} y={cy + (s.y - cy) * 0.6} angle={s.angle} />
      ))}

      <Centro theme={theme} animated={!locked} />

      {byDepth.filter((s) => s.y >= cy).map((s) => <Silla key={`chair-${s.i}`} x={s.x} y={s.y} angle={s.angle} />)}

      {byDepth.map(({ i, x, y }) => {
        const person = occupied.get(i)
        if (person) {
          const idx = seating.indexOf(person)
          return <Persona key={`p-${i}`} x={x} y={y} color={person.color} label={characterName(t, person)} look={lookOf(person, idx)} />
        }
        if (childSeat === i) {
          const childLook = { baseType: 4, hairColor: childAvatar?.colorPelo || '#4A2810' }
          const persona = (
            <Persona
              x={x}
              y={y}
              color={childAvatar?.color || '#FF6B6B'}
              label={childLabel(t, childAvatar)}
              look={childLook}
              isChild
              appear
            />
          )
          if (locked) {
            return <g key={`p-${i}`}>{persona}</g>
          }
          return (
            <g
              key={`p-${i}`}
              className={styles.childSeatInteractive}
              role="button"
              tabIndex={0}
              aria-label={t('juegos.cidTuAsientoAria', { n: i + 1 })}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(i)
                }
              }}
            >
              {persona}
            </g>
          )
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
            <circle className={styles.glow} cx={x} cy={y} r="32" fill="var(--marca-ambar)" opacity="0.28" stroke="var(--marca-ambar-sombra)" strokeWidth="2.2" strokeDasharray="4 6" />
            {/* Zona de contacto, más generosa que el botón */}
            <circle cx={x} cy={y} r="40" fill="transparent" />
            {/* El asiento es una pegatina ámbar: placa dura + trazo de tinta.
                Solo se mueve el grupo interior (el exterior lleva el translate). */}
            <g className={styles.seatVisual}>
              <circle cx={x + 2} cy={y + 4} r="18" fill="var(--marca-ambar-sombra)" pointerEvents="none" />
              <circle cx={x} cy={y} r="18" fill="var(--marca-ambar)" stroke={TINTA} strokeWidth="2.6" pointerEvents="none" />
              <ellipse cx={x} cy={y - 8} rx="8" ry="2.6" fill="var(--superficie)" opacity="0.35" pointerEvents="none" />
              <path d={`M${x - 7} ${y} H${x + 7} M${x} ${y - 7} V${y + 7}`} stroke={TINTA} strokeWidth="3.2" strokeLinecap="round" pointerEvents="none" />
            </g>
          </g>
        )
      })}
    </svg>
  )
}
