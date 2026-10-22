'use client'

import { memo } from 'react'
import { SHELF, TRAY, VIEW, ZONES, smoothPath } from './config'
import { useT } from '../../../lib/i18n'

// La caja de arena se pinta plana y con contorno de tinta, como la mesa de
// cid-table: nada de degradados suaves ni filtros de relieve (ESTILO.md §15).
const TINTA = 'var(--verde-950)'

// Paleta de los ecosistemas: los cuatro colores planos de juego + los neutros.
// El lago es el único azul de la web: un lago verde no se distingue del bosque
// y aquí el color es dato, no decoración.
const ZONE_FILL = {
  bosque: 'var(--juego-verde)',
  montana: 'var(--neutro-300)',
  lago: 'var(--juego-azul)',
  pradera: 'var(--verde-200)',
  desierto: 'var(--naranja-300)',
}

/**
 * Contorno de un grupo de formas: primero la silueta en tinta un poco más
 * grande y después el relleno encima. Así sale un solo trazo alrededor de la
 * unión, sin las costuras interiores que deja un `stroke` por forma.
 */
function Silueta({ formas, crecer = 3, fill }) {
  return (
    <>
      <g fill={TINTA}>
        {formas.map((f, i) => (
          <circle key={i} cx={f[0]} cy={f[1]} r={f[2] + crecer} />
        ))}
      </g>
      <g fill={fill}>
        {formas.map((f, i) => (
          <circle key={i} cx={f[0]} cy={f[1]} r={f[2]} />
        ))}
      </g>
    </>
  )
}

