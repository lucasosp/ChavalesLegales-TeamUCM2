'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '../servicios.module.css'
import { Barras, Kpi } from '../Graficas'
import { analizar, fmtDuracion, fmtFechaCorta, fmtSeg, localeDe } from '../analisis'
import { useI18n } from '../../../lib/i18n'
import { cargarCaso, resumenCaso } from '../../../lib/casos'
import { downloadJson } from '../../experiments/shared'
import Barra from '../../../components/Barra'
import { Nota, Seccion, Pendiente } from '../piezas'
import { useTr } from '../useTr'
import { textoRiesgo } from '../riesgo'
import { detalleEvento } from '../evento'
import Dibujo from '../Dibujo'
import { Mesa, Mundo } from '../Minijuegos'

// Cada cuánto se sondea el caso mientras el informe está abierto. Se sondea el resumen ligero
// (unos bytes) y solo se baja el caso completo cuando cambia: bajarse 50 KB de imágenes cada
// 5 segundos no tenía sentido.
const SONDEO_MS = 5000

// Manchas del fondo: las clases globales de globals.css, las mismas de la portada.
function Fondo() {
  return (
    <div className={styles.fondo} aria-hidden="true">
      <div className="bg-wave-left" />
      <div className="bg-arc-right" />
      <div className="bg-sphere-glow" />
    </div>
  )
}

