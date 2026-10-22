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
  // Caché del navegador. Sin esto, lo que vive en public/ sale con max-age=0 y se vuelve a
  // pedir entero en cada visita (la novela publicada son varios MB de imágenes).
  async headers() {
    const cache = (valor) => [{ key: 'Cache-Control', value: valor }]
    return [
      // Si dos reglas coinciden, gana la última: primero la general y después la específica.
      // Imágenes de la novela (unas con hash y otras copiadas tal cual de public/): un día
      // sin preguntar y una semana sirviendo la copia mientras se revalida.
      { source: '/novela/assets/:path*', headers: cache('public, max-age=86400, stale-while-revalidate=604800') },
      // JS y CSS de la novela: Vite les pone hash en el nombre, así que no cambian nunca.
      { source: '/novela/assets/:file(.+\\.(?:js|css))', headers: cache('public, max-age=31536000, immutable') },
      // Historias y textos: cambian al desplegar, pero no entre dos visitas seguidas.
      { source: '/novela/content/:path*', headers: cache('public, max-age=300, stale-while-revalidate=3600') },
      { source: '/fonts/:path*', headers: cache('public, max-age=31536000, immutable') },
      { source: '/flags/:path*', headers: cache('public, max-age=2592000, stale-while-revalidate=86400') },
    ]
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }]
  },
}

export default nextConfig
