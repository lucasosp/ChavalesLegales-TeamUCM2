'use client'

import { memo, useMemo } from 'react'
import styles from './arena.module.css'
import { VIEW, ZONES, smoothPath } from './config'

const BULTOS = [[-50, 0, 30], [-12, -18, 40], [34, -8, 34], [64, 8, 24]]
const BASE = { x: -78, y: 0, w: 160, h: 30, r: 15 }

function Nube({ x, y, s = 1, dark }) {
  const crecer = 3
  const strokeColor = dark ? '#475569' : '#CBD5E1'
  const fillColor = dark ? '#64748B' : '#FFFDF9'
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={styles.cloud}>
        <ellipse cx="6" cy="42" rx="90" ry="10" fill="#7C5A3E" opacity="0.14" />
        {/* Silueta y contorno flat oscurecido */}
        <g fill={strokeColor}>
          {BULTOS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r + crecer} />
          ))}
          <rect x={BASE.x - crecer} y={BASE.y - crecer} width={BASE.w + crecer * 2} height={BASE.h + crecer * 2} rx={BASE.r + crecer} />
        </g>
        <g fill={fillColor}>
          {BULTOS.map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} />
          ))}
          <rect x={BASE.x} y={BASE.y} width={BASE.w} height={BASE.h} rx={BASE.r} />
        </g>
        {dark && (
          <g fill="none" stroke="#334155" strokeWidth="2.4" strokeLinecap="round" opacity="0.6">
            <path d="M-30 8 h26 M6 14 h30" />
          </g>
        )}
      </g>
    </g>
  )
}

function Clima({ weather }) {
  const zone = ZONES.find((z) => z.id === weather.zone)
  const d = smoothPath(zone.pts)
  const xs = zone.pts.map((p) => p[0])
  const ys = zone.pts.map((p) => p[1])
  const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }

  const particles = useMemo(
    () => Array.from({ length: weather.type === 'calor' ? 0 : 90 }, () => ({
      x: box.x0 + Math.random() * (box.x1 - box.x0 + 80),
      y: box.y0 - 60 + Math.random() * (box.y1 - box.y0),
      delay: -Math.random() * 2,
      dur: 0.55 + Math.random() * 0.5,
      s: 0.6 + Math.random() * 0.8,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weather.zone, weather.type],
  )

  const { type } = weather
  const cloudY = Math.max(80, box.y0 - 30)

  return (
    <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id="cl-zone"><path d={d} /></clipPath>
      </defs>

      <g clipPath="url(#cl-zone)" className={styles.weatherIn}>
        {type === 'tormenta' && <path d={d} fill="#334155" opacity="0.30" />}
        {type === 'tormenta' && <path d={d} fill="#FFFFFF" className={styles.flash} />}
        {type === 'nevada' && <path d={d} fill="#FFFFFF" className={styles.snowCover} />}
        {type === 'calor' && <path d={d} fill="#F97316" opacity="0.22" className={styles.heat} />}
        {type === 'viento' && <path d={d} fill="#94A3B8" opacity="0.16" />}

        {type === 'tormenta' && particles.map((p, i) => (
          <line key={i} x1={p.x} y1={p.y} x2={p.x - 8} y2={p.y + 26} stroke="#38BDF8" strokeWidth={1.8 * p.s} strokeLinecap="round" opacity="0.85"
            className={styles.rain} style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
        ))}
        {type === 'nevada' && particles.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.4 * p.s} fill="#FFFFFF" stroke="#38BDF8" strokeWidth="1"
            className={styles.snow} style={{ animationDelay: `${p.delay * 3}s`, animationDuration: `${p.dur * 6}s` }} />
        ))}
        {type === 'viento' && particles.slice(0, 26).map((p, i) => (
          i % 2
            ? <path key={i} d={`M${p.x - 120} ${p.y + 40} q40 -18 80 0 t80 0`} stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85"
                className={styles.gust} style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur * 2.4}s` }} />
            : <ellipse key={i} cx={p.x - 100} cy={p.y + 40} rx="7" ry="3.4" fill={i % 4 ? '#16A34A' : '#F97316'} stroke={i % 4 ? '#14532D' : '#C2410C'} strokeWidth="1.2"
                className={styles.leaf} style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur * 3}s` }} />
        ))}
        {type === 'calor' && Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${box.x0 + 40 + i * ((box.x1 - box.x0) / 6)} ${box.y1 - 20} q10 -20 0 -40 q-10 -20 0 -40`} stroke="#FFFFFF" strokeWidth="4" fill="none" opacity="0.65" strokeLinecap="round"
            className={styles.shimmer} style={{ animationDelay: `${-i * 0.4}s` }} />
        ))}
      </g>

      {(type === 'tormenta' || type === 'nevada') && (
        <g className={styles.weatherIn}>
          <Nube x={zone.cx - 90} y={cloudY} s={0.9} dark={type === 'tormenta'} />
          <Nube x={zone.cx + 80} y={cloudY + 20} s={1.05} dark={type === 'tormenta'} />
        </g>
      )}
      {type === 'tormenta' && (
        <path className={styles.bolt} d={`M${zone.cx + 20} ${cloudY + 40} l-26 52 h20 l-18 50 l46 -64 h-22 l18 -38 Z`} fill="#FACC15" stroke="#D97706" strokeWidth="2.8" strokeLinejoin="round" />
      )}
      {type === 'viento' && <Nube x={zone.cx} y={cloudY} s={0.8} />}
      {type === 'calor' && (
        <g transform={`translate(${zone.cx + 120} ${Math.max(80, box.y0 - 30)})`} className={styles.weatherIn}>
          <circle r="92" fill="#FACC15" opacity="0.18" />
          <g className={styles.sunRays}>
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M0 -66 L8 -46 L-8 -46 Z" fill="#FACC15" stroke="#D97706" strokeWidth="2.2" strokeLinejoin="round" transform={`rotate(${i * 30})`} />
            ))}
          </g>
          <circle r="38" fill="#FACC15" stroke="#D97706" strokeWidth="3" />
        </g>
      )}
    </svg>
  )
}

export default memo(Clima)