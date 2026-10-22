'use client'

import styles from './informe.module.css'
import { useT } from '../../lib/i18n'

export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export function Nota({ titulo, children }) {
  const t = useT()
  return (
    <details className={styles.nota}>
      <summary>{titulo ?? t('informe.notaTitulo')}</summary>
      <div>{children}</div>
    </details>
  )
}


export function Seccion({ numero, titulo, sub, children }) {
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

export function Pendiente({ texto }) {
  return <p className={styles.pendiente}>{texto}</p>
}
