'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from '../informe.module.css'
import { Barras, Kpi } from '../Graficas'
import { analizar, fmtDuracion, fmtFecha, fmtSeg, localeDe } from '../analisis'
import { useI18n } from '../../../lib/i18n'
import { cargarCaso, resumenCaso } from '../../../lib/casos'
import { downloadJson } from '../../experiments/shared'
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

export default function InformeCaso({ params }) {
  const { t, lang } = useI18n()
  const tr = useTr()
  const locale = localeDe(lang)
  const id = decodeURIComponent(params.caso)
  const [caso, setCaso] = useState(null)
  const [actualizado, setActualizado] = useState(null)

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

  if (!caso) return <div className={styles.page}><p className={styles.cargando}>{t('informe.cargandoInforme')}</p></div>

  // La API puede fallar o el caso no existir. Antes se pintaba un informe vacío con aspecto
  // normal y atribuido a "este navegador"; ahora se dice lo que pasa.
  if (caso.fuente === 'error' || caso.fuente === 'inexistente') {
    const esInexistente = caso.fuente === 'inexistente'
    return (
      <div className={styles.page}>
        <div className={styles.topbar}>
          <Link href="/informe" className={styles.btnTopBack}>{t('informe.volverCasos')}</Link>
        </div>
        <main className={styles.mainContainer}>
          <section className={styles.seccionCard} role="alert">
            <h1>{esInexistente ? t('informe.casoInexistenteTitulo') : t('informe.errorCargaTitulo')}</h1>
            <p>{esInexistente ? t('informe.casoInexistenteTexto', { id }) : t('informe.errorCargaTexto')}</p>
            {!esInexistente && caso.error != null && (
              <p className={styles.leyenda}>{t('informe.errorDetalle', { detalle: String(caso.error) })}</p>
            )}
          </section>
        </main>
      </div>
    )
  }

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
            <p className={styles.subtitulo}>{meta.nombreJoven ?? t('informe.sinIdentificar')}{meta.tipoRiesgo ? ` · ${textoRiesgo(t, meta)}` : ''}</p>
          </div>
          <dl className={styles.fichaGrid}>
            <dt>{t('informe.dtInicio')}</dt><dd>{fmtFecha(a.inicio, lang)}</dd>
            <dt>{t('informe.dtUltima')}</dt><dd>{fmtFecha(a.ultimo, lang)}</dd>
            <dt>{t('informe.dtEstado')}</dt><dd>{t(a.terminado ? 'informe.estadoCompletada' : enCurso ? 'informe.estadoEnCurso' : a.inicio ? 'informe.estadoIncompleta' : 'informe.estadoSinActividad')}</dd>
            <dt>{t('informe.dtOrigen')}</dt><dd>{t('informe.origenServidor')}</dd>
          </dl>
        </header>

        <div className={styles.avisoCard}>
          <strong>{t('informe.avisoTitulo')}</strong> {t('informe.avisoTexto')}
        </div>

        {/* Si el reloj del dispositivo se desvía del servidor, las duraciones medidas en el
            navegador dejan de ser fiables. Mejor decirlo que publicarlas como exactas. */}
        {a.desfase?.medido && !a.desfase.fiable && (
          <div className={styles.avisoDatos} role="status">
            <strong>{t('informe.desfaseTitulo')}</strong>{' '}
            {t('informe.desfaseTexto', { max: fmtSeg(a.desfase.maxMs) })}
          </div>
        )}
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


