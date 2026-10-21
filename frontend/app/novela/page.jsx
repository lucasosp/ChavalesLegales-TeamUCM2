'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MinijuegoNubes from './MinijuegoNubes'

export default function Novela() {
  const router = useRouter()
  const [minijuego, setMinijuego] = useState(null)
  const jugadosRef = useRef(new Set())

  const avisarFin = (game) => {
    document.getElementById('novela-frame')?.contentWindow?.postMessage({ type: 'legalinstory:minigame-done', game }, location.origin)
  }

  useEffect(() => {
    const handleNovelMessage = (event) => {
      const frame = document.getElementById('novela-frame')
      if (event.origin !== location.origin && !event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) return
      
      // Salir de la novela
      if (event.data?.type === 'legalinstory:exit') {
        router.push('/')
        return
      }

      // Minijuego dentro de la historia: cada uno se juega una sola vez por partida
      if (event.data?.type === 'legalinstory:minigame') {
        const { game, text } = event.data
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
          onDone={() => {
            avisarFin(minijuego.game)
            setMinijuego(null)
          }}
        />
      )}
    </main>
  )
}
