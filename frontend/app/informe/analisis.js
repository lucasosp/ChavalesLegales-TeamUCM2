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

export function analizar(caso) {
  const eventos = [...(caso?.eventos ?? [])].sort((a, b) => a.t - b.t)
  const inicio = eventos.find((e) => e.kind === 'inicio')?.t ?? eventos[0]?.t ?? null
  const ultimo = eventos.at(-1)?.t ?? null

  // Historia: decisiones y su latencia
  const decisiones = eventos.filter((e) => e.kind === 'decision').map((e) => ({ ...e.data, t: e.t }))
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
    const siguiente = progreso[i + 1]?.t
    if (siguiente && tipo !== 'external') {
      const dt = siguiente - e.t
      if (dt > PAUSA_LARGA_MS) pausasLargas++
      capitulos[cap].lecturaMs += Math.min(dt, TOPE_LECTURA_MS)
    }
  })
  decisiones.forEach((d) => capitulos[d.chapter ?? 0] && capitulos[d.chapter ?? 0].decisiones++)

  // Minijuegos: último informe de cada uno y su duración
  const minijuegos = {}
  eventos.filter((e) => e.kind === 'minijuego').forEach((e) => {
    const ini = [...eventos].reverse().find((x) => x.kind === 'minijuego-inicio' && x.data.game === e.data.game && x.t <= e.t)
    minijuegos[e.data.game] = { ...e.data, duracionMs: ini ? e.t - ini.t : null, t: e.t }
  })

  const dibujo = [...eventos].reverse().find((e) => e.kind === 'dibujo')?.data ?? null
  const terminado = progreso.some((e) => e.data.node_type === 'ending')

  return {
    inicio,
    ultimo,
    duracionMs: inicio && ultimo ? ultimo - inicio : 0,
    // Accesos separados por más de 5 s (el modo desarrollo monta la página dos veces)
    sesiones: eventos.filter((e) => e.kind === 'inicio').filter((e, i, xs) => !i || e.t - xs[i - 1].t > 5000).length,
    terminado,
    decisiones,
    latencia: { mediana: med, media: media(tiempos), sd, min: tiempos.length ? Math.min(...tiempos) : null, max: tiempos.length ? Math.max(...tiempos) : null },
    capitulos: Object.values(capitulos).filter((c) => c.capitulo).sort((a, b) => a.capitulo - b.capitulo),
    pantallasVistas: vistos.size,
    relecturas,
    pausasLargas,
    minijuegos,
    dibujo,
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
