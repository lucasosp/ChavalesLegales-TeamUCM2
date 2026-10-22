'use client'

import styles from './arena.module.css'

// Cada perro se dibuja mirando a la derecha con el origen (0,0) en el suelo, bajo su centro.

function Fur({ id, light, dark, angle = 90 }) {
  return (
    <linearGradient id={id} gradientTransform={`rotate(${angle - 90} .5 .5)`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={light} />
      <stop offset="1" stopColor={dark} />
    </linearGradient>
  )
}

function Eye({ x, y, r = 4, look = 0 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r + 1.2} fill="#fff" opacity=".9" />
      <circle cx={x + look} cy={y} r={r} fill="#3D271D" />
      <circle cx={x + look + r * 0.35} cy={y - r * 0.4} r={r * 0.35} fill="#fff" />
      <circle cx={x + look - r * 0.3} cy={y + r * 0.35} r={r * 0.15} fill="#fff" opacity=".8" />
    </g>
  )
}

function Nose({ x, y, r = 4 }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.78} fill="#3D271D" />
      <ellipse cx={x - r * 0.3} cy={y - r * 0.35} rx={r * 0.35} ry={r * 0.22} fill="#fff" opacity=".55" />
    </g>
  )
}

function Chihuahua() {
  return (
    <g>
      <defs>
        <Fur id="ch-f" light="#ecbd84" dark="#b67a3e" />
        <Fur id="ch-d" light="#c99358" dark="#8e5a2a" />
      </defs>
      <path d="M-22 -30 L-24 -2 h6 L-14 -28 Z M12 -28 L12 -2 h6 L18 -28 Z" fill="url(#ch-d)" />
      <g className={styles.tail} style={{ transformOrigin: '-28px -40px' }}>
        <path d="M-28 -40 C-44 -46 -46 -66 -32 -70 C-38 -62 -36 -52 -26 -46 Z" fill="url(#ch-f)" />
      </g>
      <ellipse cx="-4" cy="-38" rx="30" ry="16" fill="url(#ch-f)" />
      <path d="M-17 -30 L-17 -2 h7 L-8 -28 Z M18 -30 L20 -2 h7 L24 -32 Z" fill="url(#ch-f)" />
      <path d="M-18 -2 h8 M19 -2 h8" stroke="#f5deb3" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 -46 C22 -40 26 -32 22 -26 C16 -30 10 -36 10 -42 Z" fill="#f6dfba" />
      <path d="M16 -70 L8 -108 L32 -80 Z" fill="url(#ch-f)" />
      <path d="M16 -76 L12 -100 L27 -82 Z" fill="#f2a7a0" />
      <path d="M34 -80 L44 -110 L48 -74 Z" fill="url(#ch-d)" />
      <path d="M37 -80 L44 -103 L45 -78 Z" fill="#e8958c" />
      <circle cx="28" cy="-64" r="20" fill="url(#ch-f)" />
      <ellipse cx="46" cy="-56" rx="11" ry="8" fill="#f6dfba" />
      <Nose x={55} y={-58} r={3.6} />
      <path d="M46 -50 Q50 -48 54 -51" stroke="#5c3a1e" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <Eye x={35} y={-67} r={5.6} look={0.8} />
      <path d="M22 -48 Q30 -42 38 -46" stroke="#dc2626" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="32" cy="-42" r="3" fill="#facc15" />
    </g>
  )
}

