'use client'

import styles from './servicios.module.css'
import { useT } from '../../lib/i18n'

// Paleta de gráficas: verde para las series y naranja para el dato destacado.
// Los tokens salen de globals.css, así que el informe sigue el mismo esquema
// que el resto de la app sin hexes sueltos repartidos por los SVG.
const ACENTO = 'var(--verde-700)'
const DESTACADO = 'var(--naranja-700)'
const REJILLA = 'var(--borde)'
const TEXTO = 'var(--texto-medio)'

function ticks(max, n = 4) {
  if (!max) return [0]
  const paso = Math.pow(10, Math.floor(Math.log10(max / n)))
  const bonito = [1, 2, 2.5, 5, 10].map((k) => k * paso).find((p) => max / p <= n) ?? paso * 10
  return Array.from({ length: Math.ceil(max / bonito) + 1 }, (_, i) => +(i * bonito).toFixed(6))
}

// Barras verticales con línea de referencia opcional (p. ej. la mediana del propio menor)
export function Barras({ datos, unidad = '', referencia, leyenda, ejeY, ejeX, alto = 220, formato = (v) => v }) {
  const t = useT()
  const W = 720
  const H = alto
  // Leyendas dentro del gráfico, arriba a la derecha y en la misma columna: la
  // de la mediana y, si la hay, la del dato destacado, las dos a cuerpo 11.
  const leyendas = [
    ...(referencia ? [{ texto: referencia.etiqueta, tipo: 'linea' }] : []),
    ...(leyenda ? [{ texto: leyenda, tipo: 'cuadro' }] : []),
  ]
  const m = { t: 30 + Math.max(0, leyendas.length - 1) * 16, r: 16, b: ejeX ? 58 : 46, l: ejeY ? 74 : 60 }
  // Ancho aproximado del rótulo más largo (dentro del SVG no se puede medir)
  const anchoLeyenda = Math.max(0, ...leyendas.map((l) => l.texto.length * 5.8))
  const max = Math.max(...datos.map((d) => d.valor), referencia?.valor ?? 0) * 1.1 || 1
  const ts = ticks(max)
  const top = ts.at(-1)
  const y = (v) => m.t + (H - m.t - m.b) * (1 - v / top)
  const bw = (W - m.l - m.r) / Math.max(datos.length, 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label={t('informe.ariaBarras')}>
      {ts.map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={REJILLA} />
          <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={TEXTO}>{formato(t)}{unidad}</text>
        </g>
      ))}
      {datos.map((d, i) => {
        const x = m.l + i * bw + bw * 0.18
        const w = bw * 0.64
        return (
          <g key={i}>
            <title>{`${d.titulo ?? d.etiqueta}: ${formato(d.valor)}${unidad}`}</title>
            <rect x={x} y={y(d.valor)} width={w} height={y(0) - y(d.valor)} rx="3" fill={d.destacado ? DESTACADO : ACENTO} opacity={d.destacado ? 1 : 0.85} />
            <text x={x + w / 2} y={y(d.valor) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--neutro-800)">{formato(d.valor)}</text>
            <text x={x + w / 2} y={H - m.b + 16} textAnchor="middle" fontSize="11" fill={TEXTO}>{d.etiqueta}</text>
          </g>
        )
      })}
      {ejeY && (
        <text
          transform="rotate(-90)"
          x={-(m.t + (H - m.t - m.b) / 2)}
          y={13}
          textAnchor="middle"
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.04em"
          fill={TEXTO}
        >
          {ejeY}
        </text>
      )}
      {ejeX && (
        <text x={m.l + (W - m.l - m.r) / 2} y={H - 8} textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="0.04em" fill={TEXTO}>
          {ejeX}
        </text>
      )}
      {referencia && (
        <line x1={m.l} x2={W - m.r} y1={y(referencia.valor)} y2={y(referencia.valor)} stroke="var(--neutro-700)" strokeDasharray="5 4" />
      )}
      {leyendas.map((l, i) => {
        const yb = 14 + i * 16
        // Las dos filas comparten columna: el texto arranca en la misma x (la que
        // deja el rótulo más largo) y la marca va 16 unidades a su izquierda. Así
        // "Mediana = 1,5 s" y "Outliers" quedan cuadrados en vertical.
        const xTexto = W - m.r - anchoLeyenda
        const xMarca = xTexto - 16
        return (
          <g key={l.texto}>
            {l.tipo === 'linea' ? (
              <line x1={xMarca} x2={xMarca + 12} y1={yb - 4} y2={yb - 4} stroke="var(--neutro-700)" strokeDasharray="5 4" />
            ) : (
              <rect x={xMarca} y={yb - 9} width="10" height="10" rx="2" fill={DESTACADO} />
            )}
            <text x={xTexto} y={yb} textAnchor="start" fontSize="11" fontWeight="700" fill="var(--neutro-700)">{l.texto}</text>
          </g>
        )
      })}
      <line x1={m.l} x2={W - m.r} y1={y(0)} y2={y(0)} stroke="var(--neutro-400)" />
    </svg>
  )
}

