// Descarga en segundo plano lo que necesita el inicio de la novela (motor, fondos y personajes
// del capítulo 1) mientras el alumno está en la portada. Cuando pulsa "Jugar", el navegador lo
// tiene ya en caché y la historia arranca sin esperar a las imágenes.
//
// La lista (`/novela/precarga.json`) la escribe frontend/scripts/prepare-novel.mjs tras el build,
// porque los archivos de la novela llevan hash en el nombre.

let lanzada = false

export function precargarNovela() {
  if (lanzada || typeof window === 'undefined') return
  // Con "ahorro de datos" o conexión muy lenta no se gasta tráfico por adelantado.
  const red = navigator.connection
  if (red && (red.saveData || /(^|-)2g$/.test(red.effectiveType || ''))) return
  lanzada = true

  const descargar = async () => {
    try {
      const res = await fetch('/novela/precarga.json')
      if (!res.ok) return
      const { archivos } = await res.json()
      // Prioridad baja: que no compita con lo que está viendo el alumno.
      await Promise.all(
        archivos.map((url) =>
          fetch(url, { priority: 'low' })
            .then((r) => r.blob())
            .catch((err) => console.warn('[precarga] no se pudo precargar', url, err)),
        ),
      )
    } catch (err) {
      console.warn('[precarga] no se pudo leer la lista de la novela', err)
    }
  }

  const cuandoEsteLibre = () => ('requestIdleCallback' in window ? window.requestIdleCallback(descargar, { timeout: 3000 }) : setTimeout(descargar, 1500))
  if (document.readyState === 'complete') cuandoEsteLibre()
  else window.addEventListener('load', cuandoEsteLibre, { once: true })
}
