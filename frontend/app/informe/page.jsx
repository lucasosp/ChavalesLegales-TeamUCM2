'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './informe.module.css'
import { listarCasos } from '../../lib/casos'

export default function ListaInformes() {
  const [casos, setCasos] = useState(null)
  useEffect(() => {
    listarCasos().then((c) => setCasos(c.sort((a, b) => (b.meta?.creadoEn ?? '').localeCompare(a.meta?.creadoEn ?? ''))))
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link href="/profesores" className={styles.btnGhost}>← Panel</Link>
      </div>
      <article className={styles.doc}>
        <header className={styles.portada}>
          <div>
            <span className={styles.kicker}>Chavales Legales · Servicios sociales</span>
            <h1>Informes de casos</h1>
            <p className={styles.subtitulo}>Selecciona un caso para ver su informe descriptivo.</p>
          </div>
        </header>
        {!casos ? <p className={styles.pendiente}>Cargando…</p> : casos.length === 0 ? (
          <p className={styles.pendiente}>Aún no hay casos con actividad. Genera un enlace desde el panel del educador.</p>
        ) : (
          <table className={styles.tabla}>
            <thead><tr><th>Caso</th><th>Joven</th><th>Situación</th><th>Creado</th><th>Eventos</th><th /></tr></thead>
            <tbody>
              {casos.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.id}</strong></td>
                  <td>{c.meta?.nombreJoven ?? '—'}</td>
                  <td>{c.meta?.tipoRiesgo ?? '—'}</td>
                  <td>{c.meta?.creadoEn ? new Date(c.meta.creadoEn).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                  <td>{c.eventos}</td>
                  <td><Link href={`/informe/${encodeURIComponent(c.id)}`} className={styles.btn}>Ver informe</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  )
}
