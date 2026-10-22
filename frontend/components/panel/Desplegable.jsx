'use client'

import { useEffect, useId, useRef, useState } from 'react'
import styles from './desplegable.module.css'

/**
 * Desplegable con el lenguaje visual de la web (panel blanco, trazo de tinta,
 * esquinas irregulares y placa desplazada). Sustituye al <select> nativo cuando
 * hace falta que la lista se vea como el resto.
 *
 * Accesible: botón con aria-haspopup/aria-expanded, lista con role="listbox" y
 * navegación por teclado (flechas, Inicio/Fin, Enter/Espacio, Escape, Tab).
 */
export default function Desplegable({
  id,
  valor,
  opciones,
  onChange,
  disabled = false,
  ariaLabel,
}) {
  const idAuto = useId()
  const listaId = `${id || idAuto}-lista`
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const caja = useRef(null)
  const disparador = useRef(null)
  const lista = useRef(null)

  const indiceValor = Math.max(0, opciones.findIndex((o) => o.value === valor))
  const seleccion = opciones[indiceValor] ?? opciones[0]

  // Al abrir: foco en la lista y arranque en la opción elegida
  useEffect(() => {
    if (!abierto) return
    setActivo(indiceValor)
    const t = setTimeout(() => lista.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [abierto, indiceValor])

  // Cerrar al pulsar fuera
  useEffect(() => {
    if (!abierto) return
    const fuera = (e) => {
      if (caja.current && !caja.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [abierto])

  const elegir = (i) => {
    const op = opciones[i]
    if (!op) return
    onChange(op.value)
    setAbierto(false)
    disparador.current?.focus()
  }

  const alTeclearDisparador = (e) => {
    if (disabled) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setAbierto(true)
    }
  }

  const alTeclearLista = (e) => {
    const ultimo = opciones.length - 1
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActivo((i) => Math.min(i + 1, ultimo))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActivo((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setActivo(0)
        break
      case 'End':
        e.preventDefault()
        setActivo(ultimo)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        elegir(activo)
        break
      case 'Escape':
        e.preventDefault()
        setAbierto(false)
        disparador.current?.focus()
        break
      case 'Tab':
        setAbierto(false)
        break
      default:
        break
    }
  }

  return (
    <div className={styles.caja} ref={caja}>
      <button
        type="button"
        id={id}
        ref={disparador}
        className={`${styles.disparador} ${abierto ? styles.disparadorAbierto : ''}`}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={alTeclearDisparador}
      >
        <span className={styles.valor}>{seleccion?.label}</span>
        <span className={styles.flecha} aria-hidden="true">
          ▾
        </span>
      </button>

      {abierto && (
        <ul
          id={listaId}
          ref={lista}
          className={styles.lista}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${listaId}-${activo}`}
          onKeyDown={alTeclearLista}
        >
          {opciones.map((op, i) => (
            <li
              key={op.value}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={op.value === valor}
              className={`${styles.opcion} ${i === activo ? styles.opcionActiva : ''} ${
                op.value === valor ? styles.opcionElegida : ''
              }`}
              onMouseEnter={() => setActivo(i)}
              onClick={() => elegir(i)}
            >
              <span>{op.label}</span>
              {op.value === valor && (
                <span className={styles.marca} aria-hidden="true">
                  ✓
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
