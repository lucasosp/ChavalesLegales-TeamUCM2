'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AsistentesSocialesRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/informe')
  }, [router])

  return null
}

