'use client'

import styles from './informe.module.css'

const ACENTO = '#10b981'
const DESTACADO = '#dc2626'
const REJILLA = '#e2e8f0'
const TEXTO = '#64748b'

function ticks(max, n = 4) {
  if (!max) return [0]
  const paso = Math.pow(10, Math.floor(Math.log10(max / n)))
  const bonito = [1, 2, 2.5, 5, 10].map((k) => k * paso).find((p) => max / p <= n) ?? paso * 10
  return Array.from({ length: Math.ceil(max / bonito) + 1 }, (_, i) => +(i * bonito).toFixed(6))
}

// Barras verticales con línea de referencia opcional
export function Barras({ datos, unidad = '', referencia, alto = 220, formato = (v) => v }) {
  const W = 720
  const H = alto
  const m = { t: 30, r: 16, b: 46, l: 60 }
  const max = Math.max(...datos.map((d) => d.valor), referencia?.valor ?? 0) * 1.1 || 1
  const ts = ticks(max)
  const top = ts.at(-1)
  const y = (v) => m.t + (H - m.t - m.b) * (1 - v / top)
  const bw = (W - m.l - m.r) / Math.max(datos.length, 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="Gráfico de barras">
      {ts.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={REJILLA} strokeDasharray="3 3" />
          <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fontWeight="600" fill={TEXTO}>{formato(t)}{unidad}</text>
        </g>
      ))}
      {datos.map((d, i) => {
        const x = m.l + i * bw + bw * 0.18
        const w = bw * 0.64
        return (
          <g key={i}>
            <title>{`${d.titulo ?? d.etiqueta}: ${formato(d.valor)}${unidad}`}</title>
            <rect
              x={x}
              y={y(d.valor)}
              width={w}
              height={y(0) - y(d.valor)}
              rx="6"
              fill={d.destacado ? DESTACADO : ACENTO}
              stroke="#18181b"
              strokeWidth="1.5"
            />
            <text x={x + w / 2} y={y(d.valor) - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="#0f172a">{formato(d.valor)}</text>
            <text x={x + w / 2} y={H - m.b + 16} textAnchor="middle" fontSize="11" fontWeight="700" fill={TEXTO}>{d.etiqueta}</text>
          </g>
        )
      })}
      {referencia && (
        <g>
          <line x1={m.l} x2={W - m.r} y1={y(referencia.valor)} y2={y(referencia.valor)} stroke="#064e3b" strokeWidth="2" strokeDasharray="5 4" />
          <line x1={W - m.r - 200} x2={W - m.r - 180} y1={10} y2={10} stroke="#064e3b" strokeWidth="2" strokeDasharray="5 4" />
          <text x={W - m.r} y={14} textAnchor="end" fontSize="11" fontWeight="800" fill="#064e3b">{referencia.etiqueta}</text>
        </g>
      )}
      <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke="#18181b" strokeWidth="2" />
    </svg>
  )
}

// Barras horizontales para comparar categorías con nombre largo
export function BarrasH({ datos, unidad = '', formato = (v) => v, ancho = 720 }) {
  const fila = 32
  const W = ancho
  const l = ancho < 500 ? 110 : 180
  const H = datos.length * fila + 16
  const max = Math.max(...datos.map((d) => d.valor), 0) * 1.15 || 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="Gráfico de barras horizontales">
      {datos.map((d, i) => {
        const w = ((W - l - 70) * d.valor) / max
        const yy = 6 + i * fila
        return (
          <g key={i}>
            <text x={l - 12} y={yy + 18} textAnchor="end" fontSize="12" fontWeight="700" fill="#0f172a">{d.etiqueta}</text>
            <rect x={l} y={yy + 4} width={W - l - 70} height={fila - 10} rx="6" fill="#e2e8f0" />
            <rect
              x={l}
              y={yy + 4}
              width={Math.max(w, 2)}
              height={fila - 10}
              rx="6"
              fill={d.color ?? ACENTO}
              stroke="#18181b"
              strokeWidth="1.2"
            />
            <text x={l + Math.max(w, 2) + 10} y={yy + 18} fontSize="12" fontWeight="800" fill="#0f172a">{formato(d.valor)}{unidad}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Línea temporal de acciones con marcadores de eventos
export function LineaTiempo({ duracion, marcas, eventos = [] }) {
  const W = 720
  const H = 96
  const l = 20
  const r = 20
  const x = (t) => l + ((W - l - r) * t) / Math.max(duracion, 1)
  const colores = { colocar: ACENTO, mover: '#0284c7', girar: '#8b5cf6', retirar: '#94a3b8' }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label="Línea temporal de acciones">
      <line x1={l} x2={W - r} y1={50} y2={50} stroke="#18181b" strokeWidth="2.5" />
      {eventos.map((e) => (
        <line key={e.etiqueta} x1={x(e.t)} x2={x(e.t)} y1={14} y2={70} stroke={DESTACADO} strokeWidth="2.5" strokeDasharray="4 3">
          <title>{e.etiqueta}</title>
        </line>
      ))}
      {eventos.map((e) => (
        <text key={`${e.etiqueta}-t`} x={x(e.t) + 6} y={20} fontSize="11" fontWeight="800" fill={DESTACADO}>{e.etiqueta}</text>
      ))}
      {marcas.map((m, i) => (
        <circle key={i} cx={x(m.t)} cy={50} r="7" fill={colores[m.tipo] ?? ACENTO} stroke="#18181b" strokeWidth="2">
          <title>{`${m.etiqueta} · ${(m.t / 1000).toFixed(1)} s`}</title>
        </circle>
      ))}
      <text x={l} y={88} fontSize="11" fontWeight="700" fill={TEXTO}>0 s</text>
      <text x={W - r} y={88} fontSize="11" fontWeight="700" fill={TEXTO} textAnchor="end">{(duracion / 1000).toFixed(0)} s</text>
      {Object.entries(colores).map(([k, c], i) => (
        <g key={k} transform={`translate(${190 + i * 110} 82)`}>
          <circle r="6" fill={c} cy="2" stroke="#18181b" strokeWidth="1.5" />
          <text x="12" y="6" fontSize="11" fontWeight="700" fill="#0f172a">{k}</text>
        </g>
      ))}
    </svg>
  )
}

export function Kpi({ etiqueta, valor, nota, icon = '📊' }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiCardHeader}>
        <span className={styles.kpiLabel}>{etiqueta}</span>
        <span className={styles.kpiIcon}>{icon}</span>
      </div>
      <strong className={styles.kpiValue}>{valor}</strong>
      {nota && <p className={styles.kpiNote}>{nota}</p>}
    </div>
  )
}
