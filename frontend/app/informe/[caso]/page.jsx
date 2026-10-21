'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '../informe.module.css'
import { Barras, BarrasH, Kpi, LineaTiempo } from '../Graficas'
import { analizar, fmtDuracion, fmtFecha, fmtSeg } from '../analisis'
import { cargarCaso } from '../../../lib/casos'
import { downloadJson } from '../../experiments/shared'
import MesaCID from '../../experiments/cid-table/MesaCID'
import { ROUNDS } from '../../experiments/cid-table/config'
import Escenario from '../../experiments/caja-arena/Escenario'
import Clima from '../../experiments/caja-arena/Clima'
import { DOGS, Perro } from '../../experiments/caja-arena/Perros'
import { VIEW, ZONES, WEATHER_LABEL } from '../../experiments/caja-arena/config'

const ZONA = Object.fromEntries([...ZONES.map((z) => [z.id, z.name.replace(/^(el|la|las|los) /, '')]), ['arena', 'arena libre']])
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

function Nota({ titulo = 'Qué se mide y por qué', children }) {
  return (
    <details className={styles.nota}>
      <summary>{titulo}</summary>
      <div>{children}</div>
    </details>
  )
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
  const colores = Object.fromEntries((report.config?.characters ?? []).map((c) => [c.id, c.color]))
  const nombre = (id) => report.rounds[0]?.distances.find((d) => d.characterId === id)?.name ?? id
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
                <strong>{r.title}</strong>
                <span>Respuesta en {fmtSeg(r.reactionTimeMs)} · sillas exploradas: {r.seatsConsidered ?? '—'}</span>
                <span>Más cerca: {nombre(r.closestCharacterId)} · Más lejos: {nombre(r.furthestCharacterId)}</span>
              </figcaption>
            </figure>
          )
        })}
      </div>
      <h3 className={styles.h3}>Distancia media a cada persona (unidades del lienzo, menor = más cerca)</h3>
      <BarrasH
        datos={report.summary.characterSummary.map((c) => ({ etiqueta: c.name, valor: c.meanEuclidean, color: colores[c.characterId] }))}
        formato={(v) => Math.round(v)}
      />
      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead><tr><th>Persona</th><th>Distancia media</th><th>Veces la más cercana</th><th>Veces la más lejana</th></tr></thead>
          <tbody>
            {report.summary.characterSummary.map((c) => (
              <tr key={c.characterId}><td><strong>{c.name}</strong></td><td>{Math.round(c.meanEuclidean)}</td><td>{c.closestCount}</td><td>{c.furthestCount}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className={styles.h3}>Tiempo de elección por ronda</h3>
      <Barras datos={report.rounds.map((r, i) => ({ etiqueta: `Ronda ${i + 1}`, titulo: r.title, valor: r.reactionTimeMs / 1000 }))} unidad=" s" formato={(v) => v.toFixed(1)} alto={180} />
    </>
  )
}

function Mundo({ report }) {
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
          <strong>Mundo final creado por el menor</strong>
          <span>Duración {fmtDuracion(report.durationMs)} · {report.summary.dogsPlaced} de {report.dogs.length} perros colocados · {report.summary.totalActions} acciones</span>
        </figcaption>
      </figure>

      <div className={styles.dos}>
        <div>
          <h3 className={styles.h3}>Perros por ecosistema</h3>
          <BarrasH ancho={360} datos={Object.entries(report.summary.zoneCounts).map(([z, n]) => ({ etiqueta: cap(ZONA[z] ?? z), valor: n, color: z === w?.zone ? '#dc2626' : undefined }))} />
          {w && <p className={styles.leyenda}><span className={styles.swatch} /> Ecosistema afectado por el evento meteorológico</p>}
        </div>
        <div>
          <h3 className={styles.h3}>Orden de colocación</h3>
          <ol className={styles.orden}>
            {report.summary.placementOrder.map((id) => {
              const d = report.dogs.find((x) => x.id === id)
              return <li key={id}><strong>{nombre(id)}</strong> ({d.trait}) → {cap(ZONA[d.zone] ?? 'retirado')} · a los {fmtSeg(d.firstPlacedMs)}</li>
            })}
          </ol>
          {!!report.dogs.filter((d) => !d.placed).length && (
            <p className={styles.leyenda}>No colocados: {report.dogs.filter((d) => !d.placed).map((d) => `${d.name} (${d.trait})`).join(', ')}</p>
          )}
        </div>
      </div>

      {w && (
        <div className={styles.evento}>
          <h3 className={styles.h3}>Evento meteorológico</h3>
          <dl className={styles.dl}>
            <dt>Evento</dt><dd>{cap(WEATHER_LABEL[w.type] ?? w.type)} en {ZONA[w.zone]}</dd>
            <dt>Momento</dt><dd>a los {fmtSeg(w.atMs)} de juego · criterio: {w.selectionRule}</dd>
            <dt>Perros en la zona al empezar</dt><dd>{w.dogsInZoneAtStart?.length ? w.dogsInZoneAtStart.map(nombre).join(', ') : 'ninguno'}</dd>
            <dt>Primera acción tras el evento</dt><dd>{w.reactionLatencyMs != null ? `${fmtSeg(w.reactionLatencyMs)} después` : 'sin acciones posteriores'}</dd>
            <dt>Acciones posteriores</dt><dd>{report.summary.actionsAfterWeather}</dd>
            <dt>Sacados de la zona</dt><dd>{report.summary.dogsLeftWeatherZone.map(nombre).join(', ') || 'ninguno'}</dd>
            <dt>Llevados a la zona</dt><dd>{report.summary.dogsEnteredWeatherZone.map(nombre).join(', ') || 'ninguno'}</dd>
            <dt>En la zona al terminar</dt><dd>{report.summary.dogsInWeatherZoneAtEnd.map(nombre).join(', ') || 'ninguno'}</dd>
          </dl>
        </div>
      )}

      <h3 className={styles.h3}>Secuencia de acciones</h3>
      <LineaTiempo
        duracion={report.durationMs}
        marcas={report.events.filter((e) => e.action !== 'soltar_fuera').map((e) => ({ t: e.t, tipo: e.action, etiqueta: `${nombre(e.dogId)}: ${e.action}` }))}
        eventos={w ? [{ t: w.atMs, etiqueta: cap(w.type) }] : []}
      />

      <div className={styles.tablaWrap}>
        <table className={styles.tabla}>
          <thead><tr><th>Perro</th><th>Ecosistema final</th><th>Movimientos</th><th>Giros</th><th>Perro más cercano</th><th>Dist. al centro</th></tr></thead>
          <tbody>
            {report.dogs.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong> <small>({d.trait})</small></td>
                <td>{d.placed ? cap(ZONA[d.zone] ?? d.zone) : 'no colocado'}</td>
                <td>{d.moves}</td>
                <td>{d.turns}</td>
                <td>{d.nearestDogId ? `${nombre(d.nearestDogId)} (${Math.round(d.nearestDogDistance)})` : '—'}</td>
                <td>{d.distanceToCenter != null ? Math.round(d.distanceToCenter) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.leyenda}>Distancia media entre perros: {report.summary.meanPairDistance ?? '—'} (unidades del lienzo 1600×900).</p>

      {report.story && (
        <blockquote className={styles.cita}>
          <span>Relato del menor sobre su mundo (literal)</span>
          “{report.story}”
        </blockquote>
      )}
    </>
  )
}

function Dibujo({ dibujo }) {
  const fases = [['phase1', 'Primer dibujo'], ['phase2', 'Segundo dibujo']].filter(([k]) => dibujo[k])
  const filas = [
    ['Tiempo hasta el primer trazo', (m) => fmtSeg(m.initial_latency_ms)],
    ['Duración total', (m) => fmtDuracion(m.duration_total_ms)],
    ['Tiempo dibujando activamente', (m) => fmtDuracion(m.active_drawing_time_ms)],
    ['Pausas de vacilación', (m) => m.hesitation_pauses_count],
    ['Pausa más larga', (m) => fmtSeg(m.max_pause_duration_ms)],
    ['Número de trazos', (m) => m.strokes_count],
    ['Presión media', (m) => m.pressure?.mean],
    ['Índice de temblor (jitter)', (m) => m.tremor?.jitter_index],
    ['Ocupación del lienzo', (m) => (m.spatial?.occupancy_ratio != null ? `${Math.round(m.spatial.occupancy_ratio * 100)} %` : '—')],
    ['Cuadrante predominante', (m) => ({ 'top-left': 'superior izquierdo', 'top-right': 'superior derecho', 'bottom-left': 'inferior izquierdo', 'bottom-right': 'inferior derecho' })[m.spatial?.predominant_quadrant] ?? m.spatial?.predominant_quadrant],
    ['Colores usados', (m) => {
      const cs = Array.isArray(m.chromatic?.colors_used) ? m.chromatic.colors_used : []
      return cs.length ? <span>{cs.map((c) => <span key={c} title={c} style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: c, marginRight: 4, verticalAlign: -2, border: '1px solid #cbd5e1' }} />)} {cs.length}</span> : m.chromatic?.colors_used
    }],
    ['Cambios de color', (m) => m.chromatic?.color_switches],
  ]
  const metricas = fases.map(([k]) => dibujo[`${k}Metrics`]).filter(Boolean)
  return (
    <>
      <div className={styles.dos}>
        {fases.map(([k, t]) => (
          <figure key={k} className={styles.figura}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dibujo[k]} alt={t} className={styles.dibujo} />
            <figcaption><strong>{t}</strong>{dibujo.finalChoice === k && <span>Elegido por el menor como su avatar</span>}</figcaption>
          </figure>
        ))}
      </div>
      {metricas.length > 0 ? (
        <div className={styles.tablaWrap}>
          <table className={styles.tabla}>
            <thead><tr><th>Indicador grafomotor</th>{fases.filter(([k]) => dibujo[`${k}Metrics`]).map(([k, t]) => <th key={k}>{t}</th>)}</tr></thead>
            <tbody>
              {filas.map(([nombre, f]) => (
                <tr key={nombre}><td><strong>{nombre}</strong></td>{metricas.map((m, i) => <td key={i}>{f(m) ?? '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Pendiente texto="El módulo de dibujo no ha registrado métricas grafomotoras en esta sesión." />}
    </>
  )
}

export default function InformeCaso({ params }) {
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
    const t = setInterval(cargar, 5000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [id])

  const a = useMemo(() => analizar(caso), [caso])
  const meta = caso?.meta ?? {}
  const cid = a.minijuegos['cid-table']?.report
  const arena = a.minijuegos['caja-arena']?.report
  const enCurso = a.ultimo && Date.now() - a.ultimo < 90000 && !a.terminado

  if (!caso) {
    return (
      <div className={styles.page}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className={styles.brandTitles}>
              <div className={styles.brandBadgeRow}>
                <span className={styles.badge}>Servicios Sociales</span>
                <span className={styles.brandSub}>Chavales Legales</span>
              </div>
              <h1 className={styles.brandTitle}>Informe de caso {id}</h1>
            </div>
          </div>
        </header>
        <p className={styles.cargando}>Cargando informe…</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Barra superior estilo Asistentes Sociales */}
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className={styles.brandTitles}>
            <div className={styles.brandBadgeRow}>
              <span className={styles.badge}>Servicios Sociales</span>
              <span className={styles.brandSub}>Chavales Legales</span>
            </div>
            <h1 className={styles.brandTitle}>Informe de caso · {id}</h1>
          </div>
        </div>

        <div className={styles.topActions}>
          <span className={styles.vivoBadge}>
            <span className={styles.vivoDot}>●</span>
            {enCurso ? 'En curso · ' : ''}Actualizado {actualizado?.toLocaleTimeString('es-ES')}
          </span>

          <button
            type="button"
            className={styles.btnTopExport}
            onClick={() => downloadJson({ caso, analisis: { ...a, eventos: undefined } }, `informe-${id}`)}
            title="Exportar datos completos en formato JSON"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Exportar JSON</span>
          </button>

          <button type="button" className={styles.btnTop} onClick={() => window.print()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Imprimir / PDF</span>
          </button>

          <Link href="/informe" className={styles.btnTopBack}>
            ← Casos
          </Link>
        </div>
      </header>

      {/* Contenedor principal con estética Asistentes Sociales */}
      <main className={styles.mainContainer}>
        {/* Tarjeta encabezado del caso */}
        <section className={styles.headerCard}>
          <div className={styles.headerLeft}>
            <span className={styles.kicker}>Informe descriptivo pericial</span>
            <h1>Caso {id}</h1>
            <p className={styles.subtitulo}>
              {meta.nombreJoven ?? 'Participante sin identificar'}
              {meta.tipoRiesgo ? ` · Situación: ${meta.tipoRiesgo}` : ''}
            </p>
          </div>

          <dl className={styles.fichaGrid}>
            <div className={styles.fichaItem}>
              <dt>Inicio</dt>
              <dd>{fmtFecha(a.inicio)}</dd>
            </div>
            <div className={styles.fichaItem}>
              <dt>Última actividad</dt>
              <dd>{fmtFecha(a.ultimo)}</dd>
            </div>
            <div className={styles.fichaItem}>
              <dt>Estado de la sesión</dt>
              <dd>{a.terminado ? 'Historia completada' : enCurso ? 'En curso' : a.inicio ? 'Incompleta' : 'Sin actividad'}</dd>
            </div>
            <div className={styles.fichaItem}>
              <dt>Origen de datos</dt>
              <dd>{caso.fuente === 'servidor' ? 'Servidor de la plataforma' : 'Este navegador'}</dd>
            </div>
          </dl>
        </section>

        {/* Aviso de confidencialidad y metodología */}
        <div className={styles.avisoCard}>
          <strong>Documento descriptivo de apoyo técnico, sin valoración automatizada:</strong> Este informe recoge
          datos objetivos de la interacción del menor con la plataforma (tiempos de reacción, elecciones tomadas y
          producciones gráficas y espaciales). No constituye diagnóstico clínico, evaluación pericial cerrada ni veredicto.
          Su análisis e interpretación corresponden exclusivamente a profesionales de servicios sociales y psicología en el
          marco de la intervención global.
        </div>

        {meta.contexto && (
          <p className={styles.contextoCard}>
            <strong>Contexto aportado por el profesional:</strong> {meta.contexto}
          </p>
        )}

        {/* Tarjetas de métricas generales (KPIs estilo /asistentes-sociales) */}
        <section className={styles.kpisSection} aria-label="Métricas clave de la sesión">
          <Kpi
            etiqueta="Duración de sesión"
            valor={fmtDuracion(a.duracionMs)}
            nota={a.sesiones > 1 ? `${a.sesiones} accesos registrados` : 'Sesión única continuada'}
            icon="⏱️"
          />
          <Kpi
            etiqueta="Decisiones tomadas"
            valor={a.decisiones.length}
            nota="Opciones valoradas en la historia"
            icon="🧒"
          />
          <Kpi
            etiqueta="Mediana de decisión"
            valor={fmtSeg(a.latencia.mediana)}
            nota={a.latencia.mediana ? `Rango: ${fmtSeg(a.latencia.min)} – ${fmtSeg(a.latencia.max)}` : 'Sin latencias registradas'}
            icon="⚡"
          />
          <Kpi
            etiqueta="Pantallas leídas"
            valor={a.pantallasVistas}
            nota={`${a.relecturas} relecturas · ${a.pausasLargas} pausas > 1 min`}
            icon="📖"
          />
          <Kpi
            etiqueta="Actividades completadas"
            valor={`${Object.keys(a.minijuegos).length + (a.dibujo?.phase1 ? 1 : 0)} / 3`}
            nota="Dibujo avatar, mesa CID y mundo de arena"
            icon="🎨"
          />
        </section>

        {/* Sección 1: Decisiones */}
        <Seccion numero="1" titulo="Decisiones en la historia" sub="Elección realizada en cada momento de decisión y tiempo empleado.">
          {a.decisiones.length ? (
            <>
              <Barras
                datos={a.decisiones.map((d, i) => ({ etiqueta: `D${i + 1}`, titulo: d.prompt, valor: d.time_ms / 1000, destacado: d.destacada }))}
                unidad=" s"
                formato={(v) => v.toFixed(1)}
                referencia={{ valor: a.latencia.mediana / 1000, etiqueta: `Mediana del menor: ${fmtSeg(a.latencia.mediana)}` }}
              />
              <p className={styles.leyenda}><span className={styles.swatch} /> Tiempo superior a 1,75 veces la mediana del propio menor (dato a contrastar, no indicador clínico).</p>
              <div className={styles.tablaWrap}>
                <table className={styles.tabla}>
                  <thead><tr><th>#</th><th>Cap.</th><th>Situación planteada</th><th>Opción elegida</th><th>Alternativas</th><th>Tiempo</th></tr></thead>
                  <tbody>
                    {a.decisiones.map((d, i) => (
                      <tr key={i} className={d.destacada ? styles.filaDestacada : undefined}>
                        <td><strong>D{i + 1}</strong></td>
                        <td>{d.chapter}</td>
                        <td>{d.prompt}</td>
                        <td><strong>{d.option_label}</strong></td>
                        <td className={styles.alt}>{(d.all_options ?? []).filter((o) => o.id !== d.option_id).map((o) => o.label).join(' · ')}</td>
                        <td><strong>{fmtSeg(d.time_ms)}</strong>{d.relativa ? <small> ({d.relativa.toFixed(1)}×)</small> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <Pendiente texto="Todavía no hay decisiones registradas." />}
          <Nota>
            <p><strong>Latencia de decisión:</strong> tiempo entre la aparición de las opciones y la elección. La cronometría mental relaciona la latencia con el grado de deliberación, el conflicto entre alternativas y la carga emocional del contenido. Por eso se compara cada decisión con la mediana del propio menor: un tiempo destacado señala un tema que puede merecer conversación, nunca una conclusión.</p>
            <p><strong>Elección:</strong> se registran literalmente la opción tomada y las descartadas para poder comentarlas con el menor. Las elecciones dentro de una ficción no equivalen a conductas reales.</p>
          </Nota>
        </Seccion>

        {/* Sección 2: Ritmo de lectura */}
        <Seccion numero="2" titulo="Ritmo de lectura" sub="Tiempo de lectura acumulado por capítulo, relecturas (retrocesos) y pausas.">
          {a.capitulos.length ? (
            <>
              {(() => {
                const enMin = Math.max(...a.capitulos.map((c) => c.lecturaMs)) >= 120000
                return <Barras datos={a.capitulos.map((c) => ({ etiqueta: `Cap. ${c.capitulo}`, valor: c.lecturaMs / (enMin ? 60000 : 1000) }))} unidad={enMin ? ' min' : ' s'} formato={(v) => (enMin ? v.toFixed(1) : Math.round(v))} alto={190} />
              })()}
              <div className={styles.tablaWrap}>
                <table className={styles.tabla}>
                  <thead><tr><th>Capítulo</th><th>Pantallas</th><th>Tiempo de lectura</th><th>Seg. por pantalla</th><th>Relecturas</th><th>Decisiones</th></tr></thead>
                  <tbody>
                    {a.capitulos.map((c) => (
                      <tr key={c.capitulo}><td><strong>Capítulo {c.capitulo}</strong></td><td>{c.pantallas}</td><td>{fmtDuracion(c.lecturaMs)}</td><td>{fmtSeg(c.lecturaMs / Math.max(c.pantallas, 1))}</td><td>{c.relecturas}</td><td>{c.decisiones}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <Pendiente texto="Todavía no hay progreso de lectura registrado." />}
          <Nota>
            <p>El tiempo por pantalla aproxima la atención sostenida y el ritmo de comprensión lectora; las relecturas (volver atrás) pueden reflejar interés, dudas de comprensión o necesidad de revisar un pasaje. Cada pantalla se limita a 2 minutos para no contar ausencias; las pausas de más de un minuto se cuentan aparte porque suelen deberse a interrupciones del entorno. El tiempo dentro de los minijuegos no se incluye aquí.</p>
          </Nota>
        </Seccion>

        {/* Sección 3: La mesa de la familia */}
        <Seccion numero="3" titulo="La mesa de la familia" sub="Adaptación de la Comfortable Interpersonal Distance Scale (Duke y Nowicki, 1972). El menor elige dónde sentarse en tres situaciones.">
          {cid ? <Mesa report={cid} /> : <Pendiente texto="El menor aún no ha llegado a este minijuego." />}
          <Nota>
            <p>La proxémica (Hall, 1966) estudia la distancia que las personas mantienen con otras según la relación y la situación. La escala CID usa la distancia elegida respecto a figuras representadas como medida de distancia interpersonal preferida. Aquí se registra la silla elegida en cada ronda, la distancia euclídea y angular a cada persona, el tiempo de elección y las sillas exploradas antes de decidir. Influyen también factores ajenos a la relación (preferencia por un lado de la mesa, sillas libres disponibles), por lo que los datos deben comentarse con el menor.</p>
          </Nota>
        </Seccion>

        {/* Sección 4: Mi mundo con perros */}
        <Seccion numero="4" titulo="Mi mundo con perros" sub="Adaptación digital de la Técnica del Mundo (Margaret Lowenfeld) con un evento meteorológico inesperado.">
          {arena ? <Mundo report={arena} /> : <Pendiente texto="El menor aún no ha llegado a este minijuego." />}
          <Nota>
            <p>En la Técnica del Mundo el menor construye libremente una escena en una bandeja de arena; se observa la organización del espacio, qué elementos se agrupan o aíslan y el orden de construcción. Los perros tienen rasgos distintos (pequeño, gracioso, tímido, grande…) para facilitar la proyección. El evento meteorológico funciona como perturbación inesperada: se registra si hay acciones posteriores, cuánto tardan y qué perros se trasladan hacia o desde la zona afectada. El relato final es literal y opcional.</p>
          </Nota>
        </Seccion>

        {/* Sección 5: Dibujo del avatar */}
        <Seccion numero="5" titulo="Dibujo del avatar" sub="Producciones gráficas realizadas al inicio de la historia e indicadores grafomotores.">
          {a.dibujo?.phase1 ? <Dibujo dibujo={a.dibujo} /> : <Pendiente texto="No hay dibujos registrados en esta sesión." />}
          <Nota>
            <p>El dibujo infantil se utiliza en la práctica profesional como medio de expresión y apoyo a la entrevista (Koppitz, Machover). Los indicadores grafomotores (latencia, pausas, presión, temblor, ocupación del espacio, uso del color) describen cómo se realizó el dibujo. Dependen del dispositivo (ratón, dedo, lápiz) y de la edad, y no tienen valor diagnóstico por sí solos.</p>
          </Nota>
        </Seccion>

        {/* Sección 6: Marco normativo */}
        <Seccion numero="6" titulo="Marco normativo y uso de los datos" sub="Garantías legales e interés superior del menor.">
          <ul className={styles.normas}>
            <li><strong>Convención sobre los Derechos del Niño (ONU, 1989)</strong>, art. 3 (interés superior del menor) y art. 12 (derecho a expresar su opinión y a ser escuchado).</li>
            <li><strong>Ley Orgánica 1/1996, de Protección Jurídica del Menor</strong>, art. 2 (interés superior) y art. 9 (derecho a ser oído y escuchado), en la redacción de la LO 8/2015.</li>
            <li><strong>Ley Orgánica 8/2021 (LOPIVI)</strong>, de protección integral a la infancia y la adolescencia frente a la violencia: prevención, detección precoz y actuación de los servicios sociales.</li>
            <li><strong>Reglamento (UE) 2016/679 (RGPD)</strong>, arts. 5, 6, 8 y 9, y <strong>Ley Orgánica 3/2018 (LOPDGDD)</strong>, art. 7: tratamiento de datos de menores con base legítima, minimización, confidencialidad y acceso restringido a profesionales que intervienen en el caso.</li>
          </ul>
          <p className={styles.leyenda}>Los datos se recogen para apoyar la escucha del menor y la intervención profesional. No deben utilizarse como prueba única ni para decisiones automatizadas (art. 22 RGPD).</p>
        </Seccion>

        {/* Registro cronológico */}
        <details className={styles.registro}>
          <summary>Registro cronológico completo ({a.eventos.length} eventos registrados)</summary>
          <div className={styles.tablaWrap} style={{ marginTop: 12 }}>
            <table className={styles.tabla}>
              <thead><tr><th>Hora</th><th>Tipo de evento</th><th>Detalle de la acción</th></tr></thead>
              <tbody>
                {a.eventos.map((e, i) => (
                  <tr key={i}>
                    <td><strong>{new Date(e.t).toLocaleTimeString('es-ES')}</strong></td>
                    <td>{e.kind}</td>
                    <td className={styles.alt}>
                      {e.kind === 'decision' ? `${e.data.prompt} → ${e.data.option_label} (${fmtSeg(e.data.time_ms)})`
                        : e.kind === 'progreso' ? `${e.data.node_id} · cap. ${e.data.chapter ?? '—'}`
                          : e.kind.startsWith('minijuego') ? e.data.game
                            : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <footer className={styles.pie}>
          Informe generado automáticamente por Chavales Legales el {new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}. Uso profesional y confidencial.
        </footer>
      </main>
    </div>
  )
}
