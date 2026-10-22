// Registro por caso: metadatos de la sesión y eventos que alimentan /informe/[caso].
// Todo va al backend. No hay espejo en localStorage (D11: la app asume conexión),
// así que un fallo de red se ve en vez de disfrazarse de "datos viejos".

export function casoDesdeUrl() {
  if (typeof window === 'undefined') return 'DEMO'
  return new URLSearchParams(location.search).get('caso') || 'DEMO'
}

/**
 * Crea o actualiza el caso en el backend.
 * Lanza si el backend no confirma: el educador NO debe repartir un código que no existe.
 */
export async function guardarMetaCaso(id, meta) {
  const res = await fetch(`/api/casos/${encodeURIComponent(id)}/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  })
  if (!res.ok) {
    throw new Error(`No se pudo crear el caso (HTTP ${res.status})`)
  }
  return res.json()
}

/**
 * Añade un evento al caso. No lanza (se llama desde callbacks de postMessage donde
 * no hay nadie esperando), pero deja rastro en consola en vez de fallar en silencio.
 * El primer evento puede crear el caso si el meta aún no llegó.
 */
export async function registrarEvento(id, kind, data = {}) {
  const evento = { kind, t: Date.now(), data }
  try {
    const res = await fetch(`/api/casos/${encodeURIComponent(id)}/eventos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evento),
    })
    if (!res.ok) console.warn(`[casos] evento "${kind}" rechazado (HTTP ${res.status})`, id)
  } catch (err) {
    console.warn(`[casos] no se pudo registrar el evento "${kind}"`, id, err)
  }
}

/**
 * Versión ligera para sondear el informe: { id, eventos, ultimo, schemaVersion }.
 * Devuelve null si no se puede consultar, para que el sondeo no machaque el informe con un error.
 */
export async function resumenCaso(id) {
  try {
    const res = await fetch(`/api/casos/${encodeURIComponent(id)}/resumen`, { cache: 'no-store' })
    if (res.ok) return await res.json()
    if (res.status !== 404) console.warn(`[casos] error ${res.status} al sondear el caso`, id)
  } catch (err) {
    console.warn('[casos] no se pudo sondear el caso', id, err)
  }
  return null
}

/** Carga un caso para el informe. Devuelve un caso vacío marcado si falla. */
export async function cargarCaso(id) {
  try {
    const res = await fetch(`/api/casos/${encodeURIComponent(id)}`, { cache: 'no-store' })
    if (res.ok) {
      return { ...(await res.json()), fuente: 'servidor' }
    }
    if (res.status !== 404) {
      console.warn(`[casos] error ${res.status} al cargar el caso`, id)
      return { id, meta: {}, eventos: [], fuente: 'error', error: res.status }
    }
  } catch (err) {
    console.warn('[casos] no se pudo cargar el caso', id, err)
    return { id, meta: {}, eventos: [], fuente: 'error', error: 'red' }
  }
  return { id, meta: {}, eventos: [], fuente: 'inexistente' }
}

export async function listarCasos() {
  try {
    const res = await fetch('/api/casos', { cache: 'no-store' })
    if (res.ok) return await res.json()
    console.warn(`[casos] error ${res.status} al listar los casos`)
  } catch (err) {
    console.warn('[casos] no se pudo listar los casos', err)
  }
  return []
}
