'use client'

import { useT } from '../../lib/i18n'

// Traduce una clave del espacio informe; si no existe, devuelve el texto original guardado
export function useTr() {
  const t = useT()
  return (clave, respaldo, vars) => {
    const k = `informe.${clave}`
    const s = t(k, vars)
    return s === k ? respaldo : s
  }
}
