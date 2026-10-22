import { fmtDuracion, fmtSeg } from './analisis'

// Detalle de una fila del registro de eventos. Antes las filas 'dibujo' salían con la
// celda vacía y los minijuegos no mostraban nada aunque analisis.js ya calcula su duración.
export function detalleEvento(e, a, t) {
  if (e.kind === 'decision') return `${e.data.prompt} → ${e.data.option_label} (${fmtSeg(e.data.time_ms)})`
  if (e.kind === 'progreso') return `${e.data.node_id} · ${t('informe.capDetalle', { n: e.data.chapter ?? '—' })}`
  if (e.kind === 'dibujo') {
    const fases = [e.data?.phase1 && '1', e.data?.phase2 && '2'].filter(Boolean)
    const elegido = e.data?.finalChoice === 'phase1' ? '1' : e.data?.finalChoice === 'phase2' ? '2' : null
    return t('informe.dibujoDetalle', {
      fases: fases.length ? fases.join(' + ') : '—',
      elegido: elegido ?? '—',
    })
  }
  if (e.kind.startsWith('minijuego')) {
    const juego = e.data?.game ?? '—'
    const duracion = a?.minijuegos?.[juego]?.duracionMs
    return duracion ? `${juego} · ${fmtDuracion(duracion)}` : juego
  }
  return ''
}
