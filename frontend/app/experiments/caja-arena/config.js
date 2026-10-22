// Lienzo 1600×840 (1,9:1): más ancho que el 16:9 de antes, para que el tablero
// llene el ancho de la pantalla sin pegarse a los botones de arriba.
export const VIEW = { width: 1600, height: 840 }
// La bandeja ocupa casi todo el lienzo: 36px de margen a los lados y 12px arriba.
// El área jugable es el rectángulo interior (inset), que es también el recorte de
// la escena y el borde discontinuo que se ve: ningún ecosistema se sale de él.
export const TRAY = { x: 36, y: 12, w: 1528, h: 612, inset: 34 }
export const SHELF = { y: 636, h: 186 }

export const STORAGE_KEY = 'caja_arena_sessions'
export const WEATHER_MIN_MS = 18000 // primer momento posible del evento (si ya hay algún perro)
export const WEATHER_MAX_MS = 40000 // si el niño aún no ha colocado nada, ocurre igualmente

// Contorno orgánico determinista: radio con ondulaciones suaves según el ángulo
function blob(cx, cy, rx, ry, seed, n = 18) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = 1 + 0.09 * Math.sin(a * 3 + seed) + 0.06 * Math.cos(a * 5 + seed * 2)
    return [Math.round(cx + Math.cos(a) * rx * k), Math.round(cy + Math.sin(a) * ry * k)]
  })
}

export function smoothPath(pts) {
  const n = pts.length
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`
  }
  return `${d} Z`
}

// Los radios están calculados para que cada ecosistema quepa ENTERO dentro del
// área jugable (el recorte de la bandeja): antes el bosque y las montañas se
// cortaban contra el borde y salían con el contorno plano.
export const ZONES = [
  { id: 'bosque', name: 'el bosque', cx: 360, cy: 205, pts: blob(360, 205, 240, 124, 1.2), weathers: ['tormenta', 'viento'] },
  { id: 'montana', name: 'las montañas', cx: 1250, cy: 190, pts: blob(1250, 190, 235, 118, 2.7), weathers: ['nevada', 'tormenta'] },
  { id: 'lago', name: 'el lago', cx: 800, cy: 375, pts: blob(800, 375, 175, 95, 4.1), weathers: ['tormenta'] },
  { id: 'pradera', name: 'la pradera', cx: 345, cy: 477, pts: blob(345, 477, 230, 92, 0.4), weathers: ['tormenta', 'viento'] },
  { id: 'desierto', name: 'el desierto', cx: 1255, cy: 477, pts: blob(1255, 477, 230, 92, 5.3), weathers: ['calor', 'viento'] },
]

export const WEATHER_LABEL = {
  tormenta: 'una tormenta',
  nevada: 'una gran nevada',
  viento: 'un viento muy fuerte',
  calor: 'una ola de calor',
}

function inPolygon([x, y], pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function zoneAt(x, y) {
  return ZONES.find((z) => inPolygon([x, y], z.pts))?.id ?? 'arena'
}

export function inTray(x, y) {
  const { x: tx, y: ty, w, h, inset } = TRAY
  return x > tx + inset && x < tx + w - inset && y > ty + inset + 30 && y < ty + h - inset + 6
}
