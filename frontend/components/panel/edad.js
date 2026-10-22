// Edad del menor en el formulario de generación del caso.
//
// El contenido de la plataforma está pensado para 5–18 años, así que el rango es cerrado:
// fuera de ahí el trabajador social no puede generar el caso. El campo solo admite dígitos (nada de
// signos, decimales ni la "e" que acepta <input type="number"> en algunos navegadores).
export const EDAD_MIN = 5
export const EDAD_MAX = 18

/** Deja solo dígitos y como mucho dos, sin ceros a la izquierda ("05" -> "5"). */
export function soloDigitos(valor) {
  return String(valor ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 2)
}

/** true solo si es un entero dentro de [EDAD_MIN, EDAD_MAX]. */
export function edadValida(edad) {
  const n = Number(edad)
  return Number.isInteger(n) && n >= EDAD_MIN && n <= EDAD_MAX
}
