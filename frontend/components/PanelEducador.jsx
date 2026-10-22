'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarMetaCaso } from '../lib/casos'
import { useI18n } from '../lib/i18n'
import FormularioCaso from './panel/FormularioCaso'
import ResultadoCaso from './panel/ResultadoCaso'

// Locale para formatear fechas según el idioma activo
const LOCALES_FECHA = { es: 'es-ES', ca: 'ca-ES', va: 'ca-ES-valencia', gl: 'gl-ES', eu: 'eu-ES', oc: 'oc' }

// 5 dígitos: es el código que el alumno teclea en /alumno y que /alumno valida
// contra GET /api/casos/CL-xxxxx. Se queda corto a propósito (D10).
function nuevoCodigoCaso() {
  return `CL-${Math.floor(10000 + Math.random() * 90000)}`
}

export default function PanelEducador() {
  const router = useRouter()
  const { t, lang } = useI18n()
  const [nombreJoven, setNombreJoven] = useState('')
  const [tipoRiesgo, setTipoRiesgo] = useState('ciberacoso')
  const [contexto, setContexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [casoGenerado, setCasoGenerado] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState(null)

  // El caso tiene que existir en el backend ANTES de repartir su código:
  // si la creación falla, el alumno no debe recibir un código que /alumno va a rechazar.
  const handleGenerarCaso = async (e) => {
    e.preventDefault()
    if (cargando) return

    setCargando(true)
    setError(null)

    const casoId = nuevoCodigoCaso()
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

    try {
      await guardarMetaCaso(casoId, {
        nombreJoven: nombreJoven.trim() || t('profesores.jovenParticipante'),
        // Se guarda el id del riesgo, no su texto: el informe lo traduce en la
        // lengua del lector con t(`profesores.riesgo_${id}`).
        tipoRiesgo: t(`profesores.riesgo_${tipoRiesgo}`),
        tipoRiesgoId: tipoRiesgo,
        contexto: contexto.trim(),
        creadoEn: new Date().toISOString(),
      })

      setCasoGenerado({
        id: casoId,
        enlace: `${baseOrigin}/novela?caso=${casoId}`,
        nombreJoven: nombreJoven.trim() || t('profesores.jovenParticipante'),
        tipoRiesgo: t(`profesores.riesgo_${tipoRiesgo}`),
        tipoRiesgoId: tipoRiesgo,
        contexto: contexto.trim() || t('profesores.sinObservaciones'),
        fecha: new Date().toLocaleDateString(LOCALES_FECHA[lang] || 'es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      })
    } catch (err) {
      console.error('[PanelEducador] no se pudo crear el caso', err)
      setError(t('profesores.errorCrearCaso'))
    } finally {
      setCargando(false)
    }
  }

  const handleCopiarEnlace = async () => {
    if (!casoGenerado?.enlace) return
    try {
      await navigator.clipboard.writeText(casoGenerado.enlace)
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible en el input para copiarlo a mano
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }

  const handleCrearOtroCaso = () => {
    setCasoGenerado(null)
    setCopiado(false)
    setError(null)
    setNombreJoven('')
    setContexto('')
  }

  return (
    <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', textAlign: 'left' }}>
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 28,
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.28)',
          border: '3px solid #18181B',
          padding: '34px 32px',
          color: '#18181B',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Barra superior decorativa tricolor */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(90deg, #FACC15 0%, #22C55E 50%, #4A1A1C 100%)',
          }}
        />

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#4A1A1C', margin: '0 0 6px' }}>
            {t('profesores.panelTitulo')}
          </h1>
          <p style={{ color: '#475569', fontSize: 14, margin: 0, lineHeight: 1.4 }}>
            {t('profesores.panelSubtitulo')}
          </p>
        </div>

        {casoGenerado ? (
          <ResultadoCaso
            t={t}
            caso={casoGenerado}
            copiado={copiado}
            onCopiar={handleCopiarEnlace}
            onPrevisualizar={() => router.push(`/novela?caso=${casoGenerado.id}`)}
            onCrearOtro={handleCrearOtroCaso}
          />
        ) : (
          <FormularioCaso
            t={t}
            nombreJoven={nombreJoven}
            setNombreJoven={setNombreJoven}
            tipoRiesgo={tipoRiesgo}
            setTipoRiesgo={setTipoRiesgo}
            contexto={contexto}
            setContexto={setContexto}
            cargando={cargando}
            error={error}
            onSubmit={handleGenerarCaso}
          />
        )}
      </div>
    </div>
  )
}
