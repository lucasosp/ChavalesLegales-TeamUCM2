// Cálculo descriptivo de métricas a partir de los eventos del caso. No emite valoraciones.

const PAUSA_LARGA_MS = 60000
const TOPE_LECTURA_MS = 120000

export const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
export function mediana(xs) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
export function desviacion(xs) {
  const m = media(xs)
  return xs.length > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)) : 0
}

// Reloj a usar: el del servidor cuando existe (esquema 2+). El `t` del cliente solo se usa
// como respaldo en casos antiguos, porque un reloj mal puesto o una pestaña suspendida
// corrompen todas las duraciones del informe.
export const tEvento = (e) => (typeof e?.t_servidor === 'number' ? e.t_servidor : e?.t)

// Desfase entre el reloj del cliente y el del servidor. Si es grande, las duraciones medidas
// en el navegador (latencia de decisión, tiempo de dibujo) no son fiables.
function desfaseRelojes(eventos, umbralMs = 5000) {
  const pares = eventos
    .filter((e) => typeof e?.t === 'number' && typeof e?.t_servidor === 'number')
    .map((e) => e.t_servidor - e.t)
  if (!pares.length) return { medianaMs: null, maxMs: null, fiable: true, medido: false }
  const medianaMs = mediana(pares)
  const maxMs = Math.max(...pares.map(Math.abs))
  return { medianaMs, maxMs, fiable: maxMs <= umbralMs, medido: true }
}

export function analizar(caso) {
  const eventos = [...(caso?.eventos ?? [])].sort((a, b) => tEvento(a) - tEvento(b))
  const inicio = tEvento(eventos.find((e) => e.kind === 'inicio')) ?? tEvento(eventos[0]) ?? null
  const ultimo = tEvento(eventos.at(-1)) ?? null

  // Historia: decisiones y su latencia
  const decisiones = eventos.filter((e) => e.kind === 'decision').map((e) => ({ ...e.data, t: tEvento(e) }))
  const tiempos = decisiones.map((d) => d.time_ms).filter(Number.isFinite)
  const med = mediana(tiempos)
  const sd = desviacion(tiempos)
  decisiones.forEach((d) => {
    d.relativa = med ? d.time_ms / med : null
    d.destacada = med !== null && tiempos.length >= 3 && d.time_ms > med * 1.75
  })

  // Lectura: tiempo en cada pantalla hasta la siguiente, relecturas y pausas
  const progreso = eventos.filter((e) => e.kind === 'progreso')
  const vistos = new Set()
  const capitulos = {}
  let relecturas = 0
  let pausasLargas = 0
  progreso.forEach((e, i) => {
    const { node_id: id, chapter, node_type: tipo } = e.data
    const cap = chapter ?? 0
    capitulos[cap] ??= { capitulo: cap, lecturaMs: 0, pantallas: 0, relecturas: 0, decisiones: 0 }
    if (vistos.has(id)) {
      relecturas++
      capitulos[cap].relecturas++
    }
    vistos.add(id)
    capitulos[cap].pantallas++
    const siguiente = tEvento(progreso[i + 1])
    if (siguiente && tipo !== 'external') {
      const dt = siguiente - tEvento(e)
      if (dt > PAUSA_LARGA_MS) pausasLargas++
      capitulos[cap].lecturaMs += Math.min(dt, TOPE_LECTURA_MS)
    }
  })
  decisiones.forEach((d) => capitulos[d.chapter ?? 0] && capitulos[d.chapter ?? 0].decisiones++)

  // Minijuegos: último informe de cada uno y su duración
  const minijuegos = {}
  eventos.filter((e) => e.kind === 'minijuego').forEach((e) => {
    const t = tEvento(e)
    const ini = [...eventos].reverse().find((x) => x.kind === 'minijuego-inicio' && x.data.game === e.data.game && tEvento(x) <= t)
    minijuegos[e.data.game] = { ...e.data, duracionMs: ini ? t - tEvento(ini) : null, t }
  })

  const dibujo = [...eventos].reverse().find((e) => e.kind === 'dibujo')?.data ?? null
  const terminado = progreso.some((e) => e.data.node_type === 'ending')

  return {
    inicio,
    ultimo,
    duracionMs: inicio && ultimo ? ultimo - inicio : 0,
    // Accesos separados por más de 5 s (el modo desarrollo monta la página dos veces)
    sesiones: eventos.filter((e) => e.kind === 'inicio').filter((e, i, xs) => !i || tEvento(e) - tEvento(xs[i - 1]) > 5000).length,
    terminado,
    decisiones,
    latencia: { mediana: med, media: media(tiempos), sd, min: tiempos.length ? Math.min(...tiempos) : null, max: tiempos.length ? Math.max(...tiempos) : null },
    capitulos: Object.values(capitulos).filter((c) => c.capitulo).sort((a, b) => a.capitulo - b.capitulo),
    pantallasVistas: vistos.size,
    relecturas,
    pausasLargas,
    minijuegos,
    dibujo,
    desfase: desfaseRelojes(eventos),
    eventos,
  }
}

export const fmtSeg = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`)
export function fmtDuracion(ms) {
  if (!ms) return '—'
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`
}
// Locale BCP 47 para formatear fechas según el idioma activo de la interfaz
const LOCALES = { es: 'es-ES', ca: 'ca-ES', va: 'ca-ES', gl: 'gl-ES', eu: 'eu-ES', oc: 'oc' }
export const localeDe = (lang) => LOCALES[lang] ?? 'es-ES'
export const fmtFecha = (t, lang = 'es') => (t ? new Date(t).toLocaleString(localeDe(lang), { dateStyle: 'long', timeStyle: 'short' }) : '—')
