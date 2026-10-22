'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '../informe.module.css'
import { Barras, BarrasH, Kpi, LineaTiempo } from '../Graficas'
import { analizar, fmtDuracion, fmtFecha, fmtSeg, localeDe } from '../analisis'
import { useI18n, useT } from '../../../lib/i18n'
import { cargarCaso } from '../../../lib/casos'
import { downloadJson } from '../../experiments/shared'
import MesaCID from '../../experiments/cid-table/MesaCID'
import { ROUNDS } from '../../experiments/cid-table/config'
import Escenario from '../../experiments/caja-arena/Escenario'
import Clima from '../../experiments/caja-arena/Clima'
import { DOGS, Perro } from '../../experiments/caja-arena/Perros'
import { VIEW } from '../../experiments/caja-arena/config'

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Traduce una clave del espacio informe; si no existe, devuelve el texto original guardado
function useTr() {
  const t = useT()
  return (clave, respaldo, vars) => {
    const k = `informe.${clave}`
    const s = t(k, vars)
    return s === k ? respaldo : s
  }
}
const CRITERIO = { 'ecosistema con más perros': 'criterio_masPerros', 'aleatorio (sin perros en ecosistemas)': 'criterio_aleatorio' }
const CUADRANTE = { 'top-left': 'cuadrante_supIzq', 'top-right': 'cuadrante_supDer', 'bottom-left': 'cuadrante_infIzq', 'bottom-right': 'cuadrante_infDer' }

function Nota({ titulo, children }) {
  const t = useT()
  return (
    <details className={styles.nota}>
      <summary>{titulo ?? t('informe.notaTitulo')}</summary>
      <div>{children}</div>
    </details>
  )
}

// Detalle de una fila del registro de eventos. Antes las filas 'dibujo' salían con la
// celda vacía y los minijuegos no mostraban nada aunque analisis.js ya calcula su duración.
function detalleEvento(e, a, t) {
  if (e.kind === 'decision') return `${e.data.prompt} → ${e.data.option_label} (${fmtSeg(e.data.time_ms)})`
  if (e.kind === 'progreso') return `${e.data.node_id} · ${t('informe.capDetalle', { n: e.data.chapter ?? '—' })}`
  if (e.kind === 'dibujo') {
    const fases = [e.data?.phase1 && '1', e.data?.phase2 && '2'].filter(Boolean)
    const elegido = e.data?.finalChoice === 'phase1' ? '1' : e.data?.finalChoice === 'phase2' ? '2' : null
    return t('informe.dibujoDetalle', {
      fases: fases.length ? fases.join(' + ') : '—',
      elegido: elegido ?? '—',
    })
  }
  if (e.kind.startsWith('minijuego')) {
    const juego = e.data?.game ?? '—'
    const duracion = a?.minijuegos?.[juego]?.duracionMs
    return duracion ? `${juego} · ${fmtDuracion(duracion)}` : juego
  }
  return ''
}

