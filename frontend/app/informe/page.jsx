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
            <h1 className={styles.brandTitle}>Directorio de Casos</h1>
          </div>
        </div>

        <div className={styles.topActions}>
          <Link href="/profesores" className={styles.btnTopBack}>
            ← Panel Educador
          </Link>
          <Link href="/" className={styles.btnTop}>
            Portal Principal
          </Link>
        </div>
      </header>

      <main className={styles.mainContainer}>
        <section className={styles.headerCard}>
          <div className={styles.headerLeft}>
            <span className={styles.kicker}>Área técnica y seguimiento</span>
            <h1>Casos e Informes Descriptivos</h1>
            <p className={styles.subtitulo}>
              Selecciona un caso para examinar su informe pormenorizado, cronometría de decisiones y pruebas proyectivas.
            </p>
          </div>
        </section>

        <section className={styles.seccionCard}>
          {!casos ? (
            <p className={styles.cargando}>Cargando directorio de casos…</p>
          ) : casos.length === 0 ? (
            <p className={styles.pendiente}>Aún no hay casos con actividad registrada. Genera un enlace desde el panel de educadores o inicia una sesión en la novela.</p>
          ) : (
            <div className={styles.tablaWrap}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Identificador</th>
                    <th>Joven / Apodo</th>
                    <th>Situación / Riesgo</th>
                    <th>Fecha de Registro</th>
                    <th>Actividad</th>
                    <th style={{ textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {casos.map((c) => (
                    <tr key={c.id}>
                      <td><strong style={{ color: '#064e3b' }}>{c.id}</strong></td>
                      <td><strong>{c.meta?.nombreJoven ?? '—'}</strong></td>
                      <td>{c.meta?.tipoRiesgo ?? '—'}</td>
                      <td>{c.meta?.creadoEn ? new Date(c.meta.creadoEn).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
                      <td><span className={styles.badge} style={{ background: '#f1f5f9', color: '#1e293b', borderColor: '#cbd5e1' }}>{c.eventos} eventos</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <Link href={`/informe/${encodeURIComponent(c.id)}`} className={styles.btnTopExport} style={{ textDecoration: 'none', display: 'inline-flex' }}>
                          Abrir informe →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
