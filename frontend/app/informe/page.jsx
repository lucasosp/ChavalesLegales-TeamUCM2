'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './informe.module.css'
import { listarCasos } from '../../lib/casos'
import { useI18n } from '../../lib/i18n'
import { localeDe } from './analisis'

// El caso guarda el id del riesgo; el texto se resuelve en la lengua del lector.
const textoRiesgo = (t, meta) =>
  meta?.tipoRiesgoId ? t(`profesores.riesgo_${meta.tipoRiesgoId}`) : meta?.tipoRiesgo

export default function ListaInformes() {
  const { t, lang } = useI18n()
  const [casos, setCasos] = useState(null)
  useEffect(() => {
    listarCasos().then((c) => setCasos(c.sort((a, b) => (b.meta?.creadoEn ?? '').localeCompare(a.meta?.creadoEn ?? ''))))
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <Link href="/profesores" className={styles.btnTopBack}>{t('informe.volverPanel')}</Link>
      </div>
      <article className={styles.mainContainer}>
        <header className={styles.headerCard}>
          <div>
            <span className={styles.kicker}>{t('informe.kickerLista')}</span>
            <h1>{t('informe.tituloLista')}</h1>
            <p className={styles.subtitulo}>{t('informe.subLista')}</p>
          </div>
        </header>
        {!casos ? <p className={styles.pendiente}>{t('informe.cargando')}</p> : casos.length === 0 ? (
          <p className={styles.pendiente}>{t('informe.sinCasos')}</p>
        ) : (
          <table className={styles.tabla}>
            <thead><tr><th>{t('informe.colCaso')}</th><th>{t('informe.colJoven')}</th><th>{t('informe.colSituacion')}</th><th>{t('informe.colCreado')}</th><th>{t('informe.colEventos')}</th><th /></tr></thead>
            <tbody>
              {casos.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.id}</strong></td>
                  <td>{c.meta?.nombreJoven ?? '—'}</td>
                  <td>{c.meta?.tipoRiesgo ? textoRiesgo(t, c.meta) : '—'}</td>
                  <td>{c.meta?.creadoEn ? new Date(c.meta.creadoEn).toLocaleString(localeDe(lang), { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td>{c.eventos}</td>
                  <td><Link href={`/informe/${encodeURIComponent(c.id)}`} className={styles.btnTop}>{t('informe.verInforme')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  )
}