function Seccion({ numero, titulo, sub, children }) {
  return (
    <section className={styles.seccionCard}>
      <header className={styles.seccionHead}>
        <span className={styles.seccionNum}>{numero}</span>
        <div>
          <h2>{titulo}</h2>
          {sub && <p>{sub}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function Pendiente({ texto }) {
  return <p className={styles.pendiente}>{texto}</p>
}

function Mesa({ report }) {
  const t = useT()
  const tr = useTr()
  const persona = (id, nombre) => tr(`persona_${id}`, nombre)
  const colores = Object.fromEntries((report.config?.characters ?? []).map((c) => [c.id, c.color]))
  const nombre = (id) => persona(id, report.rounds[0]?.distances.find((d) => d.characterId === id)?.name ?? id)
  return (
    <>
      <div className={styles.tres}>
        {report.rounds.map((r) => {
          const ronda = ROUNDS.find((x) => x.id === r.roundId)
          const seating = r.distances.map((d) => ({ id: d.characterId, name: d.name, seat: d.seatIndex, color: colores[d.characterId] ?? '#94a3b8' }))
          return (
            <figure key={r.roundId} className={styles.figura}>
              <MesaCID totalSeats={report.config.totalSeats} seating={seating} childSeat={r.childSeat} childAvatar={report.config.childAvatar} theme={ronda?.theme ?? 'daily'} locked onSelect={() => {}} />
              <figcaption>
                <strong>{tr(`ronda_${r.roundId}`, r.title)}</strong>
                <span>{t('informe.mesaRespuesta', { tiempo: fmtSeg(r.reactionTimeMs), sillas: r.seatsConsidered ?? '—' })}</span>
                <span>{t('informe.mesaCercaLejos', { cerca: nombre(r.closestCharacterId), lejos: nombre(r.furthestCharacterId) })}</span>
              </figcaption>
            </figure>
          )
        })}
      </div>
      <h3 className={styles.h3}>{t('informe.mesaDistanciaTitulo')}</h3>
      <BarrasH
        datos={report.summary.characterSummary.map((c) => ({ etiqueta: persona(c.characterId, c.name), valor: c.meanEuclidean, color: colores[c.characterId] }))}
        formato={(v) => Math.round(v)}
      />
      <table className={styles.tabla}>
        <thead><tr><th>{t('informe.colPersona')}</th><th>{t('informe.colDistanciaMedia')}</th><th>{t('informe.colVecesCercana')}</th><th>{t('informe.colVecesLejana')}</th></tr></thead>
        <tbody>
          {report.summary.characterSummary.map((c) => (
            <tr key={c.characterId}><td>{persona(c.characterId, c.name)}</td><td>{Math.round(c.meanEuclidean)}</td><td>{c.closestCount}</td><td>{c.furthestCount}</td></tr>
          ))}
        </tbody>
      </table>
      <h3 className={styles.h3}>{t('informe.mesaTiempoTitulo')}</h3>
      <Barras datos={report.rounds.map((r, i) => ({ etiqueta: t('informe.ronda', { n: i + 1 }), titulo: tr(`ronda_${r.roundId}`, r.title), valor: r.reactionTimeMs / 1000 }))} unidad=" s" formato={(v) => v.toFixed(1)} alto={180} />
    </>
  )
}

function Mundo({ report }) {
  const t = useT()
  const tr = useTr()
  const zona = (z) => tr(`zona_${z}`, z)
  const rasgo = (d) => tr(`rasgo_${d.id}`, d.trait)
  const accion = (a) => tr(`accion_${a}`, a)
  const lista = (xs) => xs.join(', ') || t('informe.ninguno')
  const placed = report.dogs.filter((d) => d.placed)
  const dogsById = Object.fromEntries(DOGS.map((d) => [d.id, d]))
  const nombre = (id) => dogsById[id]?.name ?? id
  const w = report.weather
  return (
    <>
      <figure className={styles.figura}>
        <div className={styles.mundo}>
          <div className={styles.capa}><Escenario /></div>
          {w && <div className={styles.capa}><Clima weather={w} /></div>}
          <div className={styles.capa}>
            <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} preserveAspectRatio="xMidYMid meet">
              {[...placed].sort((a, b) => a.y - b.y).map((d) => (
                <g key={d.id} transform={`translate(${d.x} ${d.y})`}>
                  <Perro dog={dogsById[d.id]} flip={d.facing === 'izquierda'} />
                </g>
              ))}
            </svg>
          </div>
        </div>
        <figcaption>
          <strong>{t('informe.mundoFinal')}</strong>
          <span>{t('informe.mundoResumen', { duracion: fmtDuracion(report.durationMs), colocados: report.summary.dogsPlaced, total: report.dogs.length, acciones: report.summary.totalActions })}</span>
        </figcaption>
      </figure>

      <div className={styles.dos}>
        <div>
          <h3 className={styles.h3}>{t('informe.perrosPorEcosistema')}</h3>
          <BarrasH ancho={360} datos={Object.entries(report.summary.zoneCounts).map(([z, n]) => ({ etiqueta: cap(zona(z)), valor: n, color: z === w?.zone ? '#c2410c' : undefined }))} />
          {w && <p className={styles.leyenda}><span className={styles.swatch} /> {t('informe.ecosistemaAfectado')}</p>}
        </div>
        <div>
          <h3 className={styles.h3}>{t('informe.ordenColocacion')}</h3>
          <ol className={styles.orden}>
            {report.summary.placementOrder.map((id) => {
              const d = report.dogs.find((x) => x.id === id)
              return <li key={id}><strong>{nombre(id)}</strong> {t('informe.ordenItem', { rasgo: rasgo(d), zona: cap(tr(`zona_${d.zone}`, t('informe.retirado'))), tiempo: fmtSeg(d.firstPlacedMs) })}</li>
            })}
          </ol>
          {!!report.dogs.filter((d) => !d.placed).length && (
            <p className={styles.leyenda}>{t('informe.noColocados', { lista: report.dogs.filter((d) => !d.placed).map((d) => `${d.name} (${rasgo(d)})`).join(', ') })}</p>
          )}
        </div>
      </div>

      {w && (
        <div className={styles.evento}>
          <h3 className={styles.h3}>{t('informe.eventoMeteo')}</h3>
          <dl className={styles.dl}>
            <dt>{t('informe.dtEvento')}</dt><dd>{cap(tr(`eventoEn_${w.zone}`, `${w.type} · ${w.zone}`, { evento: tr(`clima_${w.type}`, w.type) }))}</dd>
            <dt>{t('informe.dtMomento')}</dt><dd>{t('informe.ddMomento', { tiempo: fmtSeg(w.atMs), criterio: CRITERIO[w.selectionRule] ? t(`informe.${CRITERIO[w.selectionRule]}`) : w.selectionRule })}</dd>
            <dt>{t('informe.dtPerrosInicio')}</dt><dd>{lista((w.dogsInZoneAtStart ?? []).map(nombre))}</dd>
            <dt>{t('informe.dtPrimeraAccion')}</dt><dd>{w.reactionLatencyMs != null ? t('informe.ddDespues', { tiempo: fmtSeg(w.reactionLatencyMs) }) : t('informe.sinAccionesPosteriores')}</dd>
            <dt>{t('informe.dtAccionesPosteriores')}</dt><dd>{report.summary.actionsAfterWeather}</dd>
            <dt>{t('informe.dtSacados')}</dt><dd>{lista(report.summary.dogsLeftWeatherZone.map(nombre))}</dd>
            <dt>{t('informe.dtLlevados')}</dt><dd>{lista(report.summary.dogsEnteredWeatherZone.map(nombre))}</dd>
            <dt>{t('informe.dtAlTerminar')}</dt><dd>{lista(report.summary.dogsInWeatherZoneAtEnd.map(nombre))}</dd>
          </dl>
        </div>
      )}

      <h3 className={styles.h3}>{t('informe.secuenciaAcciones')}</h3>
      <LineaTiempo
        duracion={report.durationMs}
        marcas={report.events.filter((e) => e.action !== 'soltar_fuera').map((e) => ({ t: e.t, tipo: e.action, etiqueta: `${nombre(e.dogId)}: ${accion(e.action)}` }))}
        eventos={w ? [{ t: w.atMs, etiqueta: tr(`climaCorto_${w.type}`, cap(w.type)) }] : []}
      />

      <table className={styles.tabla}>
        <thead><tr><th>{t('informe.colPerro')}</th><th>{t('informe.colEcosistemaFinal')}</th><th>{t('informe.colMovimientos')}</th><th>{t('informe.colGiros')}</th><th>{t('informe.colPerroCercano')}</th><th>{t('informe.colDistCentro')}</th></tr></thead>
        <tbody>
          {report.dogs.map((d) => (
            <tr key={d.id}>
              <td>{d.name} <small>({rasgo(d)})</small></td>
              <td>{d.placed ? cap(zona(d.zone)) : t('informe.noColocado')}</td>
              <td>{d.moves}</td>
              <td>{d.turns}</td>
              <td>{d.nearestDogId ? `${nombre(d.nearestDogId)} (${Math.round(d.nearestDogDistance)})` : '—'}</td>
              <td>{d.distanceToCenter != null ? Math.round(d.distanceToCenter) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.leyenda}>{t('informe.distanciaMediaPerros', { valor: report.summary.meanPairDistance ?? '—' })}</p>

      {report.story && (
        <blockquote className={styles.cita}>
          <span>{t('informe.relatoMenor')}</span>
          “{report.story}”
        </blockquote>
      )}
    </>
  )
}

// Δ entre la fase 1 y la fase 2 tal como lo calculó el motor (avatarStore.#computeDelta).
// El dato ya llegaba al informe dentro del snapshot 'dibujo' y se descartaba: aquí solo
// se muestra, sin recalcular nada, para que lo que se ve y lo que se guarda sea lo mismo.
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

function Dibujo({ dibujo }) {
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

export default function InformeCaso({ params }) {
  const { t, lang } = useI18n()
  const tr = useTr()
  const locale = localeDe(lang)
  const id = decodeURIComponent(params.caso)
  const [caso, setCaso] = useState(null)
  const [actualizado, setActualizado] = useState(null)

  useEffect(() => {
    let vivo = true
    const cargar = () => cargarCaso(id).then((c) => {
      if (!vivo) return
      setCaso(c)
      setActualizado(new Date())
    })
    cargar()
    const intervalo = setInterval(cargar, 5000)
    return () => {
      vivo = false
      clearInterval(intervalo)
    }
  }, [id])

  const a = useMemo(() => analizar(caso), [caso])
  const meta = caso?.meta ?? {}
  const cid = a.minijuegos['cid-table']?.report
  const arena = a.minijuegos['caja-arena']?.report
  const enCurso = a.ultimo && Date.now() - a.ultimo < 90000 && !a.terminado

  if (!caso) return <div className={styles.page}><p className={styles.cargando}>{t('informe.cargandoInforme')}</p></div>

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Link href="/informe" className={styles.btnTopBack}>{t('informe.volverCasos')}</Link>
        <span className={styles.vivoBadge}>{enCurso ? t('informe.sesionEnCurso') : ''}{t('informe.actualizado', { hora: actualizado?.toLocaleTimeString(locale) ?? '' })}</span>
        <div className={styles.topActions}>
          <button type="button" className={styles.btnTopExport} onClick={() => downloadJson({ caso, analisis: { ...a, eventos: undefined } }, `informe-${id}`)}>{t('informe.exportarJson')}</button>
          {/* Eventos crudos: es el formato con el que se puede analizar fuera de la app
              (incluye las imágenes del dibujo y los reports de los minijuegos). */}
          <button type="button" className={styles.btnTopExport} onClick={() => downloadJson({ id, meta, eventos: caso.eventos ?? [] }, `eventos-${id}`)}>{t('informe.exportarEventos')}</button>
          <button type="button" className={styles.btnTop} onClick={() => window.print()}>{t('informe.imprimir')}</button>
        </div>
      </div>

      <article className={styles.mainContainer}>
        <header className={styles.headerCard}>
          <div>
            <span className={styles.kicker}>{t('informe.kickerCaso')}</span>
            <h1>{t('informe.tituloCaso', { id })}</h1>
            <p className={styles.subtitulo}>{meta.nombreJoven ?? t('informe.sinIdentificar')}{meta.tipoRiesgo ? ` · ${meta.tipoRiesgo}` : ''}</p>
          </div>
          <dl className={styles.fichaGrid}>
            <dt>{t('informe.dtInicio')}</dt><dd>{fmtFecha(a.inicio, lang)}</dd>
            <dt>{t('informe.dtUltima')}</dt><dd>{fmtFecha(a.ultimo, lang)}</dd>
            <dt>{t('informe.dtEstado')}</dt><dd>{t(a.terminado ? 'informe.estadoCompletada' : enCurso ? 'informe.estadoEnCurso' : a.inicio ? 'informe.estadoIncompleta' : 'informe.estadoSinActividad')}</dd>
            <dt>{t('informe.dtOrigen')}</dt><dd>{t(caso.fuente === 'servidor' ? 'informe.origenServidor' : 'informe.origenNavegador')}</dd>
          </dl>
        </header>

        <div className={styles.avisoCard}>
          <strong>{t('informe.avisoTitulo')}</strong> {t('informe.avisoTexto')}
        </div>
        {meta.contexto && <p className={styles.contextoCard}><strong>{t('informe.contextoProfesional')}</strong> {meta.contexto}</p>}

        <div className={styles.kpisSection}>
          <Kpi etiqueta={t('informe.kpiDuracion')} valor={fmtDuracion(a.duracionMs)} nota={a.sesiones > 1 ? t('informe.kpiAccesos', { n: a.sesiones }) : undefined} />
          <Kpi etiqueta={t('informe.kpiDecisiones')} valor={a.decisiones.length} />
          <Kpi etiqueta={t('informe.kpiMediana')} valor={fmtSeg(a.latencia.mediana)} nota={a.latencia.mediana ? t('informe.kpiRango', { min: fmtSeg(a.latencia.min), max: fmtSeg(a.latencia.max) }) : undefined} />
          <Kpi etiqueta={t('informe.kpiPantallas')} valor={a.pantallasVistas} nota={t('informe.kpiPantallasNota', { relecturas: a.relecturas, pausas: a.pausasLargas })} />
          <Kpi etiqueta={t('informe.kpiActividades')} valor={`${Object.keys(a.minijuegos).length + (a.dibujo?.phase1 ? 1 : 0)} / 3`} nota={t('informe.kpiActividadesNota')} />
        </div>

        <Seccion numero="1" titulo={t('informe.s1Titulo')} sub={t('informe.s1Sub')}>
          {a.decisiones.length ? (
            <>
              <Barras
                datos={a.decisiones.map((d, i) => ({ etiqueta: `D${i + 1}`, titulo: d.prompt, valor: d.time_ms / 1000, destacado: d.destacada }))}
                unidad=" s"
                formato={(v) => v.toFixed(1)}
                referencia={{ valor: a.latencia.mediana / 1000, etiqueta: t('informe.medianaMenor', { tiempo: fmtSeg(a.latencia.mediana) }) }}
              />
              <p className={styles.leyenda}><span className={styles.swatch} /> {t('informe.leyendaDestacado')}</p>
              <table className={styles.tabla}>
                <thead><tr><th>#</th><th>{t('informe.colCap')}</th><th>{t('informe.colSituacionPlanteada')}</th><th>{t('informe.colOpcion')}</th><th>{t('informe.colAlternativas')}</th><th>{t('informe.colTiempo')}</th></tr></thead>
                <tbody>
                  {a.decisiones.map((d, i) => (
                    <tr key={i} className={d.destacada ? styles.filaDestacada : undefined}>
                      <td>D{i + 1}</td>
                      <td>{d.chapter}</td>
                      <td>{d.prompt}</td>
                      <td><strong>{d.option_label}</strong></td>
                      <td className={styles.alt}>{(d.all_options ?? []).filter((o) => o.id !== d.option_id).map((o) => o.label).join(' · ')}</td>
                      <td>{fmtSeg(d.time_ms)}{d.relativa ? <small> ({d.relativa.toFixed(1)}×)</small> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : <Pendiente texto={t('informe.sinDecisiones')} />}
          <Nota>
            <p><strong>{t('informe.s1Nota1Titulo')}</strong> {t('informe.s1Nota1')}</p>
            <p><strong>{t('informe.s1Nota2Titulo')}</strong> {t('informe.s1Nota2')}</p>
          </Nota>
        </Seccion>

        <Seccion numero="2" titulo={t('informe.s2Titulo')} sub={t('informe.s2Sub')}>
          {a.capitulos.length ? (
            <>
              {(() => {
                const enMin = Math.max(...a.capitulos.map((c) => c.lecturaMs)) >= 120000
                return <Barras datos={a.capitulos.map((c) => ({ etiqueta: t('informe.capCorto', { n: c.capitulo }), valor: c.lecturaMs / (enMin ? 60000 : 1000) }))} unidad={enMin ? ' min' : ' s'} formato={(v) => (enMin ? v.toFixed(1) : Math.round(v))} alto={190} />
              })()}
              <table className={styles.tabla}>
                <thead><tr><th>{t('informe.colCapitulo')}</th><th>{t('informe.colPantallas')}</th><th>{t('informe.colTiempoLectura')}</th><th>{t('informe.colSegPantalla')}</th><th>{t('informe.colRelecturas')}</th><th>{t('informe.colDecisiones')}</th></tr></thead>
                <tbody>
                  {a.capitulos.map((c) => (
                    <tr key={c.capitulo}><td>{c.capitulo}</td><td>{c.pantallas}</td><td>{fmtDuracion(c.lecturaMs)}</td><td>{fmtSeg(c.lecturaMs / Math.max(c.pantallas, 1))}</td><td>{c.relecturas}</td><td>{c.decisiones}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : <Pendiente texto={t('informe.sinLectura')} />}
          <Nota>
            <p>{t('informe.s2Nota')}</p>
          </Nota>
        </Seccion>

        <Seccion numero="3" titulo={t('informe.s3Titulo')} sub={t('informe.s3Sub')}>
          {cid ? (
            <>
              <Mesa report={cid} />
              <p className={styles.leyenda}>
                {t('informe.duracionActividad', { duracion: fmtDuracion(a.minijuegos['cid-table']?.duracionMs) })}
              </p>
            </>
          ) : <Pendiente texto={t('informe.sinMinijuego')} />}
          <Nota>
            <p>{t('informe.s3Nota')}</p>
          </Nota>
        </Seccion>

        <Seccion numero="4" titulo={t('informe.s4Titulo')} sub={t('informe.s4Sub')}>
          {arena ? (
            <>
              <Mundo report={arena} />
              <p className={styles.leyenda}>
                {t('informe.duracionActividad', { duracion: fmtDuracion(a.minijuegos['caja-arena']?.duracionMs) })}
              </p>
            </>
          ) : <Pendiente texto={t('informe.sinMinijuego')} />}
          <Nota>
            <p>{t('informe.s4Nota')}</p>
          </Nota>
        </Seccion>

        <Seccion numero="5" titulo={t('informe.s5Titulo')} sub={t('informe.s5Sub')}>
          {a.dibujo?.phase1 ? <Dibujo dibujo={a.dibujo} /> : <Pendiente texto={t('informe.sinDibujos')} />}
          <Nota>
            <p>{t('informe.s5Nota')}</p>
          </Nota>
        </Seccion>

        <Seccion numero="6" titulo={t('informe.s6Titulo')}>
          <ul className={styles.normas}>
            <li><strong>{t('informe.norma1Nombre')}</strong>{t('informe.norma1Texto')}</li>
            <li><strong>{t('informe.norma2Nombre')}</strong>{t('informe.norma2Texto')}</li>
            <li><strong>{t('informe.norma3Nombre')}</strong>{t('informe.norma3Texto')}</li>
            <li><strong>{t('informe.norma4aNombre')}</strong>{t('informe.norma4Medio')}<strong>{t('informe.norma4bNombre')}</strong>{t('informe.norma4Texto')}</li>
          </ul>
          <p className={styles.leyenda}>{t('informe.s6Leyenda')}</p>
        </Seccion>

        <details className={styles.registro}>
          <summary>{t('informe.registro', { n: a.eventos.length })}</summary>
          <table className={styles.tabla}>
            <thead><tr><th>{t('informe.colHora')}</th><th>{t('informe.colTipo')}</th><th>{t('informe.colDetalle')}</th></tr></thead>
            <tbody>
              {a.eventos.map((e, i) => (
                <tr key={i}>
                  <td>{new Date(e.t).toLocaleTimeString(locale)}</td>
                  <td>{tr(`tipo_${e.kind}`, e.kind)}</td>
                  <td className={styles.alt}>{detalleEvento(e, a, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <footer className={styles.pie}>{t('informe.pie', { fecha: new Date().toLocaleDateString(locale, { dateStyle: 'long' }) })}</footer>
      </article>
    </div>
  )
}

