'use client'

import styles from './cid.module.css'
import { VIEW, seatAngleDeg, seatPosition } from './metrics'

const TABLE_RX = 218
const TABLE_RY = 120

// Rasgos visuales por personaje (los personajes nuevos reciben uno de la lista por orden)
const LOOKS = {
  mother: { hair: 'long', hairColor: '#5b3423', skin: '#f2c9a6', extra: 'earrings' },
  father: { hair: 'short', hairColor: '#2a1d15', skin: '#dda57c', extra: 'beard' },
  grandfather: { hair: 'bald', hairColor: '#e7e5e4', skin: '#efc6a4', extra: 'glasses' },
  random: { hair: 'cap', hairColor: '#3f3f46', skin: '#c48a5f', extra: '' },
  brother: { hair: 'messy', hairColor: '#9a4f25', skin: '#f4d2b4', extra: 'freckles' },
  child: { hair: 'kid', hairColor: '#6b3f22', skin: '#f6d3b3', extra: 'freckles' },
}
const FALLBACK_LOOKS = Object.values(LOOKS)

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v) => Math.max(0, Math.min(255, v + amt))
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`
}

function Hair({ look, back }) {
  const h = look.hairColor
  const d = shade(h, -35)
  if (back) {
    if (look.hair === 'long') return <path d="M-21 -18 C-24 -44 24 -44 21 -18 L24 12 C14 16 -14 16 -24 12 Z" fill={d} />
    return null
  }
  switch (look.hair) {
    case 'long':
      return <path d="M-18 -22 C-16 -42 18 -42 18 -22 C12 -30 2 -32 -4 -27 C-9 -31 -15 -28 -18 -22 Z" fill={h} stroke={d} strokeWidth="1" />
    case 'short':
      return <path d="M-17 -20 C-18 -40 18 -40 17 -20 C14 -27 10 -29 0 -29 C-10 -29 -14 -27 -17 -20 Z" fill={h} />
    case 'bald':
      return (
        <g fill={h}>
          <path d="M-17 -14 C-19 -22 -16 -27 -13 -26 C-12 -20 -14 -16 -15 -11 Z" />
          <path d="M17 -14 C19 -22 16 -27 13 -26 C12 -20 14 -16 15 -11 Z" />
        </g>
      )
    case 'cap':
      return (
        <g>
          <path d="M-18 -20 C-18 -40 18 -40 18 -20 Z" fill="#334155" />
          <path d="M-18 -20 C-6 -24 10 -24 26 -18 C20 -14 4 -16 -18 -16 Z" fill="#1e293b" />
          <circle cy="-37" r="2.2" fill="#475569" />
        </g>
      )
    case 'messy':
      return <path d="M-18 -18 L-20 -30 L-12 -28 L-10 -40 L-3 -31 L3 -42 L7 -31 L15 -38 L14 -28 L21 -27 L17 -18 C10 -25 -8 -26 -18 -18 Z" fill={h} stroke={d} strokeWidth="1" strokeLinejoin="round" />
    default:
      return (
        <g>
          <path d="M-18 -18 C-20 -40 20 -40 18 -18 C14 -26 6 -24 2 -28 C-4 -23 -12 -26 -18 -18 Z" fill={h} />
          <circle cx="10" cy="-38" r="6" fill={h} />
        </g>
      )
  }
}

function Persona({ x, y, color, label, look, isChild, appear }) {
  const id = `${label}-${x}`.replace(/\W/g, '')
  return (
    <g transform={`translate(${x} ${y - 8})`}>
      <g className={appear ? styles.pop : undefined}>
        <defs>
          <radialGradient id={`sk-${id}`} cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor={shade(look.skin, 14)} />
            <stop offset="1" stopColor={shade(look.skin, -22)} />
          </radialGradient>
          <linearGradient id={`cl-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={shade(color, 18)} />
            <stop offset="1" stopColor={shade(color, -40)} />
          </linearGradient>
        </defs>
        {isChild && <ellipse cy="4" rx="46" ry="44" fill="url(#cid-halo)" />}
        <ellipse cy="26" rx="30" ry="7" fill="rgba(0,0,0,.28)" />
        <Hair look={look} back />
        <path d="M-28 26 C-28 6 -18 0 0 0 C18 0 28 6 28 26 Z" fill={`url(#cl-${id})`} />
        <path d="M-8 1 Q0 9 8 1" fill="none" stroke={shade(color, -50)} strokeWidth="1.5" opacity=".6" />
        <rect x="-5" y="-6" width="10" height="9" rx="3" fill={shade(look.skin, -28)} />
        <ellipse cx="-17" cy="-15" rx="3.5" ry="5" fill={shade(look.skin, -10)} />
        <ellipse cx="17" cy="-15" rx="3.5" ry="5" fill={shade(look.skin, -10)} />
        <ellipse cy="-17" rx="17" ry="19" fill={`url(#sk-${id})`} />
        <Hair look={look} />
        <g fill="#2b1d16">
          <ellipse cx="-6" cy="-16" rx="2.3" ry="2.8" />
          <ellipse cx="6" cy="-16" rx="2.3" ry="2.8" />
        </g>
        <circle cx="-5.2" cy="-17" r=".8" fill="#fff" />
        <circle cx="6.8" cy="-17" r=".8" fill="#fff" />
        <path d="M-9.5 -21.5 Q-6 -23.5 -3 -21.8 M3 -21.8 Q6 -23.5 9.5 -21.5" stroke={shade(look.hairColor, -40)} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <ellipse cx="-10" cy="-10" rx="3.4" ry="2" fill="#f87171" opacity=".28" />
        <ellipse cx="10" cy="-10" rx="3.4" ry="2" fill="#f87171" opacity=".28" />
        <path d="M-1 -12 Q0 -10 1 -12" stroke={shade(look.skin, -45)} strokeWidth="1.2" fill="none" />
        {look.extra === 'beard' && <path d="M-15 -12 C-14 2 14 2 15 -12 C10 -4 -10 -4 -15 -12 Z" fill={look.hairColor} opacity=".85" />}
        <path d="M-4.5 -6.5 Q0 -3 4.5 -6.5" stroke="#7f1d1d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {look.extra === 'glasses' && (
          <g fill="rgba(255,255,255,.15)" stroke="#57534e" strokeWidth="1.3">
            <circle cx="-6.5" cy="-16" r="5" />
            <circle cx="6.5" cy="-16" r="5" />
            <path d="M-1.5 -16 H1.5" />
            <path d="M-6 -9 Q0 -11 6 -9" stroke="#d6d3d1" strokeWidth="2.2" fill="none" />
          </g>
        )}
        {look.extra === 'freckles' && (
          <g fill={shade(look.skin, -55)} opacity=".5">
            <circle cx="-10" cy="-12" r=".8" /><circle cx="-8" cy="-10.5" r=".8" /><circle cx="10" cy="-12" r=".8" /><circle cx="8" cy="-10.5" r=".8" />
          </g>
        )}
        {look.extra === 'earrings' && (
          <g fill="#fbbf24"><circle cx="-17" cy="-9" r="1.8" /><circle cx="17" cy="-9" r="1.8" /></g>
        )}
      </g>
      <NameTag y={42} text={label} star={isChild} />
    </g>
  )
}

