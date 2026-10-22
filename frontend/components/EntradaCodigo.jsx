'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cargarCaso } from '../lib/casos'
import { useT } from '../lib/i18n'

/**
 * Entrada del alumno, integrada en la portada: cinco dígitos -> CL-XXXXX -> novela.
 * El código se valida contra la API antes de entrar: si el caso no existe es mejor
 * decírselo al alumno que mandarlo a una sesión que no quedará registrada.
 * Toda la red pasa por lib/casos.js, que es el único cliente HTTP de la app.
 */
export default function EntradaCodigo() {
  const router = useRouter()
  const t = useT()
  const [codigo, setCodigo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const digitos = codigo.replace(/\D/g, '').slice(0, 5)
  const listo = digitos.length === 5

  const entrar = async (evento) => {
    evento.preventDefault()
    if (!listo || cargando) return

    const casoId = `CL-${digitos}`
    setCargando(true)
    setError(null)

    const caso = await cargarCaso(casoId)
    if (caso.fuente === 'servidor') {
      router.push(`/novela?caso=${encodeURIComponent(casoId)}`)
      return
    }

    setCargando(false)
    setError(
      caso.fuente === 'inexistente'
        ? t('inicio.entradaAlumnoNoExiste')
        : t('inicio.entradaAlumnoSinConexion'),
    )
  }

  return (
    <section className="acceso-card" aria-label={t('inicio.entradaAlumnoAria')}>
      <div className="acceso-header">
        <span className="acceso-titulo">{t('inicio.entradaAlumnoTitulo')}</span>
      </div>

      <p className="acceso-texto">{t('inicio.entradaAlumnoTexto')}</p>

      <form className="acceso-form" onSubmit={entrar}>
        <div className="acceso-campo">
          <label className="acceso-etiqueta" htmlFor="codigo-sesion">
            {t('inicio.entradaAlumnoEtiqueta')}
          </label>
          <input
            id="codigo-sesion"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck="false"
            maxLength={8}
            className="acceso-input"
            placeholder="12345"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value)
              setError(null)
            }}
            disabled={cargando}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'codigo-sesion-error' : undefined}
          />
        </div>

        <button type="submit" className="btn-acceso" disabled={!listo || cargando}>
          {cargando ? t('inicio.entradaAlumnoBuscando') : t('inicio.entradaAlumnoBoton')}
        </button>
      </form>

      {error && (
        <p className="acceso-error" id="codigo-sesion-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