function Carlino() {
  return (
    <g>
      <defs>
        <Fur id="pg-f" light="#f1d6a8" dark="#c49a5f" />
        <Fur id="pg-d" light="#d7b67e" dark="#9e7740" />
        <radialGradient id="pg-m" cx="50%" cy="35%" r="70%">
          <stop offset="0" stopColor="#5a4636" /><stop offset="1" stopColor="#3D271D" />
        </radialGradient>
      </defs>
      <path d="M-26 -26 L-28 -2 h9 L-16 -24 Z M10 -24 L10 -2 h9 L20 -26 Z" fill="url(#pg-d)" />
      <g className={styles.tail} style={{ transformOrigin: '-34px -48px' }}>
        <path d="M-34 -48 C-48 -50 -50 -66 -38 -68 C-28 -69 -28 -58 -36 -58 C-40 -58 -41 -62 -37 -63" stroke="url(#pg-f)" strokeWidth="7" fill="none" strokeLinecap="round" />
      </g>
      <ellipse cx="-6" cy="-36" rx="36" ry="22" fill="url(#pg-f)" />
      <path d="M-20 -24 L-20 -2 h10 L-8 -22 Z M18 -26 L20 -2 h10 L28 -28 Z" fill="url(#pg-f)" />
      <path d="M-21 -2 h11 M19 -2 h11" stroke="#5c3a1e" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      <g transform="rotate(-10 30 -60)">
        <circle cx="30" cy="-62" r="25" fill="url(#pg-f)" />
        <path d="M10 -78 C2 -84 0 -70 8 -64 Z M44 -82 C54 -88 58 -74 50 -68 Z" fill="#4A3326" />
        <ellipse cx="40" cy="-52" rx="17" ry="14" fill="url(#pg-m)" />
        <path d="M20 -74 Q30 -80 40 -74 M22 -68 Q30 -72 38 -68" stroke="#a37d47" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".6" />
        <Eye x={24} y={-62} r={6} look={1.5} />
        <Eye x={44} y={-63} r={6} look={-1.5} />
        <Nose x={42} y={-54} r={4} />
        <path d="M34 -46 Q40 -42 48 -46" stroke="#3b2a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M37 -45 C36 -34 46 -32 46 -44 Z" fill="#f472b6" />
        <path d="M41.5 -44 V-37" stroke="#db2777" strokeWidth="1" />
      </g>
      <path d="M12 -44 Q22 -38 34 -40" stroke="#2563eb" strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Bichon() {
  const puffs = [[-22, -34, 13], [-8, -40, 15], [8, -38, 14], [-14, -26, 12], [4, -26, 12], [-28, -24, 9]]
  return (
    <g>
      <defs>
        <radialGradient id="bc-f" cx="40%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".7" stopColor="#f1ece4" /><stop offset="1" stopColor="#cfc6b8" />
        </radialGradient>
      </defs>
      <path d="M-20 -18 v16 h9 v-16 Z M8 -18 v16 h9 v-16 Z" fill="#d9d1c4" />
      {puffs.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="url(#bc-f)" />)}
      <path d="M-26 -16 C-22 -6 -12 -4 -6 -10" stroke="#e6dfd3" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M-15 -14 v12 h9 v-12 Z M12 -14 v12 h9 v-12 Z" fill="url(#bc-f)" />
      <g transform="translate(22 -46) rotate(14)">
        <circle cx="2" cy="-4" r="20" fill="url(#bc-f)" />
        <circle cx="-8" cy="-18" r="9" fill="url(#bc-f)" />
        <circle cx="8" cy="-20" r="9" fill="url(#bc-f)" />
        <ellipse cx="-12" cy="4" rx="8" ry="15" fill="#e8e1d5" />
        <ellipse cx="16" cy="2" rx="9" ry="7" fill="#f7f3ec" />
        <Nose x={22} y={0} r={3.4} />
        <path d="M8 6 Q12 9 16 6" stroke="#6b5e50" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <Eye x={6} y={-6} r={4} look={0} />
        <path d="M1 -13 Q5 -11 9 -12" stroke="#a89a88" strokeWidth="1.3" fill="none" />
        <ellipse cx="9" cy="2" rx="4" ry="2.3" fill="#f9a8b4" opacity=".7" />
      </g>
      <path d="M8 -36 Q18 -30 28 -32" stroke="#a78bfa" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Pastor() {
  return (
    <g>
      <defs>
        <Fur id="ps-f" light="#d79a52" dark="#9a5f25" />
        <Fur id="ps-d" light="#3a2c22" dark="#3D271D" />
      </defs>
      <path d="M-36 -46 L-42 -2 h9 L-26 -44 Z M22 -46 L20 -2 h9 L32 -48 Z" fill="#8a5424" />
      <g className={styles.tail} style={{ transformOrigin: '-46px -60px' }}>
        <path d="M-46 -62 C-60 -56 -68 -36 -66 -20 C-60 -30 -56 -44 -42 -52 Z" fill="url(#ps-d)" />
      </g>
      <path d="M-50 -60 C-50 -78 -10 -82 20 -76 C40 -72 46 -56 40 -44 C20 -36 -30 -36 -44 -42 Z" fill="url(#ps-f)" />
      <path d="M-48 -62 C-40 -78 0 -82 24 -74 C14 -64 -20 -60 -46 -56 Z" fill="url(#ps-d)" />
      <path d="M-40 -44 L-34 -2 h10 L-24 -42 Z M26 -46 L30 -2 h10 L38 -50 Z" fill="url(#ps-f)" />
      <path d="M-35 -2 h11 M30 -2 h11" stroke="#5c3412" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 -70 C34 -80 42 -96 52 -100 C64 -102 74 -92 86 -86 C90 -82 88 -76 82 -74 L58 -70 C50 -58 40 -50 30 -46 Z" fill="url(#ps-f)" />
      <path d="M42 -96 L44 -128 L60 -100 Z" fill="url(#ps-d)" />
      <path d="M46 -100 L47 -120 L56 -102 Z" fill="#6b4a3a" />
      <path d="M56 -100 L66 -128 L72 -96 Z" fill="url(#ps-d)" />
      <path d="M62 -84 C70 -88 80 -86 88 -84 C90 -78 86 -74 80 -74 C72 -74 64 -76 60 -80 Z" fill="#3D271D" />
      <Nose x={88} y={-84} r={4} />
      <path d="M72 -74 Q78 -72 84 -75" stroke="#4a2810" strokeWidth="1.5" fill="none" />
      <Eye x={62} y={-92} r={3.8} look={0.6} />
      <path d="M57 -97 Q62 -99 67 -96" stroke="#4a2810" strokeWidth="1.6" fill="none" />
      <path d="M34 -60 Q42 -54 50 -58" stroke="#047857" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="44" cy="-55" r="3.4" fill="#fbbf24" />
    </g>
  )
}

function Dalmata() {
  const spots = [[-22, -54, 4], [-10, -60, 3], [-2, -50, 4.5], [-30, -44, 3], [8, -42, 3.4], [-16, -42, 2.6]]
  return (
    <g>
      <defs>
        <Fur id="dm-f" light="#ffffff" dark="#ddd8d0" />
      </defs>
      <circle cx="74" cy="-11" r="11" fill="#ef4444" />
      <path d="M66 -16 Q74 -10 82 -16" stroke="#fff" strokeWidth="2" fill="none" opacity=".7" />
      <path d="M-30 -48 L-34 -2 h8 L-22 -46 Z M20 -20 L32 -2 h9 L28 -24 Z" fill="#d6d1c7" />
      <g className={styles.tail} style={{ transformOrigin: '-36px -60px' }}>
        <path d="M-36 -60 C-44 -72 -46 -86 -40 -96" stroke="url(#dm-f)" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
      <path d="M-40 -56 C-40 -70 -14 -70 4 -56 C20 -46 30 -30 30 -22 C20 -16 0 -24 -16 -32 C-30 -38 -40 -44 -40 -56 Z" fill="url(#dm-f)" />
      {spots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#3D322B" />)}
      <path d="M-24 -40 L-24 -2 h9 L-14 -36 Z" fill="url(#dm-f)" />
      <path d="M14 -18 L44 -6 L44 0 L12 -4 Z M24 -22 L56 -12 L56 -6 L22 -12 Z" fill="url(#dm-f)" />
      <circle cx="-20" cy="-18" r="2.4" fill="#3D322B" /><circle cx="36" cy="-6" r="2" fill="#3D322B" />
      <g transform="translate(40 -30)">
        <path d="M-12 -12 C-22 -10 -22 10 -14 16 C-10 8 -8 -2 -6 -8 Z" fill="#3D322B" />
        <circle cx="0" cy="-6" r="17" fill="url(#dm-f)" />
        <ellipse cx="16" cy="0" rx="10" ry="8" fill="#fafaf9" />
        <circle cx="-6" cy="-14" r="2.6" fill="#3D322B" /><circle cx="6" cy="6" r="2" fill="#3D322B" />
        <Nose x={25} y={-2} r={3.6} />
        <path d="M12 7 Q18 12 24 7" stroke="#4a2810" strokeWidth="1.4" fill="none" />
        <path d="M15 8 C14 18 22 18 22 9 Z" fill="#f472b6" />
        <Eye x={7} y={-10} r={4.6} look={1} />
        <path d="M14 -22 C22 -28 26 -16 20 -12 Z" fill="#3D322B" />
      </g>
      <path d="M22 -34 Q28 -28 30 -20" stroke="#f97316" strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Basset() {
  return (
    <g>
      <defs>
        <Fur id="bs-f" light="#c47a3e" dark="#7c4317" />
        <Fur id="bs-d" light="#3b2a1e" dark="#3D271D" />
      </defs>
      <g className={styles.tail} style={{ transformOrigin: '-54px -24px' }}>
        <path d="M-54 -24 C-66 -24 -74 -30 -78 -38" stroke="#f3eadc" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
      <path d="M-58 -16 C-60 -34 -36 -44 -4 -42 C24 -40 36 -30 36 -14 C36 -4 20 0 -10 0 C-40 0 -58 -2 -58 -16 Z" fill="url(#bs-f)" />
      <path d="M-50 -34 C-40 -46 -6 -46 10 -40 C0 -30 -30 -28 -48 -26 Z" fill="url(#bs-d)" />
      <path d="M-40 -2 C-44 -10 -34 -12 -28 -6 L-26 0 Z" fill="#f3eadc" />
      <path d="M14 -6 h30 c4 0 4 6 0 6 h-30 Z" fill="#f3eadc" />
      <g transform="translate(46 -18)">
        <ellipse cx="0" cy="-4" rx="20" ry="16" fill="url(#bs-f)" />
        <path d="M-2 -18 C6 -20 6 2 2 4" stroke="#f3eadc" strokeWidth="6" fill="none" />
        <ellipse cx="18" cy="4" rx="14" ry="9" fill="#f3eadc" />
        <Nose x={30} y={1} r={4} />
        <path d="M-10 -14 C-26 -10 -26 14 -14 20 C-6 22 -2 14 -4 4 Z" fill="url(#bs-d)" />
        <path d="M4 -8 Q9 -5 14 -8" stroke="#4a2810" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M5 -5 Q9 -1 13 -5" stroke="#b45309" strokeWidth="1" fill="none" opacity=".6" />
      </g>
      <g className={styles.zzz} fill="#7C5A3E" fontFamily="var(--font-display)" fontWeight="800">
        <text x="60" y="-46" fontSize="13">z</text>
        <text x="70" y="-58" fontSize="17">z</text>
      </g>
    </g>
  )
}

function Husky() {
  return (
    <g>
      <defs>
        <Fur id="hk-f" light="#8a96a6" dark="#4a5463" />
        <Fur id="hk-w" light="#ffffff" dark="#dfe3e8" />
      </defs>
      <g className={styles.tail} style={{ transformOrigin: '-24px -14px' }}>
        <path d="M-24 -14 C-46 -12 -52 -32 -40 -44 C-40 -32 -34 -24 -20 -24 Z" fill="url(#hk-f)" />
      </g>
      <path d="M-30 -6 C-36 -30 -20 -64 4 -70 C22 -66 26 -40 22 -10 Z" fill="url(#hk-f)" />
      <path d="M-30 -2 C-34 -14 -22 -22 -6 -18 C2 -14 0 -2 -6 0 Z" fill="url(#hk-f)" />
      <path d="M2 -66 C16 -60 22 -40 18 -12 C10 -20 4 -40 2 -66 Z" fill="url(#hk-w)" />
      <path d="M8 -50 L6 -2 h9 L18 -48 Z M16 -48 L18 -2 h9 L24 -44 Z" fill="url(#hk-w)" />
      <path d="M-26 -2 h20" stroke="#e5e7eb" strokeWidth="5" strokeLinecap="round" />
      <path d="M-2 -60 L14 -40 L30 -58 L22 -66 L6 -66 Z" fill="#dc2626" />
      <path d="M6 -56 l2 2 M14 -50 l2 2 M22 -56 l2 2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <g transform="translate(14 -84)">
        <path d="M-14 -14 L-14 -40 L0 -20 Z M8 -20 L18 -42 L22 -14 Z" fill="url(#hk-f)" />
        <path d="M-11 -18 L-11 -32 L-3 -21 Z M10 -20 L17 -33 L18 -17 Z" fill="#f1c4c4" />
        <ellipse cx="2" cy="-4" rx="20" ry="19" fill="url(#hk-f)" />
        <path d="M2 -22 C-4 -14 -10 -4 -12 6 C-6 14 12 14 18 8 C16 -4 8 -14 2 -22 Z" fill="url(#hk-w)" />
        <ellipse cx="18" cy="4" rx="11" ry="8" fill="url(#hk-w)" />
        <Nose x={27} y={2} r={3.8} />
        <path d="M16 11 Q21 14 26 10" stroke="#475569" strokeWidth="1.4" fill="none" />
        <circle cx="10" cy="-6" r="4.6" fill="#fff" />
        <circle cx="10.6" cy="-6" r="3.6" fill="#38bdf8" />
        <circle cx="11" cy="-6" r="1.8" fill="#1E293B" />
        <circle cx="12" cy="-7.5" r="1" fill="#fff" />
        <path d="M5 -12 Q10 -14 15 -11" stroke="#64748B" strokeWidth="1.6" fill="none" />
      </g>
    </g>
  )
}

function Golden() {
  return (
    <g>
      <defs>
        <Fur id="gd-f" light="#f5c46b" dark="#c4842c" />
        <Fur id="gd-d" light="#e3a54c" dark="#a8681c" />
      </defs>
      <path d="M-32 -42 L-36 -2 h9 L-22 -40 Z M18 -42 L16 -2 h9 L26 -44 Z" fill="url(#gd-d)" />
      <g className={styles.tail} style={{ transformOrigin: '-40px -54px' }}>
        <path d="M-40 -56 C-58 -58 -70 -46 -74 -32 C-64 -40 -56 -44 -38 -46 Z" fill="url(#gd-f)" />
      </g>
      <path d="M-44 -50 C-44 -68 -4 -70 22 -64 C40 -60 42 -44 34 -36 C14 -30 -26 -30 -40 -36 Z" fill="url(#gd-f)" />
      <path d="M-36 -38 L-30 -2 h10 L-22 -34 Z M24 -40 L28 -2 h10 L34 -42 Z" fill="url(#gd-f)" />
      <path d="M28 -60 C30 -74 42 -90 58 -88 C72 -86 80 -76 86 -70 C88 -64 84 -60 76 -60 L60 -58 C52 -46 40 -38 30 -38 Z" fill="url(#gd-f)" />
      <path d="M46 -84 C34 -82 32 -60 40 -52 C48 -56 50 -70 52 -80 Z" fill="url(#gd-d)" />
      <Nose x={85} y={-70} r={4} />
      <path d="M70 -60 Q78 -58 84 -62" stroke="#5c3a10" strokeWidth="1.5" fill="none" />
      <path d="M74 -59 C73 -50 81 -50 81 -60 Z" fill="#f472b6" />
      <path d="M58 -80 Q63 -84 68 -80" stroke="#4a2810" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M36 -50 Q44 -44 52 -48" stroke="#e11d48" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M46 -44 l4 8 l-6 0 Z" fill="#fbbf24" />
    </g>
  )
}

export const DOGS = [
  { id: 'pipo', name: 'Pipo', trait: 'pequeño', Art: Chihuahua, scale: 0.78, width: 80 },
  { id: 'choco', name: 'Choco', trait: 'gracioso', Art: Carlino, scale: 0.92, width: 100 },
  { id: 'nube', name: 'Nube', trait: 'tímido', Art: Bichon, scale: 0.92, width: 80 },
  { id: 'trueno', name: 'Trueno', trait: 'grande', Art: Pastor, scale: 1, width: 150 },
  { id: 'lola', name: 'Lola', trait: 'juguetona', Art: Dalmata, scale: 0.92, width: 130 },
  { id: 'bruno', name: 'Bruno', trait: 'dormilón', Art: Basset, scale: 0.92, width: 140 },
  { id: 'rayo', name: 'Rayo', trait: 'valiente', Art: Husky, scale: 0.95, width: 90 },
  { id: 'miel', name: 'Miel', trait: 'cariñosa', Art: Golden, scale: 0.95, width: 140 },
]

export function Perro({ dog, flip, lifted, idle }) {
  const { Art, scale } = dog
  return (
    <g>
      {/* Sombra base suave y contacto para anclar el animal al suelo */}
      <ellipse cx="0" cy="0" rx={dog.width * 0.44 * scale} ry={8 * scale} fill="#7C5A3E" opacity="0.22" style={{ transform: lifted ? 'translateY(10px) scale(1.15)' : 'none', transition: 'transform .15s' }} />
      <ellipse cx="0" cy="1" rx={dog.width * 0.30 * scale} ry={4.5 * scale} fill="#5A3A1F" opacity="0.25" style={{ transform: lifted ? 'translateY(10px) scale(1.15)' : 'none', transition: 'transform .15s' }} />
      <g
        className={idle ? styles.idle : undefined}
        style={{ transform: `translateY(${lifted ? -12 : 0}px) scale(${(flip ? -1 : 1) * scale * (lifted ? 1.08 : 1)}, ${scale * (lifted ? 1.08 : 1)})`, transition: 'transform .15s' }}
      >
        <g transform={`translate(${-dog.width * 0.08} 0)`}><Art /></g>
      </g>
    </g>
  )
}
