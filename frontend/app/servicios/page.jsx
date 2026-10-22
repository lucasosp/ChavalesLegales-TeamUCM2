'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './servicios.module.css'
import Barra from '../../components/Barra'
import { listarCasos } from '../../lib/casos'
import { useI18n } from '../../lib/i18n'
import { localeDe } from './analisis'
import { textoRiesgo } from './riesgo'

/* ---------------------------------------------------------------------------
   Búsqueda
   Búsqueda por el número de caso: prefijo de los dígitos del id (`123`, `CL-123`, `CL-12345`)
   --------------------------------------------------------------------------- */

const sinTildes = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function analizarConsulta(texto) {
  const q = sinTildes(texto)
  const digitos = q.replace(/\D/g, '')
  return { digitos, vacia: !digitos }
}

function puntuarCaso(caso, q) {
  if (q.vacia) return 1
  if (q.digitos && !caso.id.replace(/\D/g, '').startsWith(q.digitos)) return 0
  return 1
}

/* Ordenación por columnas */
const COMPARADORES = {
  caso: (a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }),
  creado: (a, b) => (a.meta?.creadoEn ?? '').localeCompare(b.meta?.creadoEn ?? ''),
  eventos: (a, b) => (a.eventos ?? 0) - (b.eventos ?? 0),
}
// Columnas que se ordenan "de más a menos" al pulsarlas por primera vez
const DE_MAYOR_A_MENOR = new Set(['creado', 'eventos'])

/**
 * Listado de casos. Una sola plancha blanca sobre el fondo verde de la web, con
 * buscador y tabla ordenable dentro.
 */
export default function ListaServicios() {
  const { t, lang } = useI18n()
  const [casos, setCasos] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState({ campo: 'creado', dir: 'desc' })

  useEffect(() => {
    listarCasos().then((c) =>
      setCasos([...c].sort((a, b) => (b.meta?.creadoEn ?? '').localeCompare(a.meta?.creadoEn ?? ''))),
    )
  }, [])

  const filas = useMemo(() => {
    if (!casos) return []
    const q = analizarConsulta(busqueda)
    const comparar =
      orden.campo === 'situacion'
        ? (a, b) => sinTildes(textoRiesgo(t, a.meta ?? {})).localeCompare(sinTildes(textoRiesgo(t, b.meta ?? {})), 'es')
        : COMPARADORES[orden.campo]

    return casos
      .map((caso) => ({ caso, punto: puntuarCaso(caso, q) }))
      .filter((x) => x.punto > 0)
      .sort((a, b) => (orden.dir === 'asc' ? comparar(a.caso, b.caso) : comparar(b.caso, a.caso)))
      .map((x) => x.caso)
  }, [casos, busqueda, orden, t, lang])

  const buscando = analizarConsulta(busqueda).vacia === false

  const ordenarPor = (campo) =>
    setOrden((o) =>
      o.campo === campo
        ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
        : { campo, dir: DE_MAYOR_A_MENOR.has(campo) ? 'desc' : 'asc' },
    )

  const ariaSort = (campo) =>
    orden.campo !== campo ? 'none' : orden.dir === 'asc' ? 'ascending' : 'descending'

  // Cabecera de columna pulsable: ordena y anuncia el estado con aria-sort
  const Th = ({ campo, children }) => (
    <th scope="col" aria-sort={ariaSort(campo)}>
      <button
        type="button"
        className={`${styles.thBoton} ${orden.campo === campo ? styles.thBotonActiva : ''}`}
        onClick={() => ordenarPor(campo)}
        aria-label={t('informe.ordenarAria', { columna: children })}
      >
        <span>{children}</span>
        <span className={styles.thFlecha} aria-hidden="true">
          {orden.campo === campo ? (orden.dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )

  return (
    <div className={styles.pagina}>
      {/* Mismo fondo que la portada: las manchas son las clases globales */}
      <div className={styles.fondo} aria-hidden="true">
        <div className="bg-wave-left" />
        <div className="bg-arc-right" />
        <div className="bg-sphere-glow" />
      </div>

      <Barra href="/profesores" texto={t('informe.volverPanel')} />

      <main className={styles.principal}>
        <article className={styles.pliego}>
          {/* Solo el título: el rótulo y la frase de apoyo se quitaron, y la
              regla de tinta del bloque separa el título del buscador. */}
          <header className={styles.cabecera}>
            <div className={styles.cabeceraTexto}>
              <h1 className={styles.titulo}>{t('informe.tituloLista')}</h1>
            </div>
          </header>

          <div className={styles.bloque}>
            <div className={styles.buscador}>
              <label htmlFor="buscar-caso" className={styles.buscadorEtiqueta}>
                {t('informe.buscarEtiqueta')}
              </label>
              <div className={styles.buscadorFila}>
                <svg className={styles.buscadorLupa} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 4 4" />
                </svg>
                <input
                  id="buscar-caso"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  className={styles.buscadorCampo}
                  placeholder={t('informe.buscarPlaceholder')}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button
                    type="button"
                    className={styles.buscadorLimpiar}
                    onClick={() => setBusqueda('')}
                    aria-label={t('informe.buscarLimpiar')}
                  >
                    {/* Aspa dibujada, no el carácter ×: así queda centrada de verdad */}
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                )}
              </div>
              {buscando && casos && (
                <p className={styles.buscadorAyuda} role="status">
                  {t('informe.buscarAyuda', { n: filas.length, total: casos.length })}
                </p>
              )}
            </div>

            {!casos ? (
              <>
                <p className="sr-only" role="status">{t('informe.cargando')}</p>
                <div className={styles.esqueleto} aria-hidden="true">
                  <span className={styles.esqueletoFila} />
                  <span className={styles.esqueletoFila} />
                  <span className={styles.esqueletoFila} />
                  <span className={styles.esqueletoFila} />
                  <span className={styles.esqueletoFila} />
                </div>
              </>
            ) : casos.length === 0 ? (
              <p className={styles.pendiente}>{t('informe.sinCasos')}</p>
            ) : filas.length === 0 ? (
              <p className={styles.pendiente}>{t('informe.buscarSinResultados', { q: busqueda.trim() })}</p>
            ) : (
              <div className={styles.tablaScroll}>
                <table className={`${styles.tabla} ${styles.tablaLista}`}>
                  <thead>
                    <tr>
                      <Th campo="caso">{t('informe.colCaso')}</Th>
                      <Th campo="situacion">{t('informe.colSituacion')}</Th>
                      <Th campo="creado">{t('informe.colCreado')}</Th>
                      <Th campo="eventos">{t('informe.colEventos')}</Th>
                      <th scope="col"><span className="sr-only">{t('informe.verInforme')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((c) => (
                      <tr key={c.id}>
                        <td><span className={styles.chipCaso}>{c.id}</span></td>
                        <td>{c.meta?.tipoRiesgo ? textoRiesgo(t, c.meta) : '—'}</td>
                        <td className={styles.celdaFecha}>
                          {c.meta?.creadoEn
                            ? new Date(c.meta.creadoEn).toLocaleString(localeDe(lang), { dateStyle: 'medium', timeStyle: 'short' })
                            : '—'}
                        </td>
                        <td className={styles.celdaCentro}>{c.eventos}</td>
                        <td>
                          <Link href={`/servicios/${encodeURIComponent(c.id)}`} className={styles.btnFila}>
                            {t('informe.verInforme')}
                            <span aria-hidden="true">→</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </article>
      </main>
    </div>
  )
}
