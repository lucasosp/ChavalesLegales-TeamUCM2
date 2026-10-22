const API_URL = process.env.API_URL || 'http://localhost:8000'

// `next dev` y `next build` comparten carpeta de salida por defecto (.next). Si se lanza un
// build mientras hay un dev vivo, el dev pierde su caché y sirve 404s hasta recompilarlo todo.
// Con NEXT_DIST_DIR se pueden separar (npm run build:check) sin tocar el flujo normal.
const distDir = process.env.NEXT_DIST_DIR || '.next'

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  async redirects() {
    return [
      {
        source: '/necesito-ayuda',
        destination: '/',
        permanent: false,
      },
      // El informe vive en /servicios desde el renombrado; la ruta antigua solo
      // redirige para no romper enlaces ya compartidos.
      {
        source: '/informe',
        destination: '/servicios',
        permanent: false,
      },
      {
        source: '/informe/:caso',
        destination: '/servicios/:caso',
        permanent: false,
      },
      // La entrada por código vive ahora en la portada; la ruta antigua solo redirige.
      {
        source: '/alumno',
        destination: '/',
        permanent: false,
      },
    ]
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }]
  },
}

export default nextConfig