// Barras horizontales para comparar categorías con nombre largo
export function BarrasH({ datos, unidad = '', formato = (v) => v, ancho = 720 }) {
  const t = useT()
  const fila = 30
  const W = ancho
  const l = ancho < 500 ? 100 : 170
  const H = datos.length * fila + 12
  const max = Math.max(...datos.map((d) => d.valor), 0) * 1.12 || 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label={t('informe.ariaBarrasH')}>
      {datos.map((d, i) => {
        const w = ((W - l - 60) * d.valor) / max
        const yy = 6 + i * fila
        return (
          <g key={i}>
            <text x={l - 10} y={yy + 17} textAnchor="end" fontSize="12" fill="var(--neutro-800)">{d.etiqueta}</text>
            <rect x={l} y={yy + 4} width={W - l - 60} height={fila - 10} rx="4" fill="var(--neutro-100)" />
            <rect x={l} y={yy + 4} width={Math.max(w, 2)} height={fila - 10} rx="4" fill={d.color ?? ACENTO} />
            <text x={l + Math.max(w, 2) + 8} y={yy + 18} fontSize="12" fontWeight="700" fill="var(--neutro-800)">{formato(d.valor)}{unidad}</text>
          </g>
        )
      })}
    </svg>
  )
}

// Línea temporal de acciones con marcadores de eventos
export function LineaTiempo({ duracion, marcas, eventos = [] }) {
  const t = useT()
  const W = 720
  const H = 96
  const l = 20
  const r = 20
  const x = (t) => l + ((W - l - r) * t) / Math.max(duracion, 1)
  const colores = { colocar: ACENTO, mover: 'var(--naranja-600)', girar: 'var(--verde-500)', retirar: 'var(--neutro-400)' }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-label={t('informe.ariaLineaTiempo')}>
      <line x1={l} x2={W - r} y1={50} y2={50} stroke="var(--neutro-300)" strokeWidth="2" />
      {eventos.map((e) => (
        <line key={e.etiqueta} x1={x(e.t)} x2={x(e.t)} y1={14} y2={70} stroke={DESTACADO} strokeWidth="2" strokeDasharray="4 3">
          <title>{e.etiqueta}</title>
        </line>
      ))}
      {eventos.map((e) => (
        <text key={`${e.etiqueta}-t`} x={x(e.t) + 6} y={20} fontSize="11" fontWeight="700" fill={DESTACADO}>{e.etiqueta}</text>
      ))}
      {marcas.map((m, i) => (
        <circle key={i} cx={x(m.t)} cy={50} r="6" fill={colores[m.tipo] ?? ACENTO} stroke="var(--superficie)" strokeWidth="1.5">
          <title>{`${m.etiqueta} · ${(m.t / 1000).toFixed(1)} s`}</title>
        </circle>
      ))}
      <text x={l} y={88} fontSize="11" fill={TEXTO}>0 s</text>
      <text x={W - r} y={88} fontSize="11" fill={TEXTO} textAnchor="end">{(duracion / 1000).toFixed(0)} s</text>
      {Object.entries(colores).map(([k, c], i) => (
        <g key={k} transform={`translate(${200 + i * 100} 82)`}>
          <circle r="5" fill={c} cy="2" />
          <text x="10" y="6" fontSize="11" fill={TEXTO}>{t(`informe.accion_${k}`)}</text>
        </g>
      ))}
    </svg>
  )
}

export function Kpi({ etiqueta, valor, nota }) {
  return (
    <div className={styles.kpiCard}>
      <span className={styles.kpiLabel}>{etiqueta}</span>
      <strong className={styles.kpiValue}>{valor}</strong>
      {nota && <span className={styles.kpiNote}>{nota}</span>}
    </div>
  )
}
