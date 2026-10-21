'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MinijuegoNubes from './MinijuegoNubes'
import { casoDesdeUrl, registrarEvento } from '../../lib/casos'

export default function Novela() {
  const router = useRouter()
  const [minijuego, setMinijuego] = useState(null)
  const jugadosRef = useRef(new Set())
  const casoRef = useRef('DEMO')
  const dibujoRef = useRef(null)

  // Instantánea del dibujo del avatar (lo guarda la novela en este mismo origen)
  const sincronizarDibujo = () => {
    try {
      const raw = localStorage.getItem('legalinstory_avatar_drawings')
      if (raw && raw !== dibujoRef.current) {
        dibujoRef.current = raw
        registrarEvento(casoRef.current, 'dibujo', JSON.parse(raw))
      }
    } catch {}
  }

  useEffect(() => {
    casoRef.current = casoDesdeUrl()
    registrarEvento(casoRef.current, 'inicio', { userAgent: navigator.userAgent, pantalla: `${innerWidth}x${innerHeight}` })
    const salir = () => registrarEvento(casoRef.current, 'salida')
    window.addEventListener('pagehide', salir)
    return () => {
      window.removeEventListener('pagehide', salir)
      salir()
    }
  }, [])

  const avisarFin = (game) => {
    document.getElementById('novela-frame')?.contentWindow?.postMessage({ type: 'legalinstory:minigame-done', game }, location.origin)
  }

  useEffect(() => {
    const handleNovelMessage = (event) => {
      const frame = document.getElementById('novela-frame')
      if (event.origin !== location.origin || event.source !== frame?.contentWindow) return
      
      // Salir de la novela
      if (event.data?.type === 'legalinstory:exit') {
        router.push('/')
        return
      }

      if (event.data?.type === 'legalinstory:progress') {
        const { node_id, chapter, node_type } = event.data
        registrarEvento(casoRef.current, 'progreso', { node_id, chapter, node_type })
        sincronizarDibujo()
        return
      }

      // Minijuego dentro de la historia: cada uno se juega una sola vez por partida
      if (event.data?.type === 'legalinstory:minigame') {
        const { game, text } = event.data
        if (!jugadosRef.current.has(game)) registrarEvento(casoRef.current, 'minijuego-inicio', { game })
        if (jugadosRef.current.has(game)) avisarFin(game)
        else {
          jugadosRef.current.add(game)
          setMinijuego({ game, text })
        }
        return
      }

      // Registro de decisión y tiempo de los niños en la novela
      if (event.data?.type === 'legalinstory:decision') {
        try {
          const decision = event.data
          registrarEvento(casoRef.current, 'decision', decision)
          // Guardar copia local en localStorage para redundancia
          const localStored = localStorage.getItem('chavales_telemetria_decisiones')
          const list = localStored ? JSON.parse(localStored) : []
          list.unshift(decision)
          if (list.length > 500) list.pop()
          localStorage.setItem('chavales_telemetria_decisiones', JSON.stringify(list))

          // Enviar al backend si no se hubiera enviado ya
          fetch('/api/telemetria/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(decision),
          }).catch(() => {})
        } catch (e) {
          console.warn('[Novela] Error al registrar telemetría:', e)
        }
      }
    }
    window.addEventListener('message', handleNovelMessage)
    return () => window.removeEventListener('message', handleNovelMessage)
  }, [router])

  return (
    <main style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#461020' }}>
      <iframe id="novela-frame" title="Sara · Mi historia sigue · Aventura interactiva" src="/novela/index.html" style={{ display: 'block', width: '100%', height: '100%', border: 0 }} />
      {minijuego && (
        <MinijuegoNubes
          key={minijuego.game}
          game={minijuego.game}
          text={minijuego.text}
          onDone={(report) => {
            registrarEvento(casoRef.current, 'minijuego', { game: minijuego.game, report: report ?? null })
            avisarFin(minijuego.game)
            setMinijuego(null)
          }}
        />
      )}
    </main>
  )
}
