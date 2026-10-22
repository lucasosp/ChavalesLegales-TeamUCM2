'use client'

import Link from 'next/link'
import styles from './barra.module.css'
import SelectorIdioma from './SelectorIdioma'

/**
 * Barra superior común al informe (servicios) y al panel del trabajador social:
 * "volver" pegado al borde izquierdo, el rótulo mini de Chavales Legales en el
 * centro y el selector de idioma pegado al borde derecho. La barra ocupa todo
 * el ancho; el contenido de debajo es el que se limita a 1280px.
 *
 * `acciones` es un hueco para enlaces propios de la pantalla (p. ej. "Ver
 * informes" en el panel); van antes del selector de idioma.
 */
export default function Barra({ href, texto, acciones = null }) {
  return (
    <header className={`${styles.barra} ${acciones ? styles.barraConAcciones : ''}`}>
      <Link href={href} className="btn-back-home">{texto}</Link>

      {/* Versión mini del rótulo de la portada: CHAVAL / LEGAL en dos líneas y
          el sufijo ES al doble, como el logotipo grande. Es un enlace a la
          portada, así que el nombre va en el aria-label del enlace. */}
      <Link href="/" className={styles.marcaEnlace} aria-label="Chavales Legales · Inicio">
        <span className={styles.marca} aria-hidden="true">
          <span className={styles.marcaPalabras}>
            <span className={styles.marcaAmbar}>CHAVAL</span>
            <span className={styles.marcaAmbar}>LEGAL</span>
          </span>
          <span className={styles.marcaVerde}>ES</span>
        </span>
      </Link>

      <div className={styles.derecha}>
        {acciones}
        <SelectorIdioma />
      </div>
    </header>
  )
}
