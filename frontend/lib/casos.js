// Registro por caso para el informe de servicios sociales.
// Se guarda en el backend y, como respaldo, en este navegador (por si la API no está disponible).

const localKey = (id) => `chavales_caso_${id}`

function leerLocal(id) {
  try {
    return JSON.parse(localStorage.getItem(localKey(id))) || { id, meta: {}, eventos: [] }
  } catch {
    return { id, meta: {}, eventos: [] }
  }
}

function escribirLocal(caso) {
  try {
    localStorage.setItem(localKey(caso.id), JSON.stringify(caso))
  } catch {
    // Cuota llena (p. ej. por imágenes): se conserva lo que ya había
  }
}

export function casoDesdeUrl() {
  if (typeof window === 'undefined') return 'DEMO'
  return new URLSearchParams(location.search).get('caso') || 'DEMO'
}

export function guardarMetaCaso(id, meta) {
  const caso = leerLocal(id)
  caso.meta = { ...caso.meta, ...meta }
  escribirLocal(caso)
  fetch(`/api/casos/${encodeURIComponent(id)}/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  }).catch(() => {})
}

export function registrarEvento(id, kind, data = {}) {
  const evento = { kind, t: Date.now(), data }
  const caso = leerLocal(id)
  if (kind === 'dibujo') caso.eventos = caso.eventos.filter((e) => e.kind !== 'dibujo')
  caso.eventos.push(evento)
  escribirLocal(caso)
  fetch(`/api/casos/${encodeURIComponent(id)}/eventos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evento),
  }).catch(() => {})
}

export async function cargarCaso(id) {
  const local = leerLocal(id)
  try {
    const r = await fetch(`/api/casos/${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (r.ok) {
      const remoto = await r.json()
      // Se usa la fuente con más eventos; los metadatos se combinan
      const base = remoto.eventos.length >= local.eventos.length ? remoto : local
      return { ...base, meta: { ...local.meta, ...remoto.meta }, fuente: base === remoto ? 'servidor' : 'navegador' }
    }
  } catch {}
  return { ...local, fuente: 'navegador' }
}

export async function listarCasos() {
  const locales = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k.startsWith('chavales_caso_')) {
        const c = JSON.parse(localStorage.getItem(k))
        locales.push({ id: c.id, meta: c.meta, eventos: c.eventos.length })
      }
    }
  } catch {}
  try {
    const r = await fetch('/api/casos', { cache: 'no-store' })
    if (r.ok) {
      const remotos = await r.json()
      const ids = new Set(remotos.map((c) => c.id))
      return [...remotos, ...locales.filter((c) => !ids.has(c.id))]
    }
  } catch {}
  return locales
}
