// Arranca `next dev` con la telemetría desactivada y el puerto comprobado.
//
// Sin NEXT_TELEMETRY_DISABLED, en una máquina sin salida a internet (o con DNS lento) el
// proceso se queda colgado en "Starting..." durante minutos: no compila ninguna ruta, el
// navegador recibe timeouts o 404s y parece que el proyecto está roto. Con la variable puesta
// arranca en menos de un segundo.
//
// El puerto se comprueba ANTES de arrancar y, si está ocupado, el proceso sale con error en
// vez de dejar que Next se mueva al siguiente libre. Importa: dos `next dev` sobre el mismo
// `.next` se pisan la caché (manifiestos de rutas sin sus chunks de servidor) y el navegador
// empieza a ver 404 en páginas que existen, sin ningún error en consola. Si esto salta, el
// arreglo es `npm run clean` y volver a arrancar.
import { spawn } from 'node:child_process'
import net from 'node:net'

const PUERTO_POR_DEFECTO = 3000

// Los argumentos se pasan tal cual, así que `npm run dev -- -p 3000` sigue funcionando.
const args = process.argv.slice(2)

function puertoPedido(lista) {
  for (let i = 0; i < lista.length; i += 1) {
    const arg = lista[i]
    if (arg === '-p' || arg === '--port' || arg === '-p=' || arg === '--port=') {
      const valor = Number(lista[i + 1])
      if (Number.isInteger(valor) && valor > 0) return valor
    }
    if (arg.startsWith('--port=')) {
      const valor = Number(arg.slice('--port='.length))
      if (Number.isInteger(valor) && valor > 0) return valor
    }
    if (arg.startsWith('-p=')) {
      const valor = Number(arg.slice(3))
      if (Number.isInteger(valor) && valor > 0) return valor
    }
  }
  return PUERTO_POR_DEFECTO
}

// true si hay algo escuchando (o el puerto está tomado) en localhost
function puertoOcupado(puerto) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: puerto, host: '127.0.0.1' })
    const fin = (ocupado) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(ocupado)
    }
    socket.setTimeout(700)
    socket.once('connect', () => fin(true))
    socket.once('timeout', () => fin(true))
    socket.once('error', (err) => fin(err.code === 'EADDRINUSE'))
  })
}

const puerto = puertoPedido(args)

if (await puertoOcupado(puerto)) {
  console.error(
    `\n✖ El puerto ${puerto} ya está ocupado: parece que hay otro \`next dev\` vivo.\n` +
      '  Dos servidores de desarrollo sobre la misma carpeta .next se pisan la caché y\n' +
      '  aparecen 404 en páginas que existen (por ejemplo /servicios).\n\n' +
      `  Arréglalo así:  npm run clean   (para los procesos y borra .next)\n` +
      `  o usa otra caché:  NEXT_DIST_DIR=.next-${puerto + 1} npm run dev -- -p ${puerto + 1}\n`,
  )
  process.exit(1)
}

const hijo = spawn('next', ['dev', '-p', String(puerto), ...args], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  // En Windows `next` es un .cmd: necesita shell para resolverse.
  shell: process.platform === 'win32',
})

hijo.on('exit', (codigo, senal) => {
  if (senal) process.kill(process.pid, senal)
  else process.exit(codigo ?? 0)
})
