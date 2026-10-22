'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AvatarPage() {
  const router = useRouter()

  useEffect(() => {
    const handleNovelMessage = (event) => {
      if (event.origin !== location.origin && !event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) return
      if (event.data?.type === 'legalinstory:exit') {
        router.push('/')
        return
      }
    }
    window.addEventListener('message', handleNovelMessage)
    return () => window.removeEventListener('message', handleNovelMessage)
  }, [router])

  return (
    <main style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--verde-900)' }}>
      <iframe id="avatar-frame" title="Haz tu avatar · Chavales Legales" src="/novela/index.html?avatar=1" style={{ display: 'block', width: '100%', height: '100%', border: 0 }} />
    </main>
  )
}