function Pino({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="10" cy="2" rx="30" ry="8" fill={TINTA} opacity="0.12" />
      <rect x="-6" y="-22" width="12" height="24" rx="3" fill="var(--naranja-800)" stroke={TINTA} strokeWidth="2.4" />
      <path d="M0 -58 L-34 -8 L34 -8 Z" fill="var(--verde-600)" stroke={TINTA} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M0 -114 L-26 -50 L26 -50 Z" fill="var(--verde-700)" stroke={TINTA} strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M0 -98 V-62" stroke="var(--verde-500)" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function Arbol({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="10" cy="2" rx="36" ry="9" fill={TINTA} opacity="0.12" />
      <path d="M-7 0 L-4 -46 L4 -46 L7 0 Z" fill="var(--naranja-800)" stroke={TINTA} strokeWidth="2.4" />
      <Silueta fill="var(--verde-500)" formas={[[-16, -58, 24], [16, -60, 26], [0, -84, 26]]} />
      <circle cx="-16" cy="-56" r="5" fill="var(--naranja-400)" stroke={TINTA} strokeWidth="2" />
      <circle cx="14" cy="-62" r="5" fill="var(--naranja-400)" stroke={TINTA} strokeWidth="2" />
    </g>
  )
}

function Montana({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="14" cy="2" rx="90" ry="12" fill={TINTA} opacity="0.12" />
      <path d="M-80 0 L-6 -130 L80 0 Z" fill="var(--neutro-400)" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      <path d="M-6 -130 L80 0 L12 0 Z" fill="var(--neutro-500)" />
      <path d="M-6 -130 L-36 -78 L-22 -86 L-12 -72 L0 -88 L14 -74 L24 -90 Z" fill="var(--superficie)" stroke={TINTA} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M-40 -40 L-24 -54 M30 -30 L44 -18" stroke="var(--neutro-600)" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function Roca({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="4" cy="2" rx="24" ry="6" fill={TINTA} opacity="0.12" />
      <path d="M-22 0 C-24 -14 -10 -24 2 -22 C16 -20 24 -10 22 0 Z" fill="var(--neutro-400)" stroke={TINTA} strokeWidth="2.6" />
      <path d="M2 -22 C16 -20 24 -10 22 0 L6 0 Z" fill="var(--neutro-500)" />
    </g>
  )
}

function Cactus({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="8" cy="2" rx="26" ry="7" fill={TINTA} opacity="0.12" />
      <g stroke={TINTA} strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M-10 -40 h-12 a6 6 0 0 1 -6 -6 v-18" stroke="var(--verde-600)" strokeWidth="13" />
        <path d="M10 -30 h12 a6 6 0 0 0 6 -6 v-22" stroke="var(--verde-600)" strokeWidth="13" />
      </g>
      <rect x="-10" y="-82" width="20" height="84" rx="10" fill="var(--verde-600)" stroke={TINTA} strokeWidth="2.6" />
      <path d="M0 -74 v64" stroke="var(--verde-700)" strokeWidth="3" strokeLinecap="round" />
      <circle cy="-86" r="6" fill="var(--naranja-400)" stroke={TINTA} strokeWidth="2.2" />
    </g>
  )
}

function Seta({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-4" y="-14" width="8" height="14" rx="2" fill="var(--superficie)" stroke={TINTA} strokeWidth="2" />
      <path d="M-12 -12 C-12 -26 12 -26 12 -12 Z" fill="var(--naranja-400)" stroke={TINTA} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="-4" cy="-18" r="2" fill="var(--superficie)" />
      <circle cx="4" cy="-16" r="1.6" fill="var(--superficie)" />
    </g>
  )
}

function Flores({ x, y, seed }) {
  const colores = ['var(--naranja-400)', 'var(--marca-ambar)', 'var(--superficie)', 'var(--juego-morado)']
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = seed + i * 1.7
        const px = Math.round(Math.cos(a) * (10 + i * 4))
        const py = Math.round(Math.sin(a) * (5 + i * 2))
        return (
          <g key={i}>
            <path d={`M${px} ${py} v-10`} stroke="var(--verde-600)" strokeWidth="2" strokeLinecap="round" />
            <circle cx={px} cy={py - 11} r="4" fill={colores[(i + Math.round(seed)) % colores.length]} stroke={TINTA} strokeWidth="1.6" />
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
      <ellipse cx="10" cy="2" rx="62" ry="12" fill={TINTA} opacity="0.12" />
      <rect x="-48" y="-62" width="96" height="64" fill="var(--naranja-100)" stroke={TINTA} strokeWidth="3" />
      <path d="M-60 -58 L0 -104 L60 -58 Z" fill="var(--naranja-500)" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      <path d="M-20 2 V-26 A20 20 0 0 1 20 -26 V2 Z" fill="var(--naranja-800)" stroke={TINTA} strokeWidth="2.6" />
      <circle cx="11" cy="-16" r="3" fill="var(--marca-ambar)" />
      <rect x="-24" y="-80" width="48" height="16" rx="4" fill="var(--superficie)" stroke={TINTA} strokeWidth="2.4" />
      <text y="-68" textAnchor="middle" fontSize="10.5" fontWeight="800" fill={TINTA} fontFamily="var(--font-display)" letterSpacing="0.08em">{t('juegos.arenaCasa')}</text>
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

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id="ar-inner"><rect x={ix} y={iy} width={iw} height={ih} rx="20" /></clipPath>
      </defs>

      {/* Bandeja: arena cálida con trazo de tinta */}
      <rect x={x} y={y} width={w} height={h} rx="26" fill="var(--naranja-50)" stroke={TINTA} strokeWidth="3" />

      {/* Área jugable: el mismo rectángulo que recorta la escena y que usa el
          juego para saber si un perro está dentro. Se pinta AL FINAL para que
          el borde discontinuo quede por encima de los ecosistemas que lo tocan. */}

      {/* Arena y ecosistemas: formas planas con contorno, sin filtros */}
      <g clipPath="url(#ar-inner)">
        <rect x={ix} y={iy} width={iw} height={ih} fill="var(--naranja-50)" />
        {ZONES.map((z) => (
          <path key={z.id} d={zonePaths[z.id]} fill={ZONE_FILL[z.id]} stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
        ))}

        {/* Dunas de la arena libre */}
        <g fill="none" stroke="var(--naranja-300)" strokeWidth="3" strokeLinecap="round">
          <path d="M1060 430 Q1140 400 1220 430 T1380 430" />
          <path d="M1090 495 Q1180 465 1260 500 T1420 495" />
          <path d="M1120 555 Q1200 530 1290 560" />
        </g>
        {/* Matas de hierba */}
        <g fill="none" stroke="var(--verde-600)" strokeWidth="2.6" strokeLinecap="round">
          {Array.from({ length: 40 }, (_, i) => {
            const gx = 140 + ((i * 53) % 420)
            const gy = 415 + ((i * 37) % 150)
            return <path key={i} d={`M${gx} ${gy} l4 -11 M${gx + 4} ${gy} l-4 -8`} />
          })}
        </g>

        {/* Lago: brillos, nenúfares y un pato */}
        <g>
          <ellipse cx="760" cy="350" rx="70" ry="16" fill="var(--superficie)" opacity="0.28" />
          <ellipse cx="850" cy="410" rx="40" ry="8" fill="var(--superficie)" opacity="0.22" />
          <g stroke="var(--superficie)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7">
            <path d="M700 320 h34 M760 330 h26 M820 300 h30" />
          </g>
          <g fill="var(--verde-600)" stroke={TINTA} strokeWidth="2">
            <path d="M700 400 a16 10 0 1 0 14 -8 l-14 8 Z" />
            <path d="M890 340 a13 8 0 1 0 11 -6 l-11 6 Z" />
          </g>
          <circle cx="706" cy="396" r="4" fill="var(--naranja-400)" />
          <g transform="translate(820 380)">
            <ellipse cy="6" rx="18" ry="5" fill={TINTA} opacity="0.12" />
            <path d="M-14 0 C-14 -10 6 -12 10 -4 C12 -12 20 -12 20 -6 C20 0 14 2 10 2 L-10 4 Z" fill="var(--superficie)" stroke={TINTA} strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx="16" cy="-8" r="1.8" fill={TINTA} />
            <path d="M20 -6 l8 1 l-8 2 Z" fill="var(--naranja-500)" stroke={TINTA} strokeWidth="1.4" />
          </g>
        </g>

        {/* Montañas */}
        <Roca x={1060} y={240} s={0.9} />
        <Montana x={1180} y={210} s={0.9} />
        <Montana x={1320} y={250} s={1.1} />
        <Roca x={1420} y={190} s={0.7} />
        <Roca x={1110} y={130} s={0.6} />

        {/* Bosque */}
        {[[170, 170, 0.85], [250, 130, 0.75], [330, 210, 0.95], [450, 150, 0.8], [520, 240, 0.9], [210, 280, 0.9], [400, 300, 0.8]].map(([px, py, s]) => (
          <Pino key={`${px}`} x={px} y={py} s={s} />
        ))}
        <Seta x={290} y={250} /><Seta x={480} y={270} /><Seta x={150} y={230} />
        {/* Tronco caído */}
        <g transform="translate(560 300) rotate(-12)">
          <rect x="-34" y="-9" width="68" height="18" rx="9" fill="var(--naranja-800)" stroke={TINTA} strokeWidth="2.6" />
          <ellipse cx="34" cy="0" rx="5" ry="9" fill="var(--naranja-300)" stroke={TINTA} strokeWidth="2" />
        </g>

        {/* Pradera */}
        <Arbol x={220} y={500} s={0.95} />
        <Flores x={330} y={470} seed={1} /><Flores x={450} y={520} seed={3} /><Flores x={170} y={520} seed={5} /><Flores x={520} y={470} seed={2} />
        {/* Valla */}
        <g stroke={TINTA} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M300 550 V520 M340 552 V522 M380 554 V524 M420 556 V526" stroke="var(--naranja-800)" strokeWidth="7" />
          <path d="M296 530 L424 536 M296 544 L424 550" stroke="var(--naranja-800)" strokeWidth="5" />
        </g>

        {/* Desierto */}
        <Cactus x={1150} y={480} s={0.85} /><Cactus x={1380} y={540} s={0.7} /><Cactus x={1300} y={440} s={0.55} />
        <Roca x={1440} y={470} s={0.6} />

        {/* Arena libre: caseta, hueso y piedras */}
        <Caseta x={800} y={566} />
        <g transform="translate(640 560) rotate(-20)">
          <path d="M-14 0 h28" stroke="var(--superficie)" strokeWidth="8" strokeLinecap="round" />
          <circle cx="-15" cy="-4" r="5" fill="var(--superficie)" stroke={TINTA} strokeWidth="2" />
          <circle cx="-15" cy="4" r="5" fill="var(--superficie)" stroke={TINTA} strokeWidth="2" />
          <circle cx="15" cy="-4" r="5" fill="var(--superficie)" stroke={TINTA} strokeWidth="2" />
          <circle cx="15" cy="4" r="5" fill="var(--superficie)" stroke={TINTA} strokeWidth="2" />
          <path d="M-14 0 h28" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round" opacity="0.25" />
        </g>
        {/* Pájaros */}
        <g fill="none" stroke={TINTA} strokeWidth="2.4" strokeLinecap="round">
          <path d="M980 150 q8 -9 16 0 q8 -9 16 0" />
          <path d="M640 120 q6 -7 12 0 q6 -7 12 0" />
        </g>
        <circle cx="900" cy="170" r="6" fill="var(--neutro-400)" stroke={TINTA} strokeWidth="2" />
        <circle cx="960" cy="568" r="5" fill="var(--neutro-400)" stroke={TINTA} strokeWidth="2" />
      </g>

      {/* Borde del área jugable (encima de los ecosistemas que lo tocan) */}
      <rect x={ix} y={iy} width={iw} height={ih} rx="20" fill="none" stroke="var(--naranja-400)" strokeWidth="3" strokeDasharray="12 10" />

      {/* Estante de los perros: banda verde, suelo discontinuo y sitio para las
          etiquetas debajo (el nombre y el rasgo van bajo la línea de suelo). */}
      <rect x={x} y={SHELF.y} width={w} height={SHELF.h - 4} rx="22" fill="var(--verde-100)" stroke={TINTA} strokeWidth="3" />
      <path d={`M${x + 26} ${SHELF.y + 128} H${x + w - 26}`} stroke="var(--verde-400)" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" />
    </svg>
  )
}

export default memo(Escenario)
