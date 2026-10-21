'use client'

import { memo, useMemo } from 'react'
import styles from './arena.module.css'
import { VIEW, ZONES, smoothPath } from './config'

function Nube({ x, y, s = 1, dark }) {
  const top = dark ? '#64748b' : '#ffffff'
  const bottom = dark ? '#334155' : '#cbd5e1'
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={styles.cloud}>
      <defs>
        <linearGradient id={`nb-${dark ? 'd' : 'l'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <ellipse cx="6" cy="40" rx="90" ry="10" fill="rgba(0,0,0,.18)" />
      <g fill={`url(#nb-${dark ? 'd' : 'l'})`}>
        <circle cx="-50" cy="0" r="30" /><circle cx="-12" cy="-18" r="40" /><circle cx="34" cy="-8" r="34" /><circle cx="64" cy="8" r="24" />
        <rect x="-78" y="0" width="160" height="30" rx="15" />
      </g>
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
  const cloudY = Math.max(90, box.y0 + 40)

  return (
    <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <clipPath id="cl-zone"><path d={d} /></clipPath>
        <radialGradient id="cl-sun">
          <stop offset="0" stopColor="#fff7c2" /><stop offset=".5" stopColor="#fde047" /><stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
        <radialGradient id="cl-heat">
          <stop offset="0" stopColor="#f97316" stopOpacity=".35" /><stop offset="1" stopColor="#f97316" stopOpacity=".1" />
        </radialGradient>
      </defs>

      <g clipPath="url(#cl-zone)" className={styles.weatherIn}>
        {type === 'tormenta' && <path d={d} fill="#0f172a" opacity=".38" />}
        {type === 'tormenta' && <path d={d} fill="#e0f2fe" className={styles.flash} />}
        {type === 'nevada' && <path d={d} fill="#f8fafc" className={styles.snowCover} />}
        {type === 'calor' && <path d={d} fill="url(#cl-heat)" className={styles.heat} />}
        {type === 'viento' && <path d={d} fill="#78716c" opacity=".15" />}

        {type === 'tormenta' && particles.map((p, i) => (
          <line key={i} x1={p.x} y1={p.y} x2={p.x - 8} y2={p.y + 26} stroke="#bfdbfe" strokeWidth={1.6 * p.s} strokeLinecap="round" opacity=".8"
            className={styles.rain} style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
        ))}
        {type === 'nevada' && particles.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.2 * p.s} fill="#fff"
            className={styles.snow} style={{ animationDelay: `${p.delay * 3}s`, animationDuration: `${p.dur * 6}s` }} />
        ))}
        {type === 'viento' && particles.slice(0, 26).map((p, i) => (
          i % 2
            ? <path key={i} d={`M${p.x - 120} ${p.y + 40} q40 -18 80 0 t80 0`} stroke="#f8fafc" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7"
                className={styles.gust} style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur * 2.4}s` }} />
            : <ellipse key={i} cx={p.x - 100} cy={p.y + 40} rx="6" ry="3" fill={i % 4 ? '#a3e635' : '#f59e0b'}
                className={styles.leaf} style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur * 3}s` }} />
        ))}
        {type === 'calor' && Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${box.x0 + 40 + i * ((box.x1 - box.x0) / 6)} ${box.y1 - 20} q10 -20 0 -40 q-10 -20 0 -40`} stroke="#fff7ed" strokeWidth="3" fill="none" opacity=".5"
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
        <path className={styles.bolt} d={`M${zone.cx + 20} ${cloudY + 40} l-26 52 h20 l-18 50 l46 -64 h-22 l18 -38 Z`} fill="#fde047" stroke="#fef9c3" strokeWidth="2" />
      )}
      {type === 'viento' && <Nube x={zone.cx} y={cloudY} s={0.8} />}
      {type === 'calor' && (
        <g transform={`translate(${zone.cx + 120} ${Math.max(90, box.y0 + 40)})`} className={styles.weatherIn}>
          <circle r="90" fill="#fde047" opacity=".18" />
          <g className={styles.sunRays}>
            {Array.from({ length: 12 }, (_, i) => (
              <path key={i} d="M0 -62 L7 -44 L-7 -44 Z" fill="#fbbf24" transform={`rotate(${i * 30})`} />
            ))}
          </g>
          <circle r="38" fill="url(#cl-sun)" />
        </g>
      )}
    </svg>
  )
}

export default memo(Clima)
