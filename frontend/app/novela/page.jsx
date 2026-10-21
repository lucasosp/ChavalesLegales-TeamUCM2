'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Novela() {
  const router = useRouter()
  const [iframeSrc, setIframeSrc] = useState('/novela/index.html')

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      setIframeSrc(`/novela/index.html${window.location.search}`)
    }
  }, [])

  useEffect(() => {
    const handleNovelMessage = (event) => {
      const frame = document.getElementById('novela-frame')
      if (event.origin !== location.origin && !event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) return
      
      // Salir de la novela
      if (event.data?.type === 'legalinstory:exit') {
        router.push('/')
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
      <iframe id="novela-frame" title="Sara · Mi historia sigue · Aventura interactiva" src={iframeSrc} style={{ display: 'block', width: '100%', height: '100%', border: 0 }} />
    </main>
  )
}