function NameTag({ y, text, star }) {
  const w = Math.max(48, text.length * 7.4 + (star ? 34 : 22))
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x={-w / 2} y="-10" width={w} height="21" rx="10.5" fill="rgba(0,0,0,.25)" transform="translate(0 2)" />
      <rect x={-w / 2} y="-10" width={w} height="21" rx="10.5" fill={star ? '#fef3c7' : '#fffdf7'} stroke={star ? '#f59e0b' : 'rgba(0,0,0,.12)'} />
      <text y="4.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#292524" fontFamily="Plus Jakarta Sans, sans-serif">{star ? `★ ${text}` : text}</text>
    </g>
  )
}

function Silla({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
      <rect x="-27" y="-24" width="54" height="50" rx="10" fill="rgba(0,0,0,.25)" transform="translate(3 5)" />
      <rect x="-25" y="-20" width="50" height="44" rx="9" fill="url(#cid-chair)" />
      <rect x="-19" y="-14" width="38" height="32" rx="7" fill="url(#cid-cushion)" />
      <path d="M-26 -26 Q0 -38 26 -26 L24 -18 Q0 -29 -24 -18 Z" fill="#5b3216" />
    </g>
  )
}

function Plato({ x, y, angle }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle + 90})`}>
      <ellipse rx="19" ry="17" fill="rgba(0,0,0,.12)" transform="translate(1.5 2)" />
      <ellipse rx="19" ry="17" fill="url(#cid-plate)" />
      <ellipse rx="12" ry="10.5" fill="none" stroke="#e2e8f0" strokeWidth="1.2" />
      <rect x="-27" y="-11" width="2.6" height="22" rx="1.3" fill="#a8a29e" />
      <rect x="24.5" y="-11" width="2.6" height="22" rx="1.3" fill="#a8a29e" />
      <circle cx="24" cy="-20" r="5.5" fill="rgba(186,230,253,.55)" stroke="#94a3b8" strokeWidth="1" />
    </g>
  )
}

function Centro({ theme }) {
  const { cx, cy } = VIEW
  if (theme === 'celebration') {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        {[[-90, -40, '#f472b6'], [80, -50, '#60a5fa'], [-60, 55, '#fbbf24'], [100, 40, '#34d399'], [-130, 10, '#a78bfa'], [140, -5, '#f87171']].map(([dx, dy, c], i) => (
          <rect key={i} x={dx} y={dy} width="6" height="3" rx="1" fill={c} transform={`rotate(${i * 37} ${dx} ${dy})`} />
        ))}
        <ellipse cy="26" rx="58" ry="16" fill="rgba(0,0,0,.18)" />
        <ellipse cy="22" rx="56" ry="15" fill="#e2e8f0" />
        <path d="M-44 20 V-6 A44 12 0 0 0 44 -6 V20 A44 12 0 0 1 -44 20 Z" fill="url(#cid-cake)" />
        <ellipse cy="-6" rx="44" ry="12" fill="#fff5f7" />
        <path d="M-44 -6 q6 10 11 2 q6 10 11 2 q6 10 11 2 q6 10 11 2 q6 10 11 2 q6 10 11 2 q6 10 11 2 q5 8 10 1" fill="#fff5f7" />
        <path d="M-30 4 V14 M-10 6 V16 M10 6 V16 M30 4 V14" stroke="#f9a8d4" strokeWidth="3" strokeLinecap="round" />
        {[-20, 0, 20].map((dx) => (
          <g key={dx} transform={`translate(${dx} -8)`}>
            <rect x="-2.5" y="-22" width="5" height="22" rx="2" fill={dx === 0 ? '#60a5fa' : '#fbbf24'} />
            <circle cy="-30" r="9" fill="url(#cid-flameglow)" />
            <path className={styles.flame} d="M0 -36 C5 -30 4 -24 0 -23 C-4 -24 -5 -30 0 -36 Z" fill="#fb923c" />
            <path className={styles.flame} d="M0 -32 C2 -28 2 -25 0 -24 C-2 -25 -2 -28 0 -32 Z" fill="#fef08a" />
          </g>
        ))}
      </g>
    )
  }
  if (theme === 'closing') {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        <ellipse cy="16" rx="52" ry="14" fill="rgba(0,0,0,.18)" />
        <path d="M-50 0 Q0 46 50 0 Z" fill="url(#cid-bowl)" />
        <ellipse cy="0" rx="50" ry="12" fill="#b45309" />
        <circle cx="-22" cy="-8" r="13" fill="url(#cid-apple)" />
        <circle cx="4" cy="-12" r="14" fill="url(#cid-orange)" />
        <circle cx="26" cy="-6" r="12" fill="url(#cid-apple)" />
        <path d="M-12 -6 C-4 -26 14 -28 22 -20" stroke="#facc15" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M-22 -21 q2 -6 6 -7 M4 -26 q1 -5 4 -6" stroke="#4d7c0f" strokeWidth="2" fill="none" strokeLinecap="round" />
        <g transform="translate(-120 -10)">
          <circle r="14" fill="url(#cid-flameglow)" />
          <rect x="-5" y="-4" width="10" height="20" rx="2" fill="#fef3c7" stroke="#e7e5e4" />
          <path className={styles.flame} d="M0 -14 C4 -9 3 -5 0 -4 C-3 -5 -4 -9 0 -14 Z" fill="#fb923c" />
        </g>
      </g>
    )
  }
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse cy="22" rx="56" ry="15" fill="rgba(0,0,0,.2)" />
      <path d="M-46 -2 V14 A46 14 0 0 0 46 14 V-2 Z" fill="url(#cid-pot)" />
      <ellipse cy="-2" rx="46" ry="14" fill="#7c2d12" />
      <ellipse cy="-1" rx="40" ry="11" fill="url(#cid-stew)" />
      <rect x="-60" y="0" width="14" height="6" rx="3" fill="#44403c" />
      <rect x="46" y="0" width="14" height="6" rx="3" fill="#44403c" />
      <g className={styles.steam} fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="3" strokeLinecap="round">
        <path d="M-12 -10 q6 -10 0 -20 q-6 -10 0 -18" />
        <path d="M10 -8 q6 -10 0 -20 q-6 -10 0 -18" />
      </g>
      <g transform="translate(118 8)">
        <ellipse rx="30" ry="18" fill="#a16207" />
        <ellipse rx="25" ry="14" fill="#ca8a04" />
        <ellipse cx="-6" cy="-3" rx="13" ry="7" fill="url(#cid-bread)" transform="rotate(-20)" />
        <ellipse cx="9" cy="2" rx="12" ry="6.5" fill="url(#cid-bread)" transform="rotate(15)" />
      </g>
      <g transform="translate(-122 4)">
        <rect x="-6" y="-26" width="12" height="34" rx="5" fill="rgba(186,230,253,.6)" stroke="#94a3b8" />
        <rect x="-5" y="-10" width="10" height="17" rx="4" fill="rgba(56,189,248,.45)" />
      </g>
    </g>
  )
}

export default function MesaCID({ totalSeats, seating, childSeat, childAvatar, theme, onSelect, onHover, locked }) {
  const { width, height, cx, cy } = VIEW
  const occupied = new Map(seating.map((c) => [c.seat, c]))
  const lookOf = (c, i) => LOOKS[c.id] ?? FALLBACK_LOOKS[i % FALLBACK_LOOKS.length]
  const seats = Array.from({ length: totalSeats }, (_, i) => ({ i, ...seatPosition(i, totalSeats), angle: seatAngleDeg(i, totalSeats) }))
  // Orden de pintado por profundidad: las sillas de abajo tapan a las de arriba
  const byDepth = [...seats].sort((a, b) => a.y - b.y)

  return (
    <svg className={styles.svg} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Mesa con sillas: elige un asiento libre">
      <defs>
        <pattern id="cid-floor" width="120" height="30" patternUnits="userSpaceOnUse">
          <rect width="120" height="30" fill="#a0683a" />
          <rect width="120" height="14" fill="#ad7444" />
          <rect y="15" width="70" height="15" fill="#98602f" />
          <path d="M0 14.5 H120 M0 29.5 H120 M70 15 V30 M30 0 V14" stroke="#6b3f1d" strokeWidth="1" />
          <path d="M5 6 Q30 3 60 7 T115 5 M75 22 Q95 19 118 23" stroke="#8a5329" strokeWidth=".8" fill="none" opacity=".6" />
        </pattern>
        <radialGradient id="cid-light" cx="50%" cy="45%" r="65%">
          <stop offset="0" stopColor="#fff3c4" stopOpacity=".35" />
          <stop offset=".55" stopColor="#fff3c4" stopOpacity="0" />
          <stop offset="1" stopColor="#1c0d05" stopOpacity=".55" />
        </radialGradient>
        <radialGradient id="cid-cloth" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".75" stopColor={theme === 'celebration' ? '#fde7f1' : '#f5efe3'} />
          <stop offset="1" stopColor={theme === 'celebration' ? '#f9cde0' : '#e8dcc6'} />
        </radialGradient>
        <linearGradient id="cid-chair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8693a" />
          <stop offset="1" stopColor="#6e3b18" />
        </linearGradient>
        <radialGradient id="cid-cushion" cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#d9a36b" />
          <stop offset="1" stopColor="#9a6233" />
        </radialGradient>
        <radialGradient id="cid-plate" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe5ec" />
        </radialGradient>
        <radialGradient id="cid-halo">
          <stop offset="0" stopColor="#fde68a" stopOpacity=".9" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cid-flameglow">
          <stop offset="0" stopColor="#fde68a" stopOpacity=".8" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cid-pot" x1="0" x2="1">
          <stop offset="0" stopColor="#9a3412" /><stop offset=".45" stopColor="#ea580c" /><stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
        <radialGradient id="cid-stew" cx="40%" cy="40%">
          <stop offset="0" stopColor="#f59e0b" /><stop offset="1" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id="cid-bread" cx="35%" cy="30%">
          <stop offset="0" stopColor="#fcd34d" /><stop offset="1" stopColor="#b45309" />
        </radialGradient>
        <linearGradient id="cid-cake" x1="0" x2="1">
          <stop offset="0" stopColor="#f472b6" /><stop offset=".45" stopColor="#fbcfe8" /><stop offset="1" stopColor="#db2777" />
        </linearGradient>
        <linearGradient id="cid-bowl" x1="0" x2="1">
          <stop offset="0" stopColor="#78350f" /><stop offset=".5" stopColor="#d97706" /><stop offset="1" stopColor="#78350f" />
        </linearGradient>
        <radialGradient id="cid-apple" cx="35%" cy="30%">
          <stop offset="0" stopColor="#fca5a5" /><stop offset=".4" stopColor="#dc2626" /><stop offset="1" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id="cid-orange" cx="35%" cy="30%">
          <stop offset="0" stopColor="#fed7aa" /><stop offset=".4" stopColor="#f97316" /><stop offset="1" stopColor="#9a3412" />
        </radialGradient>
        <filter id="cid-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <rect width={width} height={height} rx="22" fill="url(#cid-floor)" />
      <ellipse cx={cx} cy={cy + 10} rx="385" ry="255" fill={theme === 'celebration' ? '#7f1d4e' : '#7c2d12'} opacity=".55" />
      <ellipse cx={cx} cy={cy + 10} rx="370" ry="242" fill="none" stroke="#fcd34d" strokeWidth="3" strokeDasharray="2 10" opacity=".45" />

      {theme === 'celebration' && (
        <g>
          <path d={`M10 18 Q${width / 4} 70 ${width / 2} 22 T${width - 10} 18`} fill="none" stroke="#fef3c7" strokeWidth="2" />
          {Array.from({ length: 13 }, (_, i) => {
            const t = (i + 0.5) / 13
            const x = 10 + t * (width - 20)
            const y = 22 - Math.sin(t * Math.PI * 2) * 22
            const colors = ['#f472b6', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa']
            return <path key={i} d={`M${x - 10} ${y} L${x + 10} ${y} L${x} ${y + 20} Z`} fill={colors[i % colors.length]} />
          })}
        </g>
      )}

      {byDepth.filter((s) => s.y < cy).map((s) => <Silla key={`chair-${s.i}`} x={s.x} y={s.y} angle={s.angle} />)}

      <ellipse cx={cx + 6} cy={cy + 22} rx={TABLE_RX + 18} ry={TABLE_RY + 18} fill="rgba(0,0,0,.45)" filter="url(#cid-soft)" />
      <ellipse cx={cx} cy={cy + 12} rx={TABLE_RX + 12} ry={TABLE_RY + 12} fill="#5b2f12" />
      <ellipse cx={cx} cy={cy} rx={TABLE_RX + 12} ry={TABLE_RY + 12} fill="url(#cid-cloth)" />
      <ellipse cx={cx} cy={cy} rx={TABLE_RX - 4} ry={TABLE_RY - 4} fill="none" stroke={theme === 'celebration' ? '#f9a8d4' : '#d6c4a0'} strokeWidth="1.5" strokeDasharray="1 5" />

      {seats.map((s) => (
        <Plato key={`plate-${s.i}`} x={cx + (s.x - cx) * 0.6} y={cy + (s.y - cy) * 0.6} angle={s.angle} />
      ))}

      <Centro theme={theme} />

      {byDepth.filter((s) => s.y >= cy).map((s) => <Silla key={`chair-${s.i}`} x={s.x} y={s.y} angle={s.angle} />)}

      <rect width={width} height={height} rx="22" fill="url(#cid-light)" pointerEvents="none" />

      {byDepth.map(({ i, x, y }) => {
        const person = occupied.get(i)
        if (person) {
          const idx = seating.indexOf(person)
          return <Persona key={`p-${i}`} x={x} y={y} color={person.color} label={person.name} look={lookOf(person, idx)} />
        }
        if (childSeat === i) {
          return <Persona key={`p-${i}`} x={x} y={y} color={childAvatar.color} label={childAvatar.label} look={LOOKS.child} isChild appear />
        }
        if (locked) return null
        return (
          <g
            key={`empty-${i}`}
            className={styles.emptySeat}
            role="button"
            tabIndex={0}
            aria-label={`Sentarte en la silla ${i + 1}`}
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
            <circle className={styles.glow} cx={x} cy={y} r="34" fill="rgba(253,230,138,.35)" stroke="#fde68a" strokeWidth="3" />
            <circle cx={x} cy={y} r="40" fill="transparent" />
            <circle cx={x} cy={y} r="13" fill="#fffbeb" stroke="#f59e0b" strokeWidth="2" pointerEvents="none" />
            <path d={`M${x - 6} ${y} H${x + 6} M${x} ${y - 6} V${y + 6}`} stroke="#b45309" strokeWidth="3" strokeLinecap="round" pointerEvents="none" />
          </g>
        )
      })}

    </svg>
  )
}
