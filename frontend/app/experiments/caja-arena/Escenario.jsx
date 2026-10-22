'use client'

import { memo } from 'react'
import { SHELF, TRAY, VIEW, ZONES, smoothPath } from './config'
import { useT } from '../../../lib/i18n'

// Paleta flat Duolingo con contornos oscurecidos 20%-30% del tono base
const ZONE_FILL = {
  bosque: '#4ADE80',
  montana: '#CBD5E1',
  lago: '#7DD3FC',
  pradera: '#BBF7D0',
  desierto: '#FDE68A',
}

const ZONE_STROKE = {
  bosque: '#16A34A',
  montana: '#94A3B8',
  lago: '#0284C7',
  pradera: '#4ADE80',
  desierto: '#F59E0B',
}

function Pino({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="4" rx="26" ry="7" fill="#7C5A3E" opacity="0.16" />
      <rect x="-5" y="-18" width="10" height="20" rx="3" fill="#8D5524" stroke="#5A3310" strokeWidth="2.2" />
      <path d="M-28 -14 L0 -50 L28 -14 Q0 -8 -28 -14 Z" fill="#16A34A" stroke="#14532D" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M-22 -40 L0 -82 L22 -40 Q0 -34 -22 -40 Z" fill="#22C55E" stroke="#15803D" strokeWidth="2.4" strokeLinejoin="round" />
    </g>
  )
}

function Arbol({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="4" rx="34" ry="8" fill="#7C5A3E" opacity="0.16" />
      <path d="M-6 2 L-4 -40 Q0 -42 4 -40 L6 2 Z" fill="#8D5524" stroke="#5A3310" strokeWidth="2.2" strokeLinejoin="round" />
      {/* Silueta exterior para contorno limpio sin cortes interiores */}
      <g fill="#15803D">
        <circle cx="-16" cy="-56" r="24.4" />
        <circle cx="16" cy="-58" r="26.4" />
        <circle cx="0" cy="-80" r="26.4" />
      </g>
      <g fill="#22C55E">
        <circle cx="-16" cy="-56" r="22" />
        <circle cx="16" cy="-58" r="24" />
        <circle cx="0" cy="-80" r="24" />
      </g>
      <circle cx="-14" cy="-54" r="4.5" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
      <circle cx="14" cy="-60" r="4.5" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
      <circle cx="2" cy="-78" r="4.5" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
    </g>
  )
}

function Montana({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="4" rx="76" ry="12" fill="#7C5A3E" opacity="0.14" />
      {/* Cara izquierda iluminada */}
      <path d="M-74 0 L0 -120 L0 0 Z" fill="#94A3B8" stroke="#64748B" strokeWidth="2.6" strokeLinejoin="round" />
      {/* Cara derecha sombreada */}
      <path d="M0 0 L0 -120 L74 0 Z" fill="#64748B" stroke="#475569" strokeWidth="2.6" strokeLinejoin="round" />
      {/* Cima nevada con festón redondeado suave */}
      <path d="M0 -120 L-26 -74 Q-13 -64 0 -74 Q13 -64 26 -74 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  )
}

function Roca({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="3" rx="24" ry="6" fill="#7C5A3E" opacity="0.14" />
      <path d="M-22 0 C-24 -14 -10 -22 2 -20 C16 -18 24 -10 22 0 Z" fill="#94A3B8" stroke="#64748B" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M2 -20 C16 -18 24 -10 22 0 L4 0 Z" fill="#64748B" />
    </g>
  )
}

function Cactus({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="3" rx="24" ry="6" fill="#7C5A3E" opacity="0.14" />
      {/* Brazo izquierdo redondeado */}
      <path d="M-8 -36 H-18 A8 8 0 0 1 -26 -44 V-56 A6 6 0 0 1 -14 -56 V-46 A2 2 0 0 0 -12 -44 H-8 Z" fill="#16A34A" stroke="#14532D" strokeWidth="2.4" strokeLinejoin="round" />
      {/* Brazo derecho redondeado */}
      <path d="M8 -26 H18 A8 8 0 0 0 26 -34 V-50 A6 6 0 0 0 14 -50 V-36 A2 2 0 0 1 12 -34 H8 Z" fill="#16A34A" stroke="#14532D" strokeWidth="2.4" strokeLinejoin="round" />
      {/* Tronco principal */}
      <rect x="-9" y="-80" width="18" height="82" rx="9" fill="#16A34A" stroke="#14532D" strokeWidth="2.6" />
      {/* Flor superior */}
      <circle cx="0" cy="-84" r="5" fill="#F97316" stroke="#C2410C" strokeWidth="1.8" />
    </g>
  )
}

function Seta({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="2" rx="10" ry="3" fill="#7C5A3E" opacity="0.14" />
      <rect x="-4" y="-14" width="8" height="15" rx="3" fill="#FFFDF9" stroke="#D8CFBF" strokeWidth="1.8" />
      <path d="M-13 -12 C-13 -26 13 -26 13 -12 Z" fill="#EA580C" stroke="#9A3412" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="-4" cy="-18" r="2.2" fill="#FFFDF9" />
      <circle cx="4" cy="-16" r="1.8" fill="#FFFDF9" />
    </g>
  )
}

function Flores({ x, y, seed }) {
  const floresColores = [
    { fill: '#FB923C', stroke: '#C2410C' },
    { fill: '#FACC15', stroke: '#D97706' },
    { fill: '#FFFDF9', stroke: '#D8CFBF' },
    { fill: '#C084FC', stroke: '#7E22CE' },
  ]
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = seed + i * 1.7
        const px = Math.round(Math.cos(a) * (10 + i * 4))
        const py = Math.round(Math.sin(a) * (5 + i * 2))
        const col = floresColores[(i + Math.round(seed)) % floresColores.length]
        return (
          <g key={i}>
            <line x1={px} y1={py} x2={px} y2={py - 10} stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
            <circle cx={px} cy={py - 11} r="4" fill={col.fill} stroke={col.stroke} strokeWidth="1.6" />
          </g>
        )
      })}
    </g>
  )
}

