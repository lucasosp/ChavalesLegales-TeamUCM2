'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Novela() {
  const router = useRouter()
  useEffect(() => {
    const exit = (event) => {
      const frame = document.getElementById('novela-frame')
      if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === 'legalinstory:exit') router.push('/')
    }
    window.addEventListener('message', exit)
    return () => window.removeEventListener('message', exit)
  }, [router])

  return (
    <main style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#461020' }}>
      <iframe id="novela-frame" title="Sara · Mi historia sigue · Aventura interactiva" src="/novela/index.html" style={{ display: 'block', width: '100%', height: '100%', border: 0 }} />
    </main>
  )
}
