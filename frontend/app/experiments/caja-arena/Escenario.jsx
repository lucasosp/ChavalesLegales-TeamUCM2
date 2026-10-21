'use client'

import { memo } from 'react'
import { SHELF, TRAY, VIEW, ZONES, smoothPath } from './config'
import { useT } from '../../../lib/i18n'

const ZONE_FILL = {
  bosque: 'url(#ar-bosque)',
  montana: 'url(#ar-montana)',
  lago: 'url(#ar-lago)',
  pradera: 'url(#ar-pradera)',
  desierto: 'url(#ar-desierto)',
}

function Pino({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="10" cy="2" rx="30" ry="8" fill="rgba(0,0,0,.28)" />
      <rect x="-5" y="-16" width="10" height="18" rx="2" fill="#5b3a1e" />
      <path d="M0 -112 L-30 -48 L30 -48 Z" fill="#166534" />
      <path d="M0 -112 L0 -48 L30 -48 Z" fill="#14532d" />
      <path d="M0 -86 L-36 -14 L36 -14 Z" fill="#15803d" />
      <path d="M0 -86 L0 -14 L36 -14 Z" fill="#166534" />
      <path d="M-14 -60 L-6 -70 M10 -36 L18 -26" stroke="#4ade80" strokeWidth="2" opacity=".35" strokeLinecap="round" />
    </g>
  )
}

function Arbol({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="10" cy="2" rx="36" ry="9" fill="rgba(0,0,0,.25)" />
      <path d="M-6 0 L-4 -40 L4 -40 L6 0 Z" fill="#6b4423" />
      <circle cx="-16" cy="-56" r="22" fill="#4d7c0f" />
      <circle cx="16" cy="-58" r="24" fill="#3f6212" />
      <circle cx="0" cy="-78" r="26" fill="#65a30d" />
      <circle cx="-8" cy="-84" r="10" fill="#84cc16" opacity=".55" />
      <circle cx="12" cy="-60" r="4" fill="#ef4444" /><circle cx="-14" cy="-50" r="4" fill="#ef4444" /><circle cx="2" cy="-70" r="4" fill="#ef4444" />
    </g>
  )
}

