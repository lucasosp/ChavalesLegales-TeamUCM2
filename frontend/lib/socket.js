/**
 * Helper para gestión de WebSockets en cliente con soporte de despliegue en producción.
 */

export function getWsBaseUrl() {
  // 1. Variable de entorno explícita (útil si el backend está en un dominio separado en producción)
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, '')
  }

  // 2. En el navegador, deducir según window.location
  if (typeof window !== 'undefined') {
    // Si la app está en localhost:3000 y el backend corre en localhost:8000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'ws://localhost:8000'
    }

    // En producción desplegada (HTTPS -> WSS, HTTP -> WS)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}`
  }

  return 'ws://localhost:8000'
}

export function createGameSocket({ url, onMessage, onOpen, onClose, onError }) {
  let ws = null
  let pingInterval = null
  let isClosedManually = false
  const sendQueue = []

  function connect() {
    try {
      ws = new WebSocket(url)

      ws.onopen = (e) => {
        // Enviar mensajes en cola acumulados antes de completar la conexión
        while (sendQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
          const queued = sendQueue.shift()
          ws.send(JSON.stringify(queued))
        }

        // Enviar ping cada 15 segundos para evitar que proxies cierren la conexión
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'PING' }))
          }
        }, 15000)
        if (onOpen) onOpen(e)
      }

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.event === 'PONG') return
          if (onMessage) onMessage(data)
        } catch {
          // Mensaje no JSON ignorado
        }
      }

      ws.onclose = (e) => {
        if (pingInterval) clearInterval(pingInterval)
        if (onClose) onClose(e)

        // Intento de reconexión si no fue cierre manual
        if (!isClosedManually) {
          setTimeout(() => {
            if (!isClosedManually) connect()
          }, 2500)
        }
      }

      ws.onerror = (e) => {
        if (onError) onError(e)
      }
    } catch (err) {
      if (onError) onError(err)
    }
  }

  connect()

  return {
    send: (action, payload = {}) => {
      const message = { action, ...payload }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
        return true
      }
      // Encolar si todavía está conectando
      if (!ws || ws.readyState === WebSocket.CONNECTING) {
        sendQueue.push(message)
        return true
      }
      return false
    },
    close: () => {
      isClosedManually = true
      if (pingInterval) clearInterval(pingInterval)
      if (ws) ws.close()
    },
  }
}
