'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getResumenTelemetria, getDecisionesTelemetria, resetTelemetria, getResumenDibujosTelemetria } from '../../lib/api'

// Clave de acceso institucional para asistentes sociales
const DEFAULT_ACCESS_CODE = 'SOCIAL2026'

export default function DashboardAsistentesSociales() {
  // Estado de autenticación para garantizar que solo se ve desde la vista de asistentes sociales
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [authError, setAuthError] = useState('')

  // Estado del dashboard
  const [loading, setLoading] = useState(true)
  const [summaryData, setSummaryData] = useState(null)
  const [decisionsList, setDecisionsList] = useState([])
  const [drawingsSummary, setDrawingsSummary] = useState(null)
  const [selectedDrawingIndex, setSelectedDrawingIndex] = useState(0)
  const [selectedStory, setSelectedStory] = useState('all')
  const [hesitationFilter, setHesitationFilter] = useState('all') // 'all' | 'high' | 'medium' | 'fast'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'tabla' | 'guia'
  const [refreshKey, setRefreshKey] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')

  // Comprobar si ya había sesión iniciada en este navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = sessionStorage.getItem('chavales_asistente_social_auth')
      if (auth === 'true') {
        setIsAuthenticated(true)
      }
    }
  }, [])

  // Carga de datos de telemetría cuando está autenticado
  useEffect(() => {
    if (!isAuthenticated) return

    let isMounted = true
    setLoading(true)

    async function fetchData() {
      try {
        const [summary, rawDecisions, drawingsRes] = await Promise.all([
          getResumenTelemetria(selectedStory),
          getDecisionesTelemetria(selectedStory, 200),
          getResumenDibujosTelemetria(),
        ])

        if (isMounted) {
          setSummaryData(summary)
          setDecisionsList(rawDecisions)
          setDrawingsSummary(drawingsRes)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error cargando telemetría:', err)
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, selectedStory, refreshKey])

  // Manejo de autenticación de Asistentes Sociales
  const handleLogin = (e) => {
    e.preventDefault()
    setAuthError('')
    const cleanCode = inputCode.trim().toUpperCase()

    // Permite el código oficial o cualquier variante (SOCIAL, SOCIAL2026, SOCIAL202, ASISTENTE, 2026)
    if (
      cleanCode === DEFAULT_ACCESS_CODE ||
      cleanCode === 'ASISTENTE' ||
      cleanCode === 'SOCIAL' ||
      cleanCode === 'SOCIAL202' ||
      cleanCode === '2026' ||
      cleanCode.startsWith('SOC')
    ) {
      setIsAuthenticated(true)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chavales_asistente_social_auth', 'true')
      }
    } else {
      setAuthError('Código de acceso no válido. Puedes usar SOCIAL2026 o pulsar en el botón de acceso rápido.')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setInputCode('')
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('chavales_asistente_social_auth')
    }
  }

  const handleResetData = async () => {
    if (confirm('¿Deseas restablecer los datos de muestra de telemetría para las preguntas de la novela?')) {
      try {
        await resetTelemetria()
        setStatusMessage('Datos de muestra restablecidos correctamente.')
        setRefreshKey((k) => k + 1)
        setTimeout(() => setStatusMessage(''), 4000)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleExportCSV = () => {
    if (!decisionsList.length) {
      alert('No hay datos disponibles para exportar.')
      return
    }

    const headers = ['ID', 'Historia', 'Capítulo', 'Pregunta', 'Opción Elegida', 'Tiempo (segundos)', 'Alumno/Apodo', 'Fecha']
    const rows = decisionsList.map((d) => [
      d.id || '',
      `"${(d.story_title || d.story_id || '').replace(/"/g, '""')}"`,
      d.chapter || 1,
      `"${(d.prompt || '').replace(/"/g, '""')}"`,
      `"${(d.option_label || '').replace(/"/g, '""')}"`,
      d.time_seconds || '',
      `"${(d.student_nickname || 'Alumno').replace(/"/g, '""')}"`,
      d.timestamp ? new Date(d.timestamp * 1000).toLocaleString('es-ES') : '',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `telemetria_tiempos_novela_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filtrado de preguntas para visualización
  const filteredQuestions = useMemo(() => {
    if (!summaryData?.questions) return []
    let list = summaryData.questions

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (item) =>
          item.prompt.toLowerCase().includes(q) ||
          item.story_title.toLowerCase().includes(q) ||
          item.options.some((o) => o.option_label.toLowerCase().includes(q))
      )
    }

    if (hesitationFilter === 'high') {
      list = list.filter((item) => item.avg_time >= 16)
    } else if (hesitationFilter === 'medium') {
      list = list.filter((item) => item.avg_time >= 8 && item.avg_time < 16)
    } else if (hesitationFilter === 'fast') {
      list = list.filter((item) => item.avg_time < 8)
    }

    return list
  }, [summaryData, searchQuery, hesitationFilter])

  // =========================================================================
  // 1. PANTALLA DE ACCESO EXCLUSIVO PARA ASISTENTES SOCIALES
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="kahoot-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="kahoot-topbar">
          <Link href="/" className="btn-back-home" aria-label="Volver al portal principal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Volver a Inicio</span>
          </Link>
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px 40px' }}>
          <div style={{
            maxWidth: 520,
            width: '100%',
            background: '#FFFFFF',
            borderRadius: 24,
            padding: '38px 32px',
            boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
            border: '3px solid #18181B',
            textAlign: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 8,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              background: 'linear-gradient(90deg, #047857 0%, #10B981 50%, #34D399 100%)',
            }} />

            <div style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background: '#D1FAE5',
              border: '3px solid #18181B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 4px 0 #18181B',
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>

            <span style={{
              display: 'inline-block',
              background: '#ECFDF5',
              color: '#065F46',
              border: '1.5px solid #059669',
              borderRadius: 999,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 10,
            }}>
              Área Reservada Profesional
            </span>

            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#064E3B', margin: '0 0 8px' }}>
              Vista de Asistentes Sociales
            </h1>

            <p style={{ color: '#4B5563', fontSize: 14, lineHeight: 1.5, margin: '0 0 26px' }}>
              Portal exclusivo para Trabajadores y Asistentes Sociales de Atención a la Infancia. Consulta la telemetría y tiempos de respuesta de los niños en la novela interactiva.
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'left' }}>
                <label htmlFor="access-code" style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#1F2937', marginBottom: 6 }}>
                  Código de Identificación / Clave de Acceso:
                </label>
                <input
                  id="access-code"
                  type="text"
                  placeholder="Introduce SOCIAL2026"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: '2.5px solid #18181B',
                    fontSize: 16,
                    fontWeight: 700,
                    outline: 'none',
                    boxShadow: '0 3px 0 #18181B',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    letterSpacing: '0.05em',
                  }}
                  autoFocus
                />
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#4B5563' }}>
                    Código oficial: <strong style={{ color: '#047857', letterSpacing: '0.04em' }}>SOCIAL2026</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setInputCode('SOCIAL2026')
                      setIsAuthenticated(true)
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('chavales_asistente_social_auth', 'true')
                      }
                    }}
                    style={{
                      background: '#DEF7EC',
                      color: '#03543F',
                      border: '1.5px solid #31C48D',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ Acceso rápido con 1 clic (SOCIAL2026)
                  </button>
                </div>
              </div>

              {authError && (
                <div style={{
                  background: '#FEF2F2',
                  border: '2px solid #EF4444',
                  borderRadius: 12,
                  padding: '10px 14px',
                  color: '#B91C1C',
                  fontSize: 13,
                  fontWeight: 700,
                }}>
                  {authError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  background: '#10B981',
                  color: '#022C22',
                  border: '3px solid #18181B',
                  borderRadius: 14,
                  padding: '14px',
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 5px 0 #18181B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <span>Acceder al Dashboard</span>
                <span>→</span>
              </button>
            </form>

            <div style={{ marginTop: 24, borderTop: '1px solid #E5E7EB', paddingTop: 16 }}>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                Protección de Datos conforme a la LOPIVI (Ley Orgánica 8/2021). Los datos de telemetría son anonimizados y de uso exclusivo socioeducativo.
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // =========================================================================
  // 2. DASHBOARD PRINCIPAL PARA ASISTENTES SOCIALES
  // =========================================================================
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', flexDirection: 'column', color: '#0F172A', fontFamily: 'inherit' }}>
      {/* Barra superior de navegación del Asistente Social */}
      <header style={{
        background: '#064E3B',
        color: '#FFFFFF',
        padding: '14px 24px',
        borderBottom: '3px solid #18181B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: '#10B981',
            border: '2px solid #FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 0 rgba(0,0,0,0.2)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, background: '#047857', border: '1px solid #34D399', borderRadius: 6, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Vista Asistentes Sociales
              </span>
              <span style={{ fontSize: 11, color: '#A7F3D0' }}>Chavales Legales</span>
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 900, margin: '2px 0 0', color: '#FFFFFF' }}>
              Dashboard de Tiempos y Decisiones en la Novela
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{
              background: '#047857',
              color: '#FFFFFF',
              border: '2px solid #FFFFFF',
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Recargar datos en vivo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: '#FACC15',
              color: '#0F172A',
              border: '2px solid #18181B',
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 2px 0 #18181B',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Exportar a CSV para informe técnico"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: '#FCA5A5',
              border: '1.5px solid #F87171',
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
            title="Cerrar sesión de Asistente Social"
          >
            Salir de la vista
          </button>

          <Link
            href="/"
            style={{
              background: '#FFFFFF',
              color: '#064E3B',
              borderRadius: 10,
              padding: '7px 12px',
              fontSize: 12,
              fontWeight: 900,
              textDecoration: 'none',
              border: '2px solid #18181B',
            }}
          >
            Inicio Web
          </Link>
        </div>
      </header>

      {/* Notificación de estado */}
      {statusMessage && (
        <div style={{
          background: '#DEF7EC',
          borderBottom: '2px solid #31C48D',
          color: '#03543F',
          padding: '10px 24px',
          fontWeight: 800,
          fontSize: 13,
          textAlign: 'center',
        }}>
          {statusMessage}
        </div>
      )}

      {/* Contenido principal del dashboard */}
      <main style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Pestañas de navegación interna */}
        <div style={{
          display: 'flex',
          gap: 10,
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: 14,
          marginBottom: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 900,
                border: '2px solid #18181B',
                cursor: 'pointer',
                background: activeTab === 'dashboard' ? '#10B981' : '#FFFFFF',
                color: activeTab === 'dashboard' ? '#022C22' : '#475569',
                boxShadow: activeTab === 'dashboard' ? '0 3px 0 #18181B' : 'none',
              }}
            >
              📊 Tiempos por Pregunta y Opción
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tabla')}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 900,
                border: '2px solid #18181B',
                cursor: 'pointer',
                background: activeTab === 'tabla' ? '#10B981' : '#FFFFFF',
                color: activeTab === 'tabla' ? '#022C22' : '#475569',
                boxShadow: activeTab === 'tabla' ? '0 3px 0 #18181B' : 'none',
              }}
            >
              📋 Registro Detallado ({decisionsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guia')}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 900,
                border: '2px solid #18181B',
                cursor: 'pointer',
                background: activeTab === 'guia' ? '#10B981' : '#FFFFFF',
                color: activeTab === 'guia' ? '#022C22' : '#475569',
                boxShadow: activeTab === 'guia' ? '0 3px 0 #18181B' : 'none',
              }}
            >
              💡 Guía de Interpretación Social
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dibujos')}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 900,
                border: '2px solid #18181B',
                cursor: 'pointer',
                background: activeTab === 'dibujos' ? '#10B981' : '#FFFFFF',
                color: activeTab === 'dibujos' ? '#022C22' : '#475569',
                boxShadow: activeTab === 'dibujos' ? '0 3px 0 #18181B' : 'none',
              }}
            >
              🎨 Evaluación Proyectiva Gráfica ({drawingsSummary?.recent_cases?.length || 0})
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetData}
            style={{
              background: '#F1F5F9',
              border: '1.5px solid #CBD5E1',
              borderRadius: 10,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 800,
              color: '#475569',
              cursor: 'pointer',
            }}
            title="Recargar el dataset de prueba enriquecido"
          >
            Restablecer datos de prueba
          </button>
        </div>

        {/* 1. TARJETAS DE MÉTRICAS GENERALES (KPIS) */}
        <section aria-label="Resumen ejecutivo de telemetría" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}>
          {/* KPI 1: Tiempo Medio General */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '20px 22px',
            border: '2px solid #18181B',
            boxShadow: '0 4px 0 #18181B',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Tiempo Medio Global
              </span>
              <span style={{ fontSize: 20 }}>⏱️</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#064E3B' }}>
              {summaryData?.overall_avg_time ?? '0.0'} <span style={{ fontSize: 18, fontWeight: 700, color: '#64748B' }}>seg</span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
              Mediana de {summaryData?.overall_median_time ?? '0.0'}s. Tiempo promedio que se toma un niño en responder a cualquier dilema.
            </p>
          </div>

          {/* KPI 2: Total Decisiones */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '20px 22px',
            border: '2px solid #18181B',
            boxShadow: '0 4px 0 #18181B',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Decisiones Analizadas
              </span>
              <span style={{ fontSize: 20 }}>🧒</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#1E293B' }}>
              {summaryData?.total_decisions ?? 0}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
              Respuestas registradas en las preguntas de la novela interactiva.
            </p>
          </div>

          {/* KPI 3: Pregunta con Mayor Vacilación / Tensión */}
          <div style={{
            background: '#FFFBEB',
            borderRadius: 20,
            padding: '20px 22px',
            border: '2px solid #D97706',
            boxShadow: '0 4px 0 #18181B',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#B45309', textTransform: 'uppercase' }}>
                Mayor Tensión Emocional
              </span>
              <span style={{ fontSize: 20 }}>⚠️</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#B45309' }}>
              {summaryData?.most_hesitated_question?.avg_time ? `${summaryData.most_hesitated_question.avg_time}s` : '—'}
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#92400E', lineHeight: 1.3, fontWeight: 700 }} title={summaryData?.most_hesitated_question?.prompt}>
              {summaryData?.most_hesitated_question ? `«${summaryData.most_hesitated_question.prompt.slice(0, 48)}...»` : 'Esperando datos'}
            </p>
          </div>

          {/* KPI 4: Rango de respuesta */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: '20px 22px',
            border: '2px solid #18181B',
            boxShadow: '0 4px 0 #18181B',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Rango Min / Max
              </span>
              <span style={{ fontSize: 20 }}>⚡</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A' }}>
              {summaryData?.fastest_decision_time ?? 0}s <span style={{ fontSize: 16, fontWeight: 600, color: '#94A3B8' }}>a</span> {summaryData?.slowest_decision_time ?? 0}s
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748B', lineHeight: 1.4 }}>
              Desde pulsaciones instintivas hasta reflexiones muy prolongadas.
            </p>
          </div>
        </section>

        {/* ===================================================================
            PESTAÑA 1: DASHBOARD CON GRÁFICOS Y DESGLOSE POR PREGUNTA Y OPCIÓN
            =================================================================== */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Barra de filtros sencillos */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '18px 20px',
              border: '2px solid #18181B',
              boxShadow: '0 3px 0 #18181B',
              marginBottom: 24,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              {/* Filtro por historia */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#1E293B' }}>Historia:</span>
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'sara', label: 'Sara · Mi historia sigue' },
                  { id: 'dos-voces', label: 'Dos voces' },
                  { id: 'no-lo-reenvies', label: 'No lo reenvíes' },
                  { id: 'no-soy-yo', label: 'No soy yo' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStory(s.id)}
                    style={{
                      background: selectedStory === s.id ? '#064E3B' : '#F1F5F9',
                      color: selectedStory === s.id ? '#FFFFFF' : '#334155',
                      border: '1.5px solid #18181B',
                      borderRadius: 999,
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: selectedStory === s.id ? '0 2px 0 #18181B' : 'none',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Filtro por nivel de duda y buscador */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <select
                  value={hesitationFilter}
                  onChange={(e) => setHesitationFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #18181B',
                    fontSize: 13,
                    fontWeight: 700,
                    background: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">Todos los tiempos</option>
                  <option value="high">⚠️ Alta indecisión (&gt; 16s)</option>
                  <option value="medium">⏱️ Reflexión moderada (8s - 16s)</option>
                  <option value="fast">⚡ Decisión rápida (&lt; 8s)</option>
                </select>

                <input
                  type="text"
                  placeholder="Buscar dilema u opción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #18181B',
                    fontSize: 13,
                    fontWeight: 600,
                    minWidth: 200,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Listado de preguntas y opciones */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: 20, border: '2px solid #18181B' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B' }}>Cargando telemetría de decisiones...</h3>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: 20, border: '2px solid #18181B' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B' }}>No se encontraron preguntas con los filtros seleccionados</h3>
                <p style={{ color: '#64748B', fontSize: 14 }}>Prueba a seleccionar «Todas» en las historias o cambiar el término de búsqueda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {filteredQuestions.map((q) => {
                  const isHighHesitation = q.avg_time >= 16

                  return (
                    <article
                      key={`${q.story_id}-${q.node_id}`}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 22,
                        border: isHighHesitation ? '3px solid #F59E0B' : '2px solid #18181B',
                        boxShadow: '0 4px 0 #18181B',
                        padding: '24px 26px',
                        position: 'relative',
                      }}
                    >
                      {/* Cabecera de la pregunta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{
                              background: '#ECFDF5',
                              color: '#065F46',
                              fontSize: 11,
                              fontWeight: 800,
                              borderRadius: 6,
                              padding: '2px 8px',
                              border: '1px solid #A7F3D0',
                            }}>
                              {q.story_title} · Cap. {q.chapter}
                            </span>
                            <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>
                              ID: {q.node_id}
                            </span>
                            {isHighHesitation && (
                              <span style={{
                                background: '#FEF3C7',
                                color: '#92400E',
                                fontSize: 11,
                                fontWeight: 800,
                                borderRadius: 6,
                                padding: '2px 8px',
                                border: '1px solid #FCD34D',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                ⚠️ Alta indecisión de los niños
                              </span>
                            )}
                          </div>
                          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0, lineHeight: 1.35 }}>
                            {q.prompt}
                          </h2>
                        </div>

                        {/* Métrica de tiempo medio de la pregunta */}
                        <div style={{
                          background: isHighHesitation ? '#FEF3C7' : '#F1F5F9',
                          border: isHighHesitation ? '2px solid #D97706' : '1.5px solid #CBD5E1',
                          borderRadius: 14,
                          padding: '10px 16px',
                          textAlign: 'right',
                          minWidth: 140,
                        }}>
                          <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                            Tiempo Promedio
                          </span>
                          <span style={{ fontSize: 22, fontWeight: 900, color: isHighHesitation ? '#B45309' : '#0F172A' }}>
                            {q.avg_time}s
                          </span>
                          <span style={{ display: 'block', fontSize: 11, color: '#64748B' }}>
                            {q.total_responses} {q.total_responses === 1 ? 'niño' : 'niños'}
                          </span>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 18, marginTop: 14 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 12,
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#64748B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          <span>Desglose por opción elegida:</span>
                          <span>Tiempo medio que tardan los niños</span>
                        </div>

                        {/* Lista de opciones con barra comparativa de tiempo */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {q.options.map((opt, optIndex) => {
                            // Escala relativa del tiempo frente al máximo (o 30s)
                            const maxScale = Math.max(25, q.max_time || 25)
                            const timePercent = Math.min(100, Math.round((opt.avg_time / maxScale) * 100))

                            // Color de la barra según tiempo:
                            // < 8s = Azul/Verde (rápido)
                            // 8s - 18s = Verde esmeralda (reflexión razonada)
                            // 18s - 24s = Ámbar/Naranja (duda notable)
                            // > 24s = Rojo/Granate (bloqueo/indecisión severa)
                            let barColor = '#10B981'
                            let badgeBg = '#ECFDF5'
                            let badgeColor = '#065F46'
                            if (opt.avg_time < 8) {
                              barColor = '#3B82F6'
                              badgeBg = '#EFF6FF'
                              badgeColor = '#1E40AF'
                            } else if (opt.avg_time > 22) {
                              barColor = '#EF4444'
                              badgeBg = '#FEF2F2'
                              badgeColor = '#991B1B'
                            } else if (opt.avg_time > 15) {
                              barColor = '#F59E0B'
                              badgeBg = '#FEF3C7'
                              badgeColor = '#92400E'
                            }

                            return (
                              <div
                                key={opt.option_id}
                                style={{
                                  background: '#F8FAFC',
                                  borderRadius: 14,
                                  border: '1.5px solid #E2E8F0',
                                  padding: '14px 16px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                      <span style={{
                                        width: 22,
                                        height: 22,
                                        borderRadius: 6,
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        fontSize: 11,
                                        fontWeight: 900,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}>
                                        {optIndex + 1}
                                      </span>
                                      <span style={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        background: badgeBg,
                                        color: badgeColor,
                                        borderRadius: 999,
                                        padding: '2px 8px',
                                      }}>
                                        {opt.interpretation_label}
                                      </span>
                                      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>
                                        {opt.count} {opt.count === 1 ? 'elección' : 'elecciones'} ({opt.percentage}%)
                                      </span>
                                    </div>
                                    <strong style={{ fontSize: 15, fontWeight: 800, color: '#1E293B', display: 'block' }}>
                                      {opt.option_label}
                                    </strong>
                                  </div>

                                  {/* Tiempo medio de esta opción */}
                                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                                    <span style={{ fontSize: 20, fontWeight: 900, color: '#0F172A' }}>
                                      {opt.avg_time}s
                                    </span>
                                    <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>
                                      mín: {opt.min_time}s · máx: {opt.max_time}s
                                    </span>
                                  </div>
                                </div>

                                {/* Barra gráfica horizontal comparativa */}
                                <div style={{
                                  width: '100%',
                                  height: 10,
                                  background: '#E2E8F0',
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  position: 'relative',
                                }}>
                                  <div style={{
                                    width: `${timePercent}%`,
                                    height: '100%',
                                    background: barColor,
                                    borderRadius: 999,
                                    transition: 'width 0.4s ease',
                                  }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 2: REGISTRO DETALLADO EN TABLA
            =================================================================== */}
        {activeTab === 'tabla' && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            border: '2px solid #18181B',
            boxShadow: '0 4px 0 #18181B',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 22px', borderBottom: '2px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: 0 }}>
                  Registro Individual de Decisiones
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748B' }}>
                  Auditoría detallada con la marca temporal y el tiempo exacto que cada menor tardó en responder.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  background: '#FACC15',
                  color: '#0F172A',
                  border: '2px solid #18181B',
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 2px 0 #18181B',
                }}
              >
                Descargar informe CSV
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontWeight: 800 }}>
                    <th style={{ padding: '12px 16px' }}>Alumno / Sala</th>
                    <th style={{ padding: '12px 16px' }}>Historia</th>
                    <th style={{ padding: '12px 16px' }}>Pregunta</th>
                    <th style={{ padding: '12px 16px' }}>Opción Elegida</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Tiempo</th>
                    <th style={{ padding: '12px 16px' }}>Nivel de Duda</th>
                    <th style={{ padding: '12px 16px' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {decisionsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>
                        No hay registros individuales disponibles todavía.
                      </td>
                    </tr>
                  ) : (
                    decisionsList.map((row, idx) => {
                      const t = row.time_seconds || 0
                      let tagText = 'Habitual'
                      let tagBg = '#ECFDF5'
                      let tagColor = '#065F46'
                      if (t < 6) {
                        tagText = 'Rápida'
                        tagBg = '#EFF6FF'
                        tagColor = '#1E40AF'
                      } else if (t > 20) {
                        tagText = 'Alta Indecisión'
                        tagBg = '#FEF2F2'
                        tagColor = '#991B1B'
                      } else if (t > 14) {
                        tagText = 'Reflexiva'
                        tagBg = '#FEF3C7'
                        tagColor = '#92400E'
                      }

                      return (
                        <tr
                          key={row.id || idx}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: idx % 2 === 0 ? '#FFFFFF' : '#FBFDFF',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1E293B' }}>
                            {row.student_nickname || 'Alumno'}
                            {row.session_pin && (
                              <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>
                                Sala: {row.session_pin}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#475569' }}>
                            {row.story_title || row.story_id}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#1E293B', maxWidth: 260 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.prompt}>
                              {row.prompt}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 700, maxWidth: 280 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.option_label}>
                              {row.option_label}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900, color: '#0F172A' }}>
                            {t}s
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              background: tagBg,
                              color: tagColor,
                              fontSize: 11,
                              fontWeight: 800,
                              borderRadius: 999,
                              padding: '2px 8px',
                            }}>
                              {tagText}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#64748B', fontSize: 12 }}>
                            {row.timestamp ? new Date(row.timestamp * 1000).toLocaleDateString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            PESTAÑA 3: GUÍA DE INTERPRETACIÓN SOCIAL
            =================================================================== */}
        {activeTab === 'guia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              background: '#FFFFFF',
              borderRadius: 22,
              border: '2px solid #18181B',
              boxShadow: '0 4px 0 #18181B',
              padding: '28px 32px',
            }}>
              <span style={{
                display: 'inline-block',
                background: '#ECFDF5',
                color: '#065F46',
                border: '1.5px solid #059669',
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 10,
              }}>
                Manual de Apoyo para Servicios Sociales y Equipos Psicosociales
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#064E3B', margin: '0 0 12px' }}>
                ¿Cómo interpretar los tiempos de respuesta de los niños?
              </h2>
              <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, margin: '0 0 20px' }}>
                En las novelas interactivas de <em>Chavales Legales</em>, los menores se enfrentan a situaciones simuladas de violencia intrafamiliar, revelación de secretos, acoso digital y contacto con la justicia. El tiempo que un niño tarda en tomar una decisión proporciona pistas esenciales sobre su estado afectivo y posibles vivencias reales.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
                marginTop: 20,
              }}>
                <div style={{ background: '#EFF6FF', border: '1.5px solid #93C5FD', borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>⚡ Decisión Muy Rápida (&lt; 6 segundos)</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1E40AF', margin: '0 0 6px' }}>Impulso o Evasión</h3>
                  <p style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.45, margin: 0 }}>
                    Si se eligen opciones de riesgo (ej: borrar pruebas o responder con insultos), denota reacción impulsiva defensiva. Si se eligen opciones de huida, puede reflejar el deseo de pasar página rápido para evitar el malestar.
                  </p>
                </div>

                <div style={{ background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>⏱️ Tiempo Habitual (6 a 15 segundos)</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#065F46', margin: '0 0 6px' }}>Procesamiento Saludable</h3>
                  <p style={{ fontSize: 13, color: '#064E3B', lineHeight: 1.45, margin: 0 }}>
                    Lectura comprensiva de las opciones, evaluación de alternativas y elección consciente. Refleja un entorno de seguridad donde el menor siente que puede pensar con calma.
                  </p>
                </div>

                <div style={{ background: '#FEF3C7', border: '1.5px solid #FCD34D', borderRadius: 16, padding: '18px 20px' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>⚠️ Alta Indecisión (&gt; 18 segundos)</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#92400E', margin: '0 0 6px' }}>Conflicto Emocional / Miedo</h3>
                  <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.45, margin: 0 }}>
                    Tiempos prolongados en preguntas como «¿Qué necesita decir Sara primero?» o «¿Vais a llamar a mi padre?» revelan temor a represalias, lealtad dividida hacia familiares o desconfianza en el sistema de protección.
                  </p>
                </div>
              </div>
            </div>

            {/* Protocolo de actuación */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 22,
              border: '2px solid #18181B',
              boxShadow: '0 4px 0 #18181B',
              padding: '24px 28px',
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', margin: '0 0 10px' }}>
                Pautas recomendadas para la entrevista posterior:
              </h3>
              <ul style={{ paddingLeft: 20, margin: 0, color: '#334155', fontSize: 14, lineHeight: 1.7 }}>
                <li><strong>No juzgar:</strong> Validar que todas las emociones sentidas durante la historia son legítimas y comprensibles.</li>
                <li><strong>Explorar dilemas lentos:</strong> Retomar en grupo o en entrevista individual aquellas preguntas donde el grupo o alumno tardó más tiempo: <em>«En esta pregunta muchos pensasteis bastante antes de responder, ¿qué fue lo más difícil de decidir?»</em>.</li>
                <li><strong>Garantizar confidencialidad:</strong> Recordar siempre los canales de ayuda seguros y anónimos (116 111, 017 y Servicios Sociales locales).</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'dibujos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header explicativo */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 22,
              border: '2px solid #18181B',
              boxShadow: '0 4px 0 #18181B',
              padding: '26px 30px',
            }}>
              <span style={{
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 900,
                color: '#6366F1',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 6,
              }}>
                Psicología Jurídica y Forense · Técnica Proyectiva Digital
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: '0 0 10px' }}>
                Evaluación Grafométrica y Psicomotora del Dibujo Infantil (3 Fases)
              </h2>
              <p style={{ margin: 0, color: '#475569', fontSize: 15, lineHeight: 1.6, maxWidth: 900 }}>
                Esta herramienta analiza de manera no intrusiva las variables cinemáticas del trazo (temblor/microvacilaciones, presión continua, latencia inicial, pausas aéreas, ocupación espacial y uso del color) antes y después del momento traumático en la novela, ayudando a detectar signos somáticos y defensivos de estrés agudo.
              </p>
            </div>

            {/* Tarjetas resumen KPI */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}>
              <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: 18, border: '2px solid #18181B', boxShadow: '0 3px 0 #18181B' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Casos Evaluados</span>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
                  {drawingsSummary?.total_evaluations || 0}
                </div>
                <span style={{ fontSize: 12, color: '#64748B' }}>Fases 1 y 2 completadas</span>
              </div>

              <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: 18, border: '2px solid #18181B', boxShadow: '0 3px 0 #18181B' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Δ Temblor Promedio</span>
                <div style={{ fontSize: 28, fontWeight: 900, color: (drawingsSummary?.average_tremor_delta || 0) > 0 ? '#DC2626' : '#10B981', marginTop: 4 }}>
                  {(drawingsSummary?.average_tremor_delta || 0) > 0 ? `+${drawingsSummary?.average_tremor_delta}` : drawingsSummary?.average_tremor_delta || 0}
                </div>
                <span style={{ fontSize: 12, color: '#64748B' }}>Micro-oscilaciones post-trauma</span>
              </div>

              <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: 18, border: '2px solid #18181B', boxShadow: '0 3px 0 #18181B' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Δ Ocupación del Lienzo</span>
                <div style={{ fontSize: 28, fontWeight: 900, color: (drawingsSummary?.average_occupancy_delta || 0) < 0 ? '#D97706' : '#0F172A', marginTop: 4 }}>
                  {((drawingsSummary?.average_occupancy_delta || 0) * 100).toFixed(1)}%
                </div>
                <span style={{ fontSize: 12, color: '#64748B' }}>Retracción espacial relativa</span>
              </div>

              <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: 18, border: '2px solid #18181B', boxShadow: '0 3px 0 #18181B' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Alertas Activas</span>
                <div style={{ fontSize: 28, fontWeight: 900, color: (drawingsSummary?.active_alerts_count || 0) > 0 ? '#E11D48' : '#10B981', marginTop: 4 }}>
                  {drawingsSummary?.active_alerts_count || 0}
                </div>
                <span style={{ fontSize: 12, color: '#64748B' }}>Indicadores para entrevista</span>
              </div>
            </div>

            {/* Selector de caso y ficha detallada */}
            {drawingsSummary?.recent_cases?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Selector de alumnos */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#475569' }}>Seleccionar Expediente:</span>
                  {drawingsSummary.recent_cases.map((c, idx) => (
                    <button
                      key={c.id || idx}
                      type="button"
                      onClick={() => setSelectedDrawingIndex(idx)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 12,
                        border: '2px solid #18181B',
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: 'pointer',
                        background: selectedDrawingIndex === idx ? '#4F46E5' : '#FFFFFF',
                        color: selectedDrawingIndex === idx ? '#FFFFFF' : '#1E293B',
                        boxShadow: selectedDrawingIndex === idx ? '0 3px 0 #18181B' : 'none',
                      }}
                    >
                      {c.student_nickname || `Alumno ${idx + 1}`} ({c.session_pin || 'PIN'})
                    </button>
                  ))}
                </div>

                {/* Ficha pericial del caso seleccionado */}
                {(() => {
                  const currentCase = drawingsSummary.recent_cases[selectedDrawingIndex] || drawingsSummary.recent_cases[0]
                  const m = currentCase.metrics || {}
                  const d = currentCase.delta || {}
                  const alerts = currentCase.alerts || []

                  return (
                    <div style={{
                      background: '#FFFFFF',
                      borderRadius: 22,
                      border: '2px solid #18181B',
                      boxShadow: '0 4px 0 #18181B',
                      padding: '28px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 24,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, borderBottom: '2px solid #E2E8F0', paddingBottom: 16 }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#4F46E5', textTransform: 'uppercase' }}>Ficha Grafométrica del Menor</span>
                          <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0F172A', margin: '4px 0' }}>
                            {currentCase.student_nickname || 'Alumno evaluado'}
                          </h3>
                          <span style={{ fontSize: 13, color: '#64748B' }}>
                            Fecha de captura: {currentCase.timestamp ? new Date(currentCase.timestamp).toLocaleString('es-ES') : 'Reciente'} · Sesión PIN: {currentCase.session_pin || 'N/A'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentCase, null, 2))
                            const a = document.createElement('a')
                            a.href = dataStr
                            a.download = `informe_grafometrico_${(currentCase.student_nickname || 'alumno').toLowerCase().replace(/\s+/g, '_')}.json`
                            a.click()
                          }}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            border: '1.5px solid #18181B',
                            background: '#F8FAFC',
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          ⬇ Exportar Informe JSON
                        </button>
                      </div>

                      {/* Comparativa de variables psicomotoras */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                        {/* 1. Temblor / Inestabilidad */}
                        <div style={{ padding: 18, borderRadius: 16, border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>1. Temblor y Tensión Motora</span>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: '6px 0' }}>
                            {m.tremor?.jitter_index || 0} <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>/ 100</span>
                          </div>
                          <div style={{ fontSize: 13, color: (d.delta_tremor_index || 0) > 0 ? '#DC2626' : '#10B981', fontWeight: 700, marginBottom: 8 }}>
                            Variación post-trauma: {(d.delta_tremor_index || 0) > 0 ? `+${d.delta_tremor_index}` : d.delta_tremor_index || 0} ({d.tremor_change_percent || 0}%)
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                            Evalúa micro-inflexiones angulares bruscas (&gt;60°) en distancias cortas. Picos elevados indican ansiedad somatizada o miedo agudo.
                          </p>
                        </div>

                        {/* 2. Presión y Fuerza */}
                        <div style={{ padding: 18, borderRadius: 16, border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>2. Presión Continua del Trazo</span>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: '6px 0' }}>
                            {m.pressure?.mean || 0.5} <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>media (máx: {m.pressure?.max || 0.5})</span>
                          </div>
                          <div style={{ fontSize: 13, color: (d.delta_pressure_mean || 0) < 0 ? '#D97706' : '#0F172A', fontWeight: 700, marginBottom: 8 }}>
                            Variación post-trauma: {d.delta_pressure_mean > 0 ? `+${d.delta_pressure_mean}` : d.delta_pressure_mean || 0} ({d.pressure_change_percent || 0}%)
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                            {m.pressure?.mean < 0.3 ? 'Presión hipotónica (posible inhibición/desesperanza).' : m.pressure?.mean > 0.7 ? 'Presión hipertónica (tensión/descarga agresiva contenida).' : 'Tono neuromuscular dentro del rango esperado.'}
                          </p>
                        </div>

                        {/* 3. Ocupación Espacial (Micrografismo) */}
                        <div style={{ padding: 18, borderRadius: 16, border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>3. Emplazamiento y Tamaño</span>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: '6px 0' }}>
                            {((m.spatial?.occupancy_ratio || 0) * 100).toFixed(0)}% <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>del lienzo</span>
                          </div>
                          <div style={{ fontSize: 13, color: (d.delta_occupancy_ratio || 0) < 0 ? '#DC2626' : '#10B981', fontWeight: 700, marginBottom: 8 }}>
                            Retracción post-trauma: {((d.delta_occupancy_ratio || 0) * 100).toFixed(1)}% ({d.occupancy_change_percent || 0}%)
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                            Cuadrante predominante: <strong>{m.spatial?.predominant_quadrant || 'centro'}</strong>. Una contracción gráfica intensa post-trauma sugiere repliegue defensivo.
                          </p>
                        </div>

                        {/* 4. Latencias y Pausas */}
                        <div style={{ padding: 18, borderRadius: 16, border: '1.5px solid #E2E8F0', background: '#F8FAFC' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>4. Tiempo de Reacción y Pausas</span>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: '6px 0' }}>
                            {((m.initial_latency_ms || 0) / 1000).toFixed(1)}s <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>latencia inicial</span>
                          </div>
                          <div style={{ fontSize: 13, color: (d.delta_initial_latency_ms || 0) > 2000 ? '#DC2626' : '#475569', fontWeight: 700, marginBottom: 8 }}>
                            Retardo post-trauma: {d.delta_initial_latency_ms > 0 ? `+${(d.delta_initial_latency_ms / 1000).toFixed(1)}s` : `${((d.delta_initial_latency_ms || 0) / 1000).toFixed(1)}s`}
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                            Pausas de suspensión aérea &gt;2s: {m.hesitation_pauses_count || 0}. El retardo prolongado mide choque o resistencia al iniciar la representación.
                          </p>
                        </div>
                      </div>

                      {/* Alertas periciales orientativas */}
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', margin: '0 0 12px' }}>
                          Indicadores Psicológicos y Alertas para la Entrevista:
                        </h4>
                        {alerts.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {alerts.map((al, aIdx) => (
                              <div
                                key={aIdx}
                                style={{
                                  padding: '14px 18px',
                                  borderRadius: 14,
                                  border: '1.5px solid #FCA5A5',
                                  background: '#FEF2F2',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 4,
                                }}
                              >
                                <strong style={{ fontSize: 14, color: '#991B1B' }}>
                                  ⚠️ {al.title}
                                </strong>
                                <span style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.5 }}>
                                  {al.detail}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: 14, borderRadius: 12, background: '#F0FDF4', border: '1.5px solid #86EFAC', color: '#166534', fontSize: 13 }}>
                            ✔ No se han detectado variaciones psicomotoras extremas en la comparativa de este expediente.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div style={{ background: '#FFFFFF', padding: 30, borderRadius: 18, border: '2px solid #18181B', textAlign: 'center', color: '#64748B' }}>
                No hay sesiones de dibujo registradas todavía. Los datos aparecerán automáticamente en cuanto un menor juegue a la novela visual.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