function Caseta({ x, y }) {
  const t = useT()
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="3" rx="58" ry="11" fill="#7C5A3E" opacity="0.16" />
      <rect x="-44" y="-60" width="88" height="62" rx="4" fill="#FEF3C7" stroke="#D97706" strokeWidth="2.8" />
      <path d="M-56 -56 L0 -100 L56 -56 Z" fill="#EA580C" stroke="#9A3412" strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M-16 2 V-24 A16 16 0 0 1 16 -24 V2 Z" fill="#78350F" stroke="#451A03" strokeWidth="2.4" />
      <circle cx="10" cy="-14" r="2.8" fill="#FACC15" />
      <rect x="-24" y="-76" width="48" height="16" rx="5" fill="#FFFDF9" stroke="#D8CFBF" strokeWidth="2" />
      <text y="-64" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#451A03" fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" letterSpacing="0.08em">{t('juegos.arenaCasa')}</text>
    </g>
  )
}

function Escenario() {
  const { width, height } = VIEW
  const { x, y, w, h, inset } = TRAY
  const ix = x + inset
  const iy = y + inset
  const iw = w - inset * 2
  const ih = h - inset * 2
  const zonePaths = Object.fromEntries(ZONES.map((z) => [z.id, smoothPath(z.pts)]))

  // Pinos ordenados por profundidad (y ascendente) para superposiciones correctas
  const pinos = [
    [250, 130, 0.75],
    [450, 150, 0.8],
    [170, 170, 0.85],
    [330, 210, 0.95],
    [520, 240, 0.9],
    [210, 280, 0.9],
    [400, 300, 0.8],
  ].sort((a, b) => a[1] - b[1])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id="ar-inner"><rect x={ix} y={iy} width={iw} height={ih} rx="20" /></clipPath>
      </defs>

      {/* Bandeja: madera y arena cálida */}
      <rect x={x} y={y} width={w} height={h} rx="26" fill="#FAF6F0" stroke="#C0834B" strokeWidth="3.5" />

      {/* Arena y ecosistemas: formas planas con contorno oscurecido */}
      <g clipPath="url(#ar-inner)">
        <rect x={ix} y={iy} width={iw} height={ih} fill="#FAF6F0" />
        {ZONES.map((z) => (
          <path key={z.id} d={zonePaths[z.id]} fill={ZONE_FILL[z.id]} stroke={ZONE_STROKE[z.id]} strokeWidth="2.8" strokeLinejoin="round" />
        ))}

        {/* Lago: brillos, nenúfares y pato */}
        <g>
          <ellipse cx="760" cy="350" rx="60" ry="14" fill="#FFFFFF" opacity="0.22" />
          <ellipse cx="850" cy="405" rx="36" ry="8" fill="#FFFFFF" opacity="0.18" />
          <circle cx="700" cy="398" r="9" fill="#15803D" stroke="#14532D" strokeWidth="1.8" />
          <circle cx="700" cy="396" r="3.5" fill="#F97316" />
          <circle cx="890" cy="342" r="8" fill="#15803D" stroke="#14532D" strokeWidth="1.8" />
          <circle cx="890" cy="340" r="3" fill="#F97316" />
          <g transform="translate(815 375)">
            <ellipse cy="6" rx="16" ry="5" fill="#7C5A3E" opacity="0.14" />
            <path d="M-12 2 C-12 -6 4 -10 8 -4 C10 -10 18 -10 18 -4 C18 2 12 3 8 3 L-8 5 Z" fill="#FFFDF9" stroke="#CBD5E1" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="14" cy="-6" r="1.6" fill="#334155" />
            <path d="M18 -4 L24 -3 L18 -1 Z" fill="#F97316" stroke="#C2410C" strokeWidth="1.2" />
          </g>
        </g>

        {/* Montañas y rocas ordenadas por profundidad */}
        <Roca x={1110} y={130} s={0.6} />
        <Roca x={1420} y={190} s={0.7} />
        <Montana x={1180} y={210} s={0.9} />
        <Roca x={1060} y={240} s={0.9} />
        <Montana x={1320} y={250} s={1.1} />

        {/* Bosque */}
        {pinos.map(([px, py, s]) => (
          <Pino key={`${px}`} x={px} y={py} s={s} />
        ))}
        <Seta x={150} y={230} /><Seta x={290} y={250} /><Seta x={480} y={270} />
        {/* Tronco caído */}
        <g transform="translate(560 300) rotate(-12)">
          <rect x="-34" y="-9" width="68" height="18" rx="9" fill="#8D5524" stroke="#5A3310" strokeWidth="2.6" />
          <ellipse cx="34" cy="0" rx="5" ry="9" fill="#C0834B" stroke="#8D5524" strokeWidth="2" />
        </g>

        {/* Pradera */}
        <Arbol x={220} y={500} s={0.95} />
        <Flores x={330} y={470} seed={1} /><Flores x={450} y={520} seed={3} /><Flores x={170} y={520} seed={5} /><Flores x={520} y={470} seed={2} />
        {/* Valla bonita de madera */}
        <g transform="translate(300 520)">
          <ellipse cx="60" cy="34" rx="68" ry="6" fill="#7C5A3E" opacity="0.14" />
          <rect x="0" y="8" width="120" height="6" rx="3" fill="#8D5524" stroke="#5A3310" strokeWidth="2" />
          <rect x="0" y="20" width="120" height="6" rx="3" fill="#8D5524" stroke="#5A3310" strokeWidth="2" />
          {[8, 60, 112].map((px) => (
            <path key={px} d={`M${px - 4} 32 V2 L${px} -3 L${px + 4} 2 V32 Z`} fill="#A76834" stroke="#5A3310" strokeWidth="2" strokeLinejoin="round" />
          ))}
        </g>

        {/* Desierto */}
        <Cactus x={1300} y={440} s={0.55} />
        <Roca x={1440} y={470} s={0.6} />
        <Cactus x={1150} y={480} s={0.85} />
        <Cactus x={1380} y={540} s={0.7} />

        {/* Arena libre: caseta, hueso y piedras */}
        <Caseta x={800} y={566} />
        <g transform="translate(640 560) rotate(-20)">
          <ellipse cy="6" rx="18" ry="4" fill="#7C5A3E" opacity="0.12" />
          <rect x="-14" y="-3" width="28" height="6" rx="3" fill="#FFFDF9" stroke="#D8CFBF" strokeWidth="1.6" />
          <circle cx="-14" cy="-4" r="4.2" fill="#FFFDF9" stroke="#D8CFBF" strokeWidth="1.6" />
          <circle cx="-14" cy="4" r="4.2" fill="#FFFDF9" stroke="#D8CFBF" strokeWidth="1.6" />
          <circle cx="14" cy="-4" r="4.2" fill="#FFFDF9" stroke="#D8CFBF" strokeWidth="1.6" />
          <circle cx="14" cy="4" r="4.2" fill="#FFFDF9" stroke="#D8CFBF" strokeWidth="1.6" />
        </g>
        <ellipse cx="900" cy="170" rx="8" ry="5" fill="#94A3B8" stroke="#64748B" strokeWidth="1.8" />
        <ellipse cx="960" cy="568" rx="7" ry="4.5" fill="#94A3B8" stroke="#64748B" strokeWidth="1.8" />
      </g>

      {/* Borde del área jugable */}
      <rect x={ix} y={iy} width={iw} height={ih} rx="20" fill="none" stroke="#F59E0B" strokeWidth="2.8" strokeDasharray="12 10" />

      {/* Estante de los perros: acabado de madera acogedor y delimitador punteado */}
      <rect x={x} y={SHELF.y} width={w} height={SHELF.h - 4} rx="22" fill="#F5EFE6" stroke="#D8C8B5" strokeWidth="3" />
      <path d={`M${x + 26} ${SHELF.y + 128} H${x + w - 26}`} stroke="#C0834B" strokeWidth="2.6" strokeDasharray="10 8" strokeLinecap="round" />
    </svg>
  )
}

export default memo(Escenario)
