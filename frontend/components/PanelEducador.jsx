'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { guardarMetaCaso } from '../lib/casos'
import { useI18n } from '../lib/i18n'

// Locale para formatear fechas según el idioma activo
const LOCALES_FECHA = { es: 'es-ES', ca: 'ca-ES', va: 'ca-ES-valencia', gl: 'gl-ES', eu: 'eu-ES', oc: 'oc' }

export default function PanelEducador({ onCerrarSesion = null }) {
  const router = useRouter()
  const { t, lang } = useI18n()
  const [nombreJoven, setNombreJoven] = useState('')
  const [tipoRiesgo, setTipoRiesgo] = useState('ciberacoso')
  const [contexto, setContexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [casoGenerado, setCasoGenerado] = useState(null)
  const [copiado, setCopiado] = useState(false)

  // Opciones estéticas de tipo de riesgo
  const opcionesRiesgo = [
    { value: 'ciberacoso', label: 'Ciberacoso y difusión no consentida' },
    { value: 'suplantacion', label: 'Suplantación de identidad en redes' },
    { value: 'grooming', label: 'Grooming / Contacto sospechoso con adultos' },
    { value: 'control_pareja', label: 'Control digital en parejas jóvenes' },
    { value: 'privacidad', label: 'Sobreexposición y pérdida de privacidad' },
  ]

  // Simulación de generación de caso con IA
  const handleGenerarCaso = (e) => {
    e.preventDefault()
    setCargando(true)

    setTimeout(() => {
      const randomId = Math.floor(10000 + Math.random() * 90000)
      const casoId = `CL-${randomId}`
      const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const linkUnico = `${baseOrigin}/novela?caso=${casoId}`

      const riesgoSeleccionado = opcionesRiesgo.find((r) => r.value === tipoRiesgo)?.label || tipoRiesgo

      guardarMetaCaso(casoId, {
        nombreJoven: nombreJoven.trim() || 'Joven participante',
        tipoRiesgo: riesgoSeleccionado,
        contexto: contexto.trim(),
        creadoEn: new Date().toISOString(),
      })
      setCasoGenerado({
        id: casoId,
        enlace: linkUnico,
        nombreJoven: nombreJoven.trim() || t('profesores.jovenParticipante'),
        tipoRiesgo: riesgoSeleccionado,
        tipoRiesgoId: tipoRiesgo,
        contexto: contexto.trim() || t('profesores.sinObservaciones'),
        fecha: new Date().toLocaleDateString(LOCALES_FECHA[lang] || 'es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      })
      setCargando(false)
    }, 1400)
  }

  // Copiar enlace generado al portapapeles
  const handleCopiarEnlace = async () => {
    if (!casoGenerado?.enlace) return
    try {
      await navigator.clipboard.writeText(casoGenerado.enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    }
  }

  // Previsualizar caso en la novela gráfica
  const handlePrevisualizarCaso = () => {
    router.push(`/novela?caso=${casoGenerado.id}`)
  }

  // Reiniciar formulario para otro caso
  const handleCrearOtroCaso = () => {
    setCasoGenerado(null)
    setNombreJoven('')
    setContexto('')
    setCopiado(false)
  }

  return (
    <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', textAlign: 'left' }}>
      {/* Tarjeta principal del panel */}
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

        {/* Cabecera del panel */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#4A1A1C', margin: '0 0 6px' }}>
            {t('profesores.panelTitulo')}
          </h1>
          <p style={{ color: '#475569', fontSize: 14, margin: 0, lineHeight: 1.4 }}>
            {t('profesores.panelSubtitulo')}
          </p>
        </div>

        {/* ===================================================================
            ESTADO 1: FORMULARIO DE GENERACIÓN DE CASO (CUANDO NO SE HA GENERADO)
           =================================================================== */}
        {!casoGenerado ? (
          <form onSubmit={handleGenerarCaso}>
            {/* Campo: Nombre del joven */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="input-nombre-joven"
                style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#18181B', marginBottom: 6 }}
              >
                {t('profesores.nombreJovenLabel')} <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                id="input-nombre-joven"
                type="text"
                required
                placeholder={t('profesores.nombreJovenPlaceholder')}
                value={nombreJoven}
                onChange={(e) => setNombreJoven(e.target.value)}
                disabled={cargando}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 14,
                  border: '2px solid #18181B',
                  background: '#F8FAFC',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Campo: Tipo de riesgo */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="select-tipo-riesgo"
                style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#18181B', marginBottom: 6 }}
              >
                {t('profesores.tipoRiesgoLabel')} <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <select
                id="select-tipo-riesgo"
                value={tipoRiesgo}
                onChange={(e) => setTipoRiesgo(e.target.value)}
                disabled={cargando}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 14,
                  border: '2px solid #18181B',
                  background: '#F8FAFC',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                {opcionesRiesgo.map((op) => (
                  <option key={op.value} value={op.value}>
                    {t(`profesores.riesgo_${op.value}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo: Contexto */}
            <div style={{ marginBottom: 22 }}>
              <label
                htmlFor="textarea-contexto"
                style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#18181B', marginBottom: 6 }}
              >
                {t('profesores.contextoLabel')}
              </label>
              <textarea
                id="textarea-contexto"
                rows={3}
                placeholder={t('profesores.contextoPlaceholder')}
                value={contexto}
                onChange={(e) => setContexto(e.target.value)}
                disabled={cargando}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 14,
                  border: '2px solid #18181B',
                  background: '#F8FAFC',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Botón de Generar caso con IA */}
            <button
              type="submit"
              disabled={cargando || !nombreJoven.trim()}
              style={{
                width: '100%',
                background: cargando ? '#E2E8F0' : '#22C55E',
                color: cargando ? '#64748B' : '#0F172A',
                border: '3px solid #18181B',
                borderRadius: 16,
                padding: '15px 24px',
                fontSize: 16,
                fontWeight: 900,
                cursor: cargando || !nombreJoven.trim() ? 'not-allowed' : 'pointer',
                boxShadow: cargando ? 'none' : '0 5px 0 #18181B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'all 0.15s ease',
              }}
            >
              {cargando ? (
                <>
                  <svg
                    style={{ animation: 'spin 1s linear infinite', width: 20, height: 20 }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                  <span>{t('profesores.generandoCaso')}</span>
                </>
              ) : (
                <span>{t('profesores.generarCaso')}</span>
              )}
            </button>
          </form>
        ) : (
          /* ===================================================================
              ESTADO 2: CASO GENERADO (ENLACE ÚNICO Y PREVISUALIZACIÓN)
             =================================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Banner de confirmación */}
            <div
              style={{
                background: '#ECFDF5',
                border: '2.5px solid #059669',
                borderRadius: 18,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: '#22C55E',
                  border: '2px solid #18181B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 22,
                }}
              >
                ✓
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: 16, color: '#065F46', fontWeight: 900 }}>
                  {t('profesores.casoGeneradoExito')}
                </strong>
                <span style={{ fontSize: 13, color: '#047857' }}>
                  {t('profesores.idSesion')} <strong>{casoGenerado.id}</strong> · {t('profesores.adaptadoPara')}{' '}
                  <strong>{casoGenerado.nombreJoven}</strong>
                </span>
              </div>
            </div>

            {/* Ficha resumen del caso */}
            <div
              style={{
                background: '#F8FAFC',
                border: '2px solid #18181B',
                borderRadius: 18,
                padding: '18px 20px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    {t('profesores.joven')}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#18181B' }}>
                    {casoGenerado.nombreJoven}
                  </span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    {t('profesores.focoIntervencion')}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#18181B' }}>
                    {casoGenerado.tipoRiesgoId ? t(`profesores.riesgo_${casoGenerado.tipoRiesgoId}`) : casoGenerado.tipoRiesgo}
                  </span>
                </div>
              </div>
            </div>

            {/* Enlace único autogenerado con botón copiar */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#18181B', marginBottom: 6 }}>
                {t('profesores.enlaceUnicoLabel')}
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={casoGenerado.enlace}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 14,
                    border: '2px solid #18181B',
                    background: '#FFFFFF',
                    color: '#334155',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopiarEnlace}
                  style={{
                    background: copiado ? '#22C55E' : '#FEF08A',
                    color: '#18181B',
                    border: '2px solid #18181B',
                    borderRadius: 14,
                    padding: '12px 18px',
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 3px 0 #18181B',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s ease',
                  }}
                >
                  {copiado ? t('profesores.copiado') : t('profesores.copiarEnlace')}
                </button>
              </div>
            </div>

            {/* Acciones principales: Previsualizar caso y Generar otro */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
              {/* Botón Previsualizar caso (enruta a /novela) */}
              <button
                type="button"
                onClick={handlePrevisualizarCaso}
                style={{
                  flex: 1,
                  minWidth: 220,
                  background: '#22C55E',
                  color: '#0F172A',
                  border: '3px solid #18181B',
                  borderRadius: 16,
                  padding: '14px 20px',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 5px 0 #18181B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>{t('profesores.previsualizarCaso')}</span>
                <span aria-hidden="true">→</span>
              </button>
              <Link
                href={`/informe/${casoGenerado.id}`}
                style={{ flex: 1, minWidth: 220, background: '#FEF08A', color: '#0F172A', border: '3px solid #18181B', borderRadius: 16, padding: '14px 20px', fontSize: 15, fontWeight: 900, boxShadow: '0 5px 0 #18181B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
              >
                <span>{t('profesores.verInforme')}</span>
                <span aria-hidden="true">▤</span>
              </Link>

              {/* Botón Crear otro caso */}
              <button
                type="button"
                onClick={handleCrearOtroCaso}
                style={{
                  background: '#FFFFFF',
                  color: '#18181B',
                  border: '2px solid #18181B',
                  borderRadius: 16,
                  padding: '14px 20px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 3px 0 #18181B',
                }}
              >
                {t('profesores.crearOtroCaso')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

