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
    <section className={styles.seccion}>
      <header className={styles.seccionHead}>
        <span className={styles.num}>{numero}</span>
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
      <table className={styles.tabla}>
        <thead><tr><th>Persona</th><th>Distancia media</th><th>Veces la más cercana</th><th>Veces la más lejana</th></tr></thead>
        <tbody>
          {report.summary.characterSummary.map((c) => (
            <tr key={c.characterId}><td>{c.name}</td><td>{Math.round(c.meanEuclidean)}</td><td>{c.closestCount}</td><td>{c.furthestCount}</td></tr>
          ))}
        </tbody>
      </table>
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
          <BarrasH ancho={360} datos={Object.entries(report.summary.zoneCounts).map(([z, n]) => ({ etiqueta: cap(ZONA[z] ?? z), valor: n, color: z === w?.zone ? '#c2410c' : undefined }))} />
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

      <table className={styles.tabla}>
        <thead><tr><th>Perro</th><th>Ecosistema final</th><th>Movimientos</th><th>Giros</th><th>Perro más cercano</th><th>Dist. al centro</th></tr></thead>
        <tbody>
          {report.dogs.map((d) => (
            <tr key={d.id}>
              <td>{d.name} <small>({d.trait})</small></td>
              <td>{d.placed ? cap(ZONA[d.zone] ?? d.zone) : 'no colocado'}</td>
              <td>{d.moves}</td>
              <td>{d.turns}</td>
              <td>{d.nearestDogId ? `${nombre(d.nearestDogId)} (${Math.round(d.nearestDogDistance)})` : '—'}</td>
              <td>{d.distanceToCenter != null ? Math.round(d.distanceToCenter) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
        <table className={styles.tabla}>
          <thead><tr><th>Indicador grafomotor</th>{fases.filter(([k]) => dibujo[`${k}Metrics`]).map(([k, t]) => <th key={k}>{t}</th>)}</tr></thead>
          <tbody>
            {filas.map(([nombre, f]) => (
              <tr key={nombre}><td>{nombre}</td>{metricas.map((m, i) => <td key={i}>{f(m) ?? '—'}</td>)}</tr>
            ))}
          </tbody>
        </table>
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

  if (!caso) return <div className={styles.page}><p className={styles.cargando}>Cargando informe…</p></div>

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link href="/informe" className={styles.btnGhost}>← Casos</Link>
        <span className={styles.vivo}>{enCurso ? '● Sesión en curso · ' : ''}Actualizado {actualizado?.toLocaleTimeString('es-ES')}</span>
        <div className={styles.acciones}>
          <button type="button" className={styles.btnGhost} onClick={() => downloadJson({ caso, analisis: { ...a, eventos: undefined } }, `informe-${id}`)}>Exportar datos (JSON)</button>
          <button type="button" className={styles.btn} onClick={() => window.print()}>Imprimir / PDF</button>
        </div>
      </div>

      <article className={styles.doc}>
        <header className={styles.portada}>
          <div>
            <span className={styles.kicker}>Chavales Legales · Informe descriptivo de sesión</span>
            <h1>Caso {id}</h1>
            <p className={styles.subtitulo}>{meta.nombreJoven ?? 'Participante sin identificar'}{meta.tipoRiesgo ? ` · ${meta.tipoRiesgo}` : ''}</p>
          </div>
          <dl className={styles.ficha}>
            <dt>Inicio</dt><dd>{fmtFecha(a.inicio)}</dd>
            <dt>Última actividad</dt><dd>{fmtFecha(a.ultimo)}</dd>
            <dt>Estado</dt><dd>{a.terminado ? 'Historia completada' : enCurso ? 'En curso' : a.inicio ? 'Incompleta' : 'Sin actividad'}</dd>
            <dt>Origen de datos</dt><dd>{caso.fuente === 'servidor' ? 'Servidor de la plataforma' : 'Este navegador'}</dd>
          </dl>
        </header>

        <div className={styles.aviso}>
          <strong>Documento descriptivo, sin valoración.</strong> Este informe recoge datos objetivos de la interacción del menor con la plataforma
          (tiempos, elecciones y producciones). No constituye diagnóstico, evaluación psicológica ni veredicto, y las adaptaciones digitales de las
          pruebas no están baremadas. Su interpretación corresponde a profesionales cualificados, en contexto y contrastada con otras fuentes (entrevista,
          observación, informes previos). Las referencias a “valores destacados” se calculan respecto a la propia línea base del menor, no respecto a
          normas poblacionales.
        </div>
        {meta.contexto && <p className={styles.contexto}><strong>Contexto aportado por el profesional:</strong> {meta.contexto}</p>}

        <div className={styles.kpis}>
          <Kpi etiqueta="Duración de la sesión" valor={fmtDuracion(a.duracionMs)} nota={a.sesiones > 1 ? `${a.sesiones} accesos` : undefined} />
          <Kpi etiqueta="Decisiones tomadas" valor={a.decisiones.length} />
          <Kpi etiqueta="Mediana de decisión" valor={fmtSeg(a.latencia.mediana)} nota={a.latencia.mediana ? `rango ${fmtSeg(a.latencia.min)} – ${fmtSeg(a.latencia.max)}` : undefined} />
          <Kpi etiqueta="Pantallas leídas" valor={a.pantallasVistas} nota={`${a.relecturas} relecturas · ${a.pausasLargas} pausas > 1 min`} />
          <Kpi etiqueta="Actividades completadas" valor={`${Object.keys(a.minijuegos).length + (a.dibujo?.phase1 ? 1 : 0)} / 3`} nota="dibujo, mesa y caja de arena" />
        </div>

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
              <table className={styles.tabla}>
                <thead><tr><th>#</th><th>Cap.</th><th>Situación planteada</th><th>Opción elegida</th><th>Alternativas</th><th>Tiempo</th></tr></thead>
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
          ) : <Pendiente texto="Todavía no hay decisiones registradas." />}
          <Nota>
            <p><strong>Latencia de decisión:</strong> tiempo entre la aparición de las opciones y la elección. La cronometría mental relaciona la latencia con el grado de deliberación, el conflicto entre alternativas y la carga emocional del contenido (paradigmas de tiempo de reacción como el Stroop emocional). Por eso se compara cada decisión con la mediana del propio menor: un tiempo destacado señala un tema que puede merecer conversación, nunca una conclusión.</p>
            <p><strong>Elección:</strong> se registran literalmente la opción tomada y las descartadas para poder comentarlas con el menor. Las elecciones dentro de una ficción no equivalen a conductas reales.</p>
          </Nota>
        </Seccion>

        <Seccion numero="2" titulo="Ritmo de lectura" sub="Tiempo de lectura acumulado por capítulo, relecturas (retrocesos) y pausas.">
          {a.capitulos.length ? (
            <>
              {(() => {
                const enMin = Math.max(...a.capitulos.map((c) => c.lecturaMs)) >= 120000
                return <Barras datos={a.capitulos.map((c) => ({ etiqueta: `Cap. ${c.capitulo}`, valor: c.lecturaMs / (enMin ? 60000 : 1000) }))} unidad={enMin ? ' min' : ' s'} formato={(v) => (enMin ? v.toFixed(1) : Math.round(v))} alto={190} />
              })()}
              <table className={styles.tabla}>
                <thead><tr><th>Capítulo</th><th>Pantallas</th><th>Tiempo de lectura</th><th>Seg. por pantalla</th><th>Relecturas</th><th>Decisiones</th></tr></thead>
                <tbody>
                  {a.capitulos.map((c) => (
                    <tr key={c.capitulo}><td>{c.capitulo}</td><td>{c.pantallas}</td><td>{fmtDuracion(c.lecturaMs)}</td><td>{fmtSeg(c.lecturaMs / Math.max(c.pantallas, 1))}</td><td>{c.relecturas}</td><td>{c.decisiones}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : <Pendiente texto="Todavía no hay progreso de lectura registrado." />}
          <Nota>
            <p>El tiempo por pantalla aproxima la atención sostenida y el ritmo de comprensión lectora; las relecturas (volver atrás) pueden reflejar interés, dudas de comprensión o necesidad de revisar un pasaje. Cada pantalla se limita a 2 minutos para no contar ausencias; las pausas de más de un minuto se cuentan aparte porque suelen deberse a interrupciones del entorno. El tiempo dentro de los minijuegos no se incluye aquí.</p>
          </Nota>
        </Seccion>

        <Seccion numero="3" titulo="La mesa de la familia" sub="Adaptación de la Comfortable Interpersonal Distance Scale (Duke y Nowicki, 1972). El menor elige dónde sentarse en tres situaciones.">
          {cid ? <Mesa report={cid} /> : <Pendiente texto="El menor aún no ha llegado a este minijuego." />}
          <Nota>
            <p>La proxémica (Hall, 1966) estudia la distancia que las personas mantienen con otras según la relación y la situación. La escala CID usa la distancia elegida respecto a figuras representadas como medida de distancia interpersonal preferida. Aquí se registra la silla elegida en cada ronda, la distancia euclídea y angular a cada persona, el tiempo de elección y las sillas exploradas antes de decidir. Influyen también factores ajenos a la relación (preferencia por un lado de la mesa, sillas libres disponibles), por lo que los datos deben comentarse con el menor.</p>
          </Nota>
        </Seccion>

        <Seccion numero="4" titulo="Mi mundo con perros" sub="Adaptación digital de la Técnica del Mundo (Margaret Lowenfeld) con un evento meteorológico inesperado.">
          {arena ? <Mundo report={arena} /> : <Pendiente texto="El menor aún no ha llegado a este minijuego." />}
          <Nota>
            <p>En la Técnica del Mundo el menor construye libremente una escena en una bandeja de arena; se observa la organización del espacio, qué elementos se agrupan o aíslan y el orden de construcción. Los perros tienen rasgos distintos (pequeño, gracioso, tímido, grande…) para facilitar la proyección. El evento meteorológico funciona como perturbación inesperada: se registra si hay acciones posteriores, cuánto tardan y qué perros se trasladan hacia o desde la zona afectada. El relato final es literal y opcional.</p>
          </Nota>
        </Seccion>

        <Seccion numero="5" titulo="Dibujo del avatar" sub="Producciones gráficas realizadas al inicio de la historia e indicadores grafomotores.">
          {a.dibujo?.phase1 ? <Dibujo dibujo={a.dibujo} /> : <Pendiente texto="No hay dibujos registrados en esta sesión." />}
          <Nota>
            <p>El dibujo infantil se utiliza en la práctica profesional como medio de expresión y apoyo a la entrevista (Koppitz, Machover). Los indicadores grafomotores (latencia, pausas, presión, temblor, ocupación del espacio, uso del color) describen cómo se realizó el dibujo. Dependen del dispositivo (ratón, dedo, lápiz) y de la edad, y no tienen valor diagnóstico por sí solos.</p>
          </Nota>
        </Seccion>

        <Seccion numero="6" titulo="Marco normativo y uso de los datos">
          <ul className={styles.normas}>
            <li><strong>Convención sobre los Derechos del Niño (ONU, 1989)</strong>, art. 3 (interés superior del menor) y art. 12 (derecho a expresar su opinión y a ser escuchado).</li>
            <li><strong>Ley Orgánica 1/1996, de Protección Jurídica del Menor</strong>, art. 2 (interés superior) y art. 9 (derecho a ser oído y escuchado), en la redacción de la LO 8/2015.</li>
            <li><strong>Ley Orgánica 8/2021 (LOPIVI)</strong>, de protección integral a la infancia y la adolescencia frente a la violencia: prevención, detección precoz y actuación de los servicios sociales.</li>
            <li><strong>Reglamento (UE) 2016/679 (RGPD)</strong>, arts. 5, 6, 8 y 9, y <strong>Ley Orgánica 3/2018 (LOPDGDD)</strong>, art. 7: tratamiento de datos de menores con base legítima, minimización, confidencialidad y acceso restringido a profesionales que intervienen en el caso.</li>
          </ul>
          <p className={styles.leyenda}>Los datos se recogen para apoyar la escucha del menor y la intervención profesional. No deben utilizarse como prueba única ni para decisiones automatizadas (art. 22 RGPD).</p>
        </Seccion>

        <details className={styles.registro}>
          <summary>Registro cronológico completo ({a.eventos.length} eventos)</summary>
          <table className={styles.tabla}>
            <thead><tr><th>Hora</th><th>Tipo</th><th>Detalle</th></tr></thead>
            <tbody>
              {a.eventos.map((e, i) => (
                <tr key={i}>
                  <td>{new Date(e.t).toLocaleTimeString('es-ES')}</td>
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
        </details>
        <footer className={styles.pie}>Informe generado automáticamente por Chavales Legales el {new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}. Uso profesional y confidencial.</footer>
      </article>
    </div>
  )
}

