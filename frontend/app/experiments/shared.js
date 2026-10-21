'use client'

import { useRef } from 'react'

export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function downloadJson(data, prefix) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${prefix}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Pulsación larga: el panel del profesional no se abre con un toque accidental del niño
export function useLongPress(onLongPress, ms = 1200) {
  const timer = useRef(null)
  const cancel = () => clearTimeout(timer.current)
  return {
    onPointerDown: () => {
      cancel()
      timer.current = setTimeout(onLongPress, ms)
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e) => e.preventDefault(),
  }
}
