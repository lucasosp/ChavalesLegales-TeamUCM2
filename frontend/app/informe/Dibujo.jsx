'use client'

import styles from './informe.module.css'
import { fmtDuracion, fmtSeg } from './analisis'
import { useT } from '../../lib/i18n'
import { Pendiente } from './piezas'

const CUADRANTE = { 'top-left': 'cuadrante_supIzq', 'top-right': 'cuadrante_supDer', 'bottom-left': 'cuadrante_infIzq', 'bottom-right': 'cuadrante_infDer' }

function Delta({ dibujo }) {
  const t = useT()
  const d = dibujo?.deltaMetrics
  if (!d) return <Pendiente texto={t('informe.sinDelta')} />

  const conSigno = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v}`)
  const pct = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v} %`)
  const siNo = (v) => (v ? t('informe.si') : t('informe.no'))

  const filas = [
    [t('informe.deltaTemblor'), conSigno(d.delta_tremor_index), pct(d.tremor_change_percent)],
    [t('informe.deltaPresion'), conSigno(d.delta_pressure_mean), pct(d.pressure_change_percent)],
    [t('informe.deltaOcupacion'), conSigno(d.delta_occupancy_ratio), pct(d.occupancy_change_percent)],
    [t('informe.deltaLatencia'), fmtSeg(d.delta_initial_latency_ms), ''],
    [t('informe.deltaAire'), conSigno(d.delta_air_time_ratio), ''],
    [t('informe.deltaVelocidad'), conSigno(d.delta_velocity_mean), ''],
    [t('informe.deltaBorrados'), conSigno(d.delta_eraser_strokes), ''],
    [t('informe.deltaMonocromia'), `${siNo(d.m1_monochrome)} → ${siNo(d.m2_monochrome)}`, ''],
  ]

  return (
    <>
      <h4 className={styles.subtituloBloque}>{t('informe.deltaTitulo')}</h4>
      <table className={styles.tabla}>
        <thead>
          <tr>
            <th>{t('informe.colIndicador')}</th>
            <th>{t('informe.colDiferencia')}</th>
            <th>{t('informe.colVariacion')}</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([nombre, valor, variacion]) => (
            <tr key={nombre}>
              <td>{nombre}</td>
              <td>{valor}</td>
              <td>{variacion}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.leyenda}>{t('informe.deltaLeyenda')}</p>
    </>
  )
}

// Las alertas las genera el motor (avatarStore.#generateAlerts) con título y detalle ya
// redactados. Se muestran tal cual: traducir el texto clínico no entra en este refactor (D12).
function Alertas({ alertas }) {
  const t = useT()
  const lista = Array.isArray(alertas) ? alertas : []

  return (
    <>
      <h4 className={styles.subtituloBloque}>{t('informe.alertasTitulo')}</h4>
      {lista.length === 0 ? (
        <p className={styles.leyenda}>{t('informe.sinAlertas')}</p>
      ) : (
        <ul className={styles.listaAlertas}>
          {lista.map((alerta) => (
            <li
              key={alerta.type}
              className={alerta.severity === 'warning' ? styles.alertaGrave : styles.alertaLeve}
            >
              <strong>{alerta.title}</strong>
              <p>{alerta.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function Dibujo({ dibujo }) {
  const t = useT()
  const fases = [['phase1', t('informe.primerDibujo')], ['phase2', t('informe.segundoDibujo')]].filter(([k]) => dibujo[k])
  const filas = [
    [t('informe.filaLatencia'), (m) => fmtSeg(m.initial_latency_ms)],
    [t('informe.filaDuracionTotal'), (m) => fmtDuracion(m.duration_total_ms)],
    [t('informe.filaTiempoActivo'), (m) => fmtDuracion(m.active_drawing_time_ms)],
    [t('informe.filaPausas'), (m) => m.hesitation_pauses_count],
    [t('informe.filaPausaMax'), (m) => fmtSeg(m.max_pause_duration_ms)],
    [t('informe.filaTrazos'), (m) => m.strokes_count],
    [t('informe.filaPresion'), (m) => m.pressure?.mean],
    [t('informe.filaTemblor'), (m) => m.tremor?.jitter_index],
    [t('informe.filaOcupacion'), (m) => (m.spatial?.occupancy_ratio != null ? `${Math.round(m.spatial.occupancy_ratio * 100)} %` : '—')],
    [t('informe.filaCuadrante'), (m) => (CUADRANTE[m.spatial?.predominant_quadrant] ? t(`informe.${CUADRANTE[m.spatial.predominant_quadrant]}`) : m.spatial?.predominant_quadrant)],
    [t('informe.filaColores'), (m) => {
      const cs = Array.isArray(m.chromatic?.colors_used) ? m.chromatic.colors_used : []
      return cs.length ? <span>{cs.map((c) => <span key={c} title={c} style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: c, marginRight: 4, verticalAlign: -2, border: '1px solid #cbd5e1' }} />)} {cs.length}</span> : m.chromatic?.colors_used
    }],
    [t('informe.filaCambiosColor'), (m) => m.chromatic?.color_switches],
  ]
  const metricas = fases.map(([k]) => dibujo[`${k}Metrics`]).filter(Boolean)
  return (
    <>
      <div className={styles.dos}>
        {fases.map(([k, t]) => (
          <figure key={k} className={styles.figura}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dibujo[k]} alt={t} className={styles.dibujo} />
            <figcaption><strong>{t}</strong>{dibujo.finalChoice === k && <span>{t('informe.elegidoAvatar')}</span>}</figcaption>
          </figure>
        ))}
      </div>
      {metricas.length > 0 ? (
        <table className={styles.tabla}>
          <thead><tr><th>{t('informe.colIndicador')}</th>{fases.filter(([k]) => dibujo[`${k}Metrics`]).map(([k, t]) => <th key={k}>{t}</th>)}</tr></thead>
          <tbody>
            {filas.map(([nombre, f]) => (
              <tr key={nombre}><td>{nombre}</td>{metricas.map((m, i) => <td key={i}>{f(m) ?? '—'}</td>)}</tr>
            ))}
          </tbody>
        </table>
      ) : <Pendiente texto={t('informe.sinMetricasDibujo')} />}
      <Delta dibujo={dibujo} />
      <Alertas alertas={dibujo.alerts} />
    </>
  )
}