export default function InformeCaso({ params }) {
  const { t, lang } = useI18n()
  const tr = useTr()
  const locale = localeDe(lang)
  const id = decodeURIComponent(params.caso)
  const [caso, setCaso] = useState(null)
  const [actualizado, setActualizado] = useState(null)
  // Decisión desplegada en el acordeón de la tabla (null = todas cerradas)
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    let vivo = true
    let sondeo = null

    const cargarCompleto = () =>
      cargarCaso(id).then((c) => {
        if (!vivo) return
        setCaso(c)
        setActualizado(new Date())
      })

    // Sondeo ligero: solo se baja el caso entero (con las imágenes del dibujo) si el
    // contador de eventos o el último sello cambian.
    let ultimoVisto = null
    const sondear = async () => {
      const r = await resumenCaso(id)
      if (!vivo || !r) return
      const firma = `${r.eventos}:${r.ultimo ?? ''}`
      if (ultimoVisto !== null && firma === ultimoVisto) return
      ultimoVisto = firma
      cargarCompleto()
    }

    const arrancar = () => {
      if (sondeo) return
      sondear()
      sondeo = setInterval(sondear, SONDEO_MS)
    }
    const parar = () => {
      clearInterval(sondeo)
      sondeo = null
    }
    // Sin pestaña visible no se sondea: no hay nadie mirando el informe.
    const alCambiarVisibilidad = () => (document.hidden ? parar() : arrancar())

    cargarCompleto()
    if (!document.hidden) arrancar()
    document.addEventListener('visibilitychange', alCambiarVisibilidad)

    return () => {
      vivo = false
      parar()
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
    }
  }, [id])

  const a = useMemo(() => analizar(caso), [caso])
  const meta = caso?.meta ?? {}
  const cid = a.minijuegos['cid-table']?.report
  const arena = a.minijuegos['caja-arena']?.report
  const enCurso = a.ultimo && Date.now() - a.ultimo < 90000 && !a.terminado
  // El aviso de desfase solo tiene sentido si se midió y no es fiable
  const desfaseRaro = Boolean(a.desfase?.medido && !a.desfase.fiable)

  if (!caso) {
    return (
      <div className={styles.pagina}>
        <Fondo />
        <Barra href="/servicios" texto={t('informe.volverCasos')} />
        <main className={styles.principal}>
          <article className={styles.pliego}>
            <p className="sr-only" role="status">{t('informe.cargandoInforme')}</p>
            <div className={styles.esqueleto} aria-hidden="true">
              <span className={styles.esqueletoFila} />
              <span className={styles.esqueletoFila} />
              <span className={styles.esqueletoFila} />
              <span className={styles.esqueletoFila} />
            </div>
          </article>
        </main>
      </div>
    )
  }

  // La API puede fallar o el caso no existir. Antes se pintaba un informe vacío con aspecto
  // normal y atribuido a "este navegador"; ahora se dice lo que pasa.
  if (caso.fuente === 'error' || caso.fuente === 'inexistente') {
    const esInexistente = caso.fuente === 'inexistente'
    return (
      <div className={styles.pagina}>
        <Fondo />
        <Barra href="/servicios" texto={t('informe.volverCasos')} />
        <main className={styles.principal}>
          <article className={styles.pliego}>
            <section role="alert">
              <h1 className={styles.titulo}>{esInexistente ? t('informe.casoInexistenteTitulo') : t('informe.errorCargaTitulo')}</h1>
              <p className={styles.subtitulo}>
                {esInexistente ? t('informe.casoInexistenteTexto', { id }) : t('informe.errorCargaTexto')}
              </p>
              {!esInexistente && caso.error != null && (
                <p className={styles.leyenda}>{t('informe.errorDetalle', { detalle: String(caso.error) })}</p>
              )}
            </section>
          </article>
        </main>
      </div>
    )
  }

  return (
    <div className={styles.pagina}>
      <Fondo />

      <Barra href="/servicios" texto={t('informe.volverCasos')} />

      <main className={styles.principal}>
        <article className={styles.pliego}>
          {/* ---------- Cabecera de la hoja ---------- */}
          <header className={styles.cabecera}>
            <div className={styles.cabeceraTexto}>
              <h1 className={styles.titulo}>{t('informe.tituloCaso', { id })}</h1>
              {/* Bajo el título, cuándo se actualizó el informe (misma fuente que
                  antes llevaba el nombre: el nombre baja a la ficha). */}
              <p className={styles.subtitulo}>
                {t('informe.actualizado', { hora: actualizado?.toLocaleTimeString(locale) ?? '' })}
              </p>
            </div>

            {/* A la derecha del título y a su misma altura: los dos botones se
                estiran lo que mida el título + la línea de actualizado. */}
            <div className={styles.acciones}>
              <button
                type="button"
                className={styles.btnSec}
                onClick={() => downloadJson({ caso, analisis: { ...a, eventos: undefined } }, `informe-${id}`)}
              >
                {t('informe.exportarJson')}
              </button>
              <button type="button" className={styles.btnSec} onClick={() => window.print()}>
                {t('informe.imprimir')}
              </button>
            </div>
          </header>

          {/* ---------- Datos de la sesión ---------- */}
          <dl className={`${styles.fichaGrid} ${styles.bloque}`}>
            <div className={`${styles.fichaItem} ${styles.fichaEdad}`}>
              <dt>{t('informe.dtEdad')}</dt>
              <dd>{meta.edad ? t('profesores.edadValor', { edad: meta.edad }) : '—'}</dd>
            </div>
            <div className={`${styles.fichaItem} ${styles.fichaSituacion}`}>
              <dt>{t('informe.colSituacion')}</dt>
              <dd>{meta.tipoRiesgo ? textoRiesgo(t, meta) : '—'}</dd>
            </div>
            <div className={styles.fichaItem}>
              <dt>{t('informe.dtInicio')}</dt>
              <dd>{fmtFechaCorta(a.inicio)}</dd>
            </div>
            <div className={styles.fichaItem}>
              <dt>{t('informe.dtUltima')}</dt>
              <dd>{fmtFechaCorta(a.ultimo)}</dd>
            </div>
            <div className={styles.fichaItem}>
              <dt>{t('informe.dtEstado')}</dt>
              <dd>{t(a.terminado ? 'informe.estadoCompletada' : enCurso ? 'informe.estadoEnCurso' : a.inicio ? 'informe.estadoIncompleta' : 'informe.estadoSinActividad')}</dd>
            </div>
          </dl>

          {/* ---------- Avisos ----------
              Solo si hay algo que avisar: un bloque vacío deja su regla de tinta
              suelta y salen dos rayas seguidas con un hueco en medio. */}
          {(desfaseRaro || meta.contexto) && (
            <div className={`${styles.avisos} ${styles.bloque}`}>
              {/* Si el reloj del dispositivo se desvía del servidor, las duraciones medidas en el
                  navegador dejan de ser fiables. Mejor decirlo que publicarlas como exactas. */}
              {desfaseRaro && (
                <p className={styles.avisoDatos} role="status">
                  <strong>{t('informe.desfaseTitulo')}</strong>{' '}
                  {t('informe.desfaseTexto', { max: fmtSeg(a.desfase.maxMs) })}
                </p>
              )}

              {meta.contexto && (
                <p className={styles.contextoCard}>
                  <strong>{t('informe.contextoProfesional')}</strong> {meta.contexto}
                </p>
              )}
            </div>
          )}

          {/* ---------- 1. Resumen: las cifras de la sesión ---------- */}
          <Seccion numero="1" titulo={t('informe.s1Titulo')} sub={t('informe.s1Sub')}>
            <div className={styles.kpisSection}>
              <Kpi etiqueta={t('informe.kpiDuracion')} valor={fmtDuracion(a.duracionMs)} nota={a.sesiones > 1 ? t('informe.kpiAccesos', { n: a.sesiones }) : undefined} />
              <Kpi etiqueta={t('informe.kpiDecisiones')} valor={a.decisiones.length} />
              <Kpi etiqueta={t('informe.kpiMediana')} valor={fmtSeg(a.latencia.mediana)} nota={a.latencia.mediana ? t('informe.kpiRango', { min: fmtSeg(a.latencia.min), max: fmtSeg(a.latencia.max) }) : undefined} />
              <Kpi etiqueta={t('informe.kpiPantallas')} valor={a.pantallasVistas} nota={t('informe.kpiPantallasNota', { relecturas: a.relecturas, pausas: a.pausasLargas })} />
              <Kpi etiqueta={t('informe.kpiActividades')} valor={`${Object.keys(a.minijuegos).length + (a.dibujo?.phase1 ? 1 : 0)} / 3`} nota={t('informe.kpiActividadesNota')} />
            </div>
          </Seccion>

          {/* ---------- 2. Decisiones ---------- */}
          <Seccion numero="2" titulo={t('informe.s2Titulo')} sub={t('informe.s2Sub')}>
            {a.decisiones.length ? (
              <>
                <Barras
                  datos={a.decisiones.map((d, i) => ({ etiqueta: `D${i + 1}`, titulo: d.prompt, valor: d.time_ms / 1000, destacado: d.destacada }))}
                  unidad=" s"
                  formato={(v) => v.toFixed(1)}
                  referencia={{ valor: a.latencia.mediana / 1000, etiqueta: t('informe.mediana', { tiempo: fmtSeg(a.latencia.mediana) }) }}
                  leyenda={t('informe.leyendaOutlier')}
                  ejeY={`${t('informe.colTiempo')} (s)`}
                  ejeX={t('informe.ejeDecision')}
                />
                {/* La regla del outlier, aclarada en pequeño bajo el gráfico */}
                <p className={styles.leyenda}>{t('informe.leyendaDestacado')}</p>
                {/* Acordeón: cada fila abre la situación inicial, todas las
                    opciones y la que se eligió (antes había una columna con las
                    alternativas sueltas). */}
                <div className={styles.tablaScroll}>
                  <table className={styles.tabla}>
                    <thead>
                      <tr>
                        <th className={styles.thCentro}>#</th>
                        <th className={styles.thCentro}>{t('informe.colCap')}</th>
                        <th>{t('informe.colSituacionPlanteada')}</th>
                        <th>{t('informe.colOpcion')}</th>
                        <th className={styles.thCentro}>{t('informe.colTiempo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.decisiones.map((d, i) => {
                        const abierta = detalle === i
                        return (
                          <Fragment key={i}>
                            <tr
                              className={`${d.destacada ? styles.filaDestacada : ''} ${abierta ? styles.filaAbierta : ''} ${styles.filaClic}`}
                              onClick={() => setDetalle(abierta ? null : i)}
                            >
                              <td className={styles.celdaCentroPlano}>
                                <button
                                  type="button"
                                  className={styles.btnDetalle}
                                  aria-expanded={abierta}
                                  aria-controls={`decision-${i}`}
                                  aria-label={t('informe.decisionAria', { n: i + 1 })}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDetalle(abierta ? null : i)
                                  }}
                                >
                                  <span className={styles.flechaDetalle} aria-hidden="true">{abierta ? '▾' : '▸'}</span>
                                  D{i + 1}
                                </button>
                              </td>
                              <td className={styles.celdaCentroPlano}>{d.chapter}</td>
                              <td>{d.prompt}</td>
                              <td><strong>{d.option_label}</strong></td>
                              <td className={styles.celdaCentro}>
                                {fmtSeg(d.time_ms)}
                                {d.relativa ? <small> ({d.relativa.toFixed(1)}×)</small> : null}
                              </td>
                            </tr>
                            {abierta && (
                              <tr className={styles.filaDetalle} id={`decision-${i}`}>
                                <td colSpan={5}>
                                  <div className={styles.detalle}>
                                    <div>
                                      <span className={styles.detalleEtiqueta}>{t('informe.decisionSituacion')}</span>
                                      <p className={styles.detalleTexto}>{d.prompt}</p>
                                    </div>
                                    <div>
                                      <span className={styles.detalleEtiqueta}>{t('informe.decisionOpciones')}</span>
                                      <ul className={styles.detalleOpciones}>
                                        {(d.all_options ?? []).map((o) => (
                                          <li key={o.id} className={o.id === d.option_id ? styles.opcionElegida : undefined}>
                                            <span className={styles.opcionTexto}>{o.label}</span>
                                            {o.id === d.option_id && (
                                              <span className={styles.opcionEtiqueta}>
                                                <span aria-hidden="true">✓ </span>
                                                {t('informe.decisionElegida')}
                                              </span>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    <p className={styles.detalleElegida}>
                                      <span className={styles.detalleEtiqueta}>{t('informe.decisionElegida')}</span>
                                      <strong>{d.option_label}</strong>
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <Pendiente texto={t('informe.sinDecisiones')} />}
            <Nota>
              <p><strong>{t('informe.s2Nota1Titulo')}</strong> {t('informe.s2Nota1')}</p>
              <p><strong>{t('informe.s2Nota2Titulo')}</strong> {t('informe.s2Nota2')}</p>
            </Nota>
          </Seccion>

          {/* ---------- 3. Lectura ---------- */}
          <Seccion numero="3" titulo={t('informe.s3Titulo')} sub={t('informe.s3Sub')}>
            {a.capitulos.length ? (
              <>
                {(() => {
                  const enMin = Math.max(...a.capitulos.map((c) => c.lecturaMs)) >= 120000
                  return <Barras datos={a.capitulos.map((c) => ({ etiqueta: t('informe.capCorto', { n: c.capitulo }), valor: c.lecturaMs / (enMin ? 60000 : 1000) }))} unidad={enMin ? ' min' : ' s'} formato={(v) => (enMin ? v.toFixed(1) : Math.round(v))} alto={190} ejeY={`${t('informe.colTiempo')} (${enMin ? 'min' : 's'})`} ejeX={t('informe.colCapitulo')} />
                })()}
                <div className={styles.tablaScroll}>
                  <table className={styles.tabla}>
                    <thead><tr><th>{t('informe.colCapitulo')}</th><th>{t('informe.colPantallas')}</th><th>{t('informe.colTiempoLectura')}</th><th>{t('informe.colSegPantalla')}</th><th>{t('informe.colRelecturas')}</th><th>{t('informe.colDecisiones')}</th></tr></thead>
                    <tbody>
                      {a.capitulos.map((c) => (
                        <tr key={c.capitulo}><td>{c.capitulo}</td><td className={styles.celdaNum}>{c.pantallas}</td><td>{fmtDuracion(c.lecturaMs)}</td><td>{fmtSeg(c.lecturaMs / Math.max(c.pantallas, 1))}</td><td className={styles.celdaNum}>{c.relecturas}</td><td className={styles.celdaNum}>{c.decisiones}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <Pendiente texto={t('informe.sinLectura')} />}
            <Nota>
              <p>{t('informe.s3Nota')}</p>
            </Nota>
          </Seccion>

          {/* ---------- 4. Mesa CID ---------- */}
          <Seccion numero="4" titulo={t('informe.s4Titulo')} sub={t('informe.s4Sub')}>
            {cid ? (
              <>
                <Mesa report={cid} />
                <p className={styles.leyenda}>
                  {t('informe.duracionActividad', { duracion: fmtDuracion(a.minijuegos['cid-table']?.duracionMs) })}
                </p>
              </>
            ) : <Pendiente texto={t('informe.sinMinijuego')} />}
            <Nota>
              <p>{t('informe.s4Nota')}</p>
            </Nota>
          </Seccion>

          {/* ---------- 5. Caja de arena ---------- */}
          <Seccion numero="5" titulo={t('informe.s5Titulo')} sub={t('informe.s5Sub')}>
            {arena ? (
              <>
                <Mundo report={arena} />
                <p className={styles.leyenda}>
                  {t('informe.duracionActividad', { duracion: fmtDuracion(a.minijuegos['caja-arena']?.duracionMs) })}
                </p>
              </>
            ) : <Pendiente texto={t('informe.sinMinijuego')} />}
            <Nota>
              <p>{t('informe.s5Nota')}</p>
            </Nota>
          </Seccion>

          {/* ---------- 6. Dibujo ---------- */}
          <Seccion numero="6" titulo={t('informe.s6Titulo')} sub={t('informe.s6Sub')}>
            {a.dibujo?.phase1 ? <Dibujo dibujo={a.dibujo} /> : <Pendiente texto={t('informe.sinDibujos')} />}
            <Nota>
              <p>{t('informe.s6Nota')}</p>
            </Nota>
          </Seccion>

          {/* ---------- 7. Marco normativo ---------- */}
          <Seccion numero="7" titulo={t('informe.s7Titulo')}>
            <ul className={styles.normas}>
              <li><strong>{t('informe.norma1Nombre')}</strong>{t('informe.norma1Texto')}</li>
              <li><strong>{t('informe.norma2Nombre')}</strong>{t('informe.norma2Texto')}</li>
              <li><strong>{t('informe.norma3Nombre')}</strong>{t('informe.norma3Texto')}</li>
              <li><strong>{t('informe.norma4aNombre')}</strong>{t('informe.norma4Medio')}<strong>{t('informe.norma4bNombre')}</strong>{t('informe.norma4Texto')}</li>
            </ul>
            <p className={styles.leyenda}>{t('informe.s7Leyenda')}</p>
          </Seccion>

          {/* ---------- Registro crudo ---------- */}
          <details className={`${styles.registro} ${styles.bloque}`}>
            <summary>{t('informe.registro', { n: a.eventos.length })}</summary>
            <div className={styles.tablaScroll}>
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
            </div>
          </details>

          <footer className={`${styles.pie} ${styles.bloque}`}>
            {/* Aviso metodológico: letra pequeña gris, al final del documento */}
            <p className={styles.letraPequena}>
              <strong>{t('informe.avisoTitulo')}</strong> {t('informe.avisoTexto')}
            </p>
            <p>{t('informe.pie', { fecha: new Date().toLocaleDateString(locale, { dateStyle: 'long' }) })}</p>
            <Link href="/servicios" className={styles.btnSticker}>{t('informe.volverCasos')}</Link>
          </footer>
        </article>
      </main>
    </div>
  )
}