function Montana({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="14" cy="2" rx="90" ry="12" fill="rgba(0,0,0,.25)" />
      <path d="M-80 0 L-6 -130 L80 0 Z" fill="#78716c" />
      <path d="M-6 -130 L80 0 L10 0 Z" fill="#57534e" />
      <path d="M-6 -130 L-36 -78 L-22 -84 L-12 -70 L0 -86 L14 -74 L22 -90 Z" fill="#f8fafc" />
      <path d="M-6 -130 L22 -90 L14 -74 L4 -84 Z" fill="#cbd5e1" />
      <path d="M-40 -40 L-24 -54 M30 -30 L44 -18" stroke="#a8a29e" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function Roca({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="4" cy="2" rx="24" ry="6" fill="rgba(0,0,0,.28)" />
      <path d="M-22 0 C-24 -14 -10 -24 2 -22 C16 -20 24 -10 22 0 Z" fill="#a8a29e" />
      <path d="M2 -22 C16 -20 24 -10 22 0 L6 0 Z" fill="#78716c" />
    </g>
  )
}

function Cactus({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="8" cy="2" rx="26" ry="7" fill="rgba(0,0,0,.25)" />
      <rect x="-10" y="-80" width="20" height="82" rx="10" fill="#4d7c0f" />
      <rect x="-1" y="-80" width="11" height="82" rx="5" fill="#3f6212" />
      <path d="M-10 -40 h-12 a6 6 0 0 1 -6 -6 v-18" stroke="#4d7c0f" strokeWidth="11" fill="none" strokeLinecap="round" />
      <path d="M10 -30 h12 a6 6 0 0 0 6 -6 v-22" stroke="#3f6212" strokeWidth="11" fill="none" strokeLinecap="round" />
      <circle cy="-84" r="5" fill="#f472b6" />
    </g>
  )
}

function Seta({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-3" y="-12" width="6" height="12" rx="2" fill="#fef3c7" />
      <path d="M-11 -10 C-11 -22 11 -22 11 -10 Z" fill="#dc2626" />
      <circle cx="-4" cy="-15" r="1.8" fill="#fff" /><circle cx="4" cy="-13" r="1.5" fill="#fff" />
    </g>
  )
}

function Flores({ x, y, seed }) {
  const colors = ['#f472b6', '#facc15', '#ffffff', '#a78bfa', '#fb7185']
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 6 }, (_, i) => {
        const a = seed + i * 1.7
        const px = Math.round(Math.cos(a) * (10 + i * 4))
        const py = Math.round(Math.sin(a) * (5 + i * 2))
        return (
          <g key={i}>
            <path d={`M${px} ${py} v-9`} stroke="#3f6212" strokeWidth="1.5" />
            <circle cx={px} cy={py - 10} r="3.6" fill={colors[(i + Math.round(seed)) % colors.length]} />
            <circle cx={px} cy={py - 10} r="1.3" fill="#ca8a04" />
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
      <ellipse cx="10" cy="2" rx="62" ry="12" fill="rgba(0,0,0,.28)" />
      <rect x="-48" y="-62" width="96" height="64" fill="#c2410c" />
      <rect x="-48" y="-62" width="96" height="64" fill="url(#ar-planks)" />
      <path d="M-60 -58 L0 -104 L60 -58 L50 -54 L0 -92 L-50 -54 Z" fill="#7c2d12" />
      <path d="M0 -104 L60 -58 L50 -54 L0 -92 Z" fill="#5c1d0b" />
      <path d="M-20 2 V-26 A20 20 0 0 1 20 -26 V2 Z" fill="#2a120a" />
      <rect x="-22" y="-80" width="44" height="13" rx="3" fill="#fef3c7" />
      <text y="-70" textAnchor="middle" fontSize="10" fontWeight="800" fill="#7c2d12" fontFamily="Fredoka, sans-serif">{t('juegos.arenaCasa')}</text>
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
        <filter id="ar-relief" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="3" seed="7" result="n" />
          <feDiffuseLighting in="n" surfaceScale="9" lightingColor="#fff6e5" result="light">
            <feDistantLight azimuth="235" elevation="52" />
          </feDiffuseLighting>
          <feBlend in="SourceGraphic" in2="light" mode="multiply" result="lit" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.55 -0.2" result="grain" />
          <feComposite in="grain" in2="lit" operator="over" result="all" />
          <feComposite in="all" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="ar-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="ar-blur2"><feGaussianBlur stdDeviation="2.5" /></filter>
        <clipPath id="ar-inner"><rect x={ix} y={iy} width={iw} height={ih} rx="14" /></clipPath>
        <linearGradient id="ar-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8693a" /><stop offset=".5" stopColor="#8a5226" /><stop offset="1" stopColor="#6b3c18" />
        </linearGradient>
        <pattern id="ar-grainwood" width="400" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 6 Q100 2 200 7 T400 5 M0 16 Q120 20 240 15 T400 17" stroke="#5c3010" strokeWidth="1.2" fill="none" opacity=".35" />
        </pattern>
        <pattern id="ar-planks" width="96" height="12" patternUnits="userSpaceOnUse" x="-48">
          <path d="M0 11.5 H96" stroke="#7c2d12" strokeWidth="1.5" />
        </pattern>
        <linearGradient id="ar-sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecd3a4" /><stop offset="1" stopColor="#dcbb85" />
        </linearGradient>
        <radialGradient id="ar-bosque" cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor="#3f7a35" /><stop offset=".8" stopColor="#2f5f2a" /><stop offset="1" stopColor="#5b6d33" />
        </radialGradient>
        <radialGradient id="ar-montana" cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#d6d3d1" /><stop offset=".7" stopColor="#a8a29e" /><stop offset="1" stopColor="#b8a98c" />
        </radialGradient>
        <radialGradient id="ar-lago" cx="45%" cy="40%" r="60%">
          <stop offset="0" stopColor="#38bdf8" /><stop offset=".65" stopColor="#0284c7" /><stop offset="1" stopColor="#075985" />
        </radialGradient>
        <radialGradient id="ar-pradera" cx="50%" cy="45%" r="65%">
          <stop offset="0" stopColor="#86c35a" /><stop offset=".8" stopColor="#6aa846" /><stop offset="1" stopColor="#9cb766" />
        </radialGradient>
        <radialGradient id="ar-desierto" cx="50%" cy="45%" r="65%">
          <stop offset="0" stopColor="#f2a65a" /><stop offset=".8" stopColor="#e28a3e" /><stop offset="1" stopColor="#dda56a" />
        </radialGradient>
        <linearGradient id="ar-shelf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a4520" /><stop offset="1" stopColor="#4a2610" />
        </linearGradient>
        <linearGradient id="ar-felt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f5f4a" /><stop offset="1" stopColor="#134436" />
        </linearGradient>
        <linearGradient id="ar-innershade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".35" /><stop offset=".08" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bandeja de madera */}
      <rect x={x + 8} y={y + 16} width={w} height={h} rx="30" fill="rgba(0,0,0,.45)" filter="url(#ar-soft)" />
      <rect x={x} y={y} width={w} height={h} rx="30" fill="url(#ar-wood)" />
      <rect x={x} y={y} width={w} height={h} rx="30" fill="url(#ar-grainwood)" />
      <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx="27" fill="none" stroke="rgba(255,230,190,.25)" strokeWidth="2" />
      <rect x={ix - 6} y={iy - 6} width={iw + 12} height={ih + 12} rx="18" fill="#2b6cb0" />

      {/* Arena y ecosistemas, con relieve y grano */}
      <g clipPath="url(#ar-inner)">
        <g filter="url(#ar-relief)">
          <rect x={ix} y={iy} width={iw} height={ih} fill="url(#ar-sand)" />
          <path d={zonePaths.lago} fill="#bf9f6c" stroke="#bf9f6c" strokeWidth="26" strokeLinejoin="round" />
          {ZONES.map((z) => (
            <path key={z.id} d={zonePaths[z.id]} fill={ZONE_FILL[z.id]} filter={z.id === 'lago' ? undefined : 'url(#ar-blur2)'} />
          ))}
          <g fill="none" stroke="#c46f2a" strokeWidth="3" opacity=".55" strokeLinecap="round">
            <path d="M1060 470 Q1140 440 1220 470 T1380 470" />
            <path d="M1090 540 Q1180 510 1260 545 T1420 540" />
            <path d="M1120 600 Q1200 575 1290 605" />
          </g>
          <g fill="#4a8f34" opacity=".5">
            {Array.from({ length: 40 }, (_, i) => (
              <path key={i} d={`M${140 + ((i * 53) % 420)} ${430 + ((i * 37) % 180)} l3 -9 l3 9`} />
            ))}
          </g>
        </g>
        <rect x={ix} y={iy} width={iw} height={ih} fill="url(#ar-innershade)" />

        {/* Lago: brillos y nenúfares */}
        <g>
          <ellipse cx="760" cy="350" rx="70" ry="16" fill="#fff" opacity=".18" />
          <ellipse cx="850" cy="410" rx="40" ry="8" fill="#fff" opacity=".14" />
          <g fill="#4d7c0f"><path d="M700 400 a16 10 0 1 0 14 -8 l-14 8 Z" /><path d="M890 340 a13 8 0 1 0 11 -6 l-11 6 Z" /></g>
          <circle cx="706" cy="396" r="4" fill="#f9a8d4" />
          <g transform="translate(820 380)">
            <ellipse rx="18" ry="5" fill="rgba(0,0,0,.15)" cy="4" />
            <path d="M-14 0 C-14 -10 6 -12 10 -4 C12 -12 20 -12 20 -6 C20 0 14 2 10 2 L-10 4 Z" fill="#fef9c3" />
            <circle cx="16" cy="-8" r="1.5" fill="#1c1410" />
            <path d="M20 -6 l7 1 l-7 2 Z" fill="#f97316" />
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
        <g transform="translate(560 300) rotate(-12)">
          <rect x="-34" y="-9" width="68" height="18" rx="9" fill="#7c4a1e" />
          <ellipse cx="34" cy="0" rx="5" ry="9" fill="#d6a46a" />
        </g>

        {/* Pradera */}
        <Arbol x={220} y={500} s={0.95} />
        <Flores x={330} y={470} seed={1} /><Flores x={450} y={560} seed={3} /><Flores x={170} y={600} seed={5} /><Flores x={520} y={480} seed={2} />
        <g stroke="#a16207" strokeWidth="5" strokeLinecap="round">
          <path d="M300 610 V580 M340 612 V582 M380 614 V584 M420 616 V586" />
          <path d="M296 590 L424 596 M296 604 L424 610" strokeWidth="4" />
        </g>

        {/* Desierto */}
        <Cactus x={1150} y={500} s={0.85} /><Cactus x={1380} y={580} s={0.7} /><Cactus x={1300} y={460} s={0.55} />
        <Roca x={1440} y={480} s={0.6} />

        {/* Arena libre */}
        <Caseta x={800} y={620} />
        <g transform="translate(640 560) rotate(-20)">
          <path d="M-14 0 h28 M-14 0 a4 4 0 1 1 0 -0.1 M14 0 a4 4 0 1 0 0 0.1" stroke="#fffbeb" strokeWidth="6" strokeLinecap="round" fill="none" />
        </g>
        <g fill="#f5f0e6" opacity=".9">
          <path d="M980 150 q8 -10 16 0 q-8 6 -16 0 Z" /><path d="M640 120 q6 -8 12 0 q-6 5 -12 0 Z" />
        </g>
        <circle cx="900" cy="170" r="6" fill="#a8a29e" /><circle cx="960" cy="610" r="5" fill="#a8a29e" />
      </g>

      {/* Estante con los perros */}
      <rect x={x + 6} y={SHELF.y + 10} width={w} height={SHELF.h - 6} rx="20" fill="rgba(0,0,0,.4)" filter="url(#ar-soft)" />
      <rect x={x} y={SHELF.y} width={w} height={SHELF.h - 6} rx="20" fill="url(#ar-shelf)" />
      <rect x={x} y={SHELF.y} width={w} height={SHELF.h - 6} rx="20" fill="url(#ar-grainwood)" />
      <rect x={x + 14} y={SHELF.y + 12} width={w - 28} height={SHELF.h - 30} rx="12" fill="url(#ar-felt)" />
      <rect x={x + 14} y={SHELF.y + 12} width={w - 28} height="10" rx="5" fill="rgba(0,0,0,.25)" />
    </svg>
  )
}

export default memo(Escenario)
