// Contenido por defecto para funcionamiento offline o sin backend FastAPI
const FALLBACK_JUEGOS = {
  historia: {
    inicio: 'mensaje',
    escenas: {
      mensaje: {
        texto: 'Te llega un WhatsApp: «¡Has ganado un móvil! Pulsa aquí y pon tu contraseña». ¿Qué haces?',
        opciones: [
          { texto: 'Pulso el enlace, ¡quiero el móvil!', va_a: 'trampa' },
          { texto: 'No pulso y se lo cuento a un adulto', va_a: 'foto' },
        ],
      },
      trampa: {
        texto: '¡Era phishing! Te han robado la cuenta. Engañar así es un delito de estafa (art. 249 del Código Penal).',
        final: true,
        bien: false,
      },
      foto: {
        texto: '¡Bien hecho! Más tarde, alguien de clase comparte una foto falsa de un compañero hecha con IA. ¿Qué haces?',
        opciones: [
          { texto: 'La reenvío al grupo, es graciosa', va_a: 'reenvio' },
          { texto: 'No la reenvío y aviso a un profe', va_a: 'heroe' },
        ],
      },
      reenvio: {
        texto: 'Reenviar fotos falsas que humillan a alguien también es delito (art. 197.7 CP). ¡Y le hace mucho daño!',
        final: true,
        bien: false,
      },
      heroe: {
        texto: '¡Eres un Chaval Legal! Has protegido tu cuenta y a tu compañero. Si necesitas ayuda, llama al 017.',
        final: true,
        bien: true,
      },
    },
  },
  preguntas: [
    {
      pregunta: 'Un mensaje te pide tu contraseña para darte un premio. ¿Es seguro?',
      opciones: ['Sí, si el premio es bueno', 'No, nunca se da la contraseña', 'Solo si es de un amigo'],
      correcta: 1,
      explica: 'Nadie de confianza te pedirá tu contraseña. Eso es phishing.',
    },
    {
      pregunta: 'Alguien te escribe todo el rato, sabe dónde estás y te da miedo. ¿Qué es?',
      opciones: ['Acoso o acecho', 'Una broma', 'Algo normal en redes'],
      correcta: 0,
      explica: 'Vigilar y perseguir a alguien es delito (art. 172 ter CP). Cuéntaselo a un adulto.',
    },
    {
      pregunta: '¿Qué es un deepfake?',
      opciones: ['Un videojuego', 'Una foto o vídeo falso hecho con IA', 'Un tipo de virus'],
      correcta: 1,
      explica: 'Parecen reales, pero son falsos. Compartirlos para humillar a alguien es delito.',
    },
    {
      pregunta: '¿A qué número puedes llamar si tienes un problema en internet?',
      opciones: ['112 solo', '017', 'No hay ninguno'],
      correcta: 1,
      explica: 'El 017 es la línea de ayuda en ciberseguridad. ¡Es gratis!',
    },
  ],
  cooperativo: [
    {
      caso: 'Un compañero recibe insultos en un grupo de clase.',
      opciones: ['Nos reímos', 'Le apoyamos y avisamos a un profe', 'Salimos del grupo sin decir nada'],
      correcta: 1,
    },
    {
      caso: 'Una amiga recibe un enlace raro de su «banco».',
      opciones: ['Le decimos que no lo abra', 'Que pruebe a ver qué pasa', 'Que ponga sus datos rápido'],
      correcta: 0,
    },
    {
      caso: 'Vemos un vídeo falso de un profe circulando.',
      opciones: ['Lo compartimos', 'Lo denunciamos y no lo reenviamos', 'Hacemos otro'],
      correcta: 1,
    },
    {
      caso: 'Alguien desconocido quiere quedar con un amigo que conoció online.',
      opciones: ['Que vaya solo', 'Que se lo cuente a sus padres', 'Que no diga nada'],
      correcta: 1,
    },
  ],
  juicio: [
    {
      id: 'difusion_fotos',
      titulo: 'Caso 1: El sticker privado en el grupo de clase',
      hechos: 'Un alumno recibe en confianza una fotografía de un compañero en el baño del colegio y decide convertirla en sticker y compartirla en el grupo de WhatsApp de 30 alumnos de la clase.',
      pregunta: '¿Qué determina la ley sobre este comportamiento?',
      opciones: [
        'Es delito de difusión no consentida de imágenes íntimas (art. 197.7 CP)',
        'No es nada porque el grupo es privado y solo era una broma entre amigos',
        'Solo hay falta si el afectado pide dinero',
      ],
      correcta: 0,
      sentencia: '¡Culpable según la ley! Difundir imágenes íntimas o que menoscaben la intimidad de otra persona sin su consentimiento es delito tipificado en el art. 197.7 del Código Penal, con especial gravedad al tratarse de menores.',
      articulo: 'Art. 197.7 Código Penal',
    },
    {
      id: 'cuenta_falsa',
      titulo: 'Caso 2: El perfil falso del profesor en TikTok',
      hechos: 'Dos estudiantes crean una cuenta falsa usando la fotografía real y el nombre de un profesor del centro para publicar vídeos satíricos e insultos hacia otros profesores.',
      pregunta: '¿Existe infracción o delito en este caso?',
      opciones: [
        'Es libertad de expresión y humor en redes sociales',
        'Puede constituir delito de usurpación de estado civil (art. 401 CP) e injurias',
        'Solo se sanciona si la cuenta consigue más de 10.000 seguidores',
      ],
      correcta: 1,
      sentencia: '¡Delito! Hacerse pasar por otra persona de forma continuada vulnera el art. 401 del Código Penal (usurpación de identidad), y si además se insulta o calumnia, se incurre en delitos contra el honor.',
      articulo: 'Art. 401 y 205-208 Código Penal',
    },
    {
      id: 'amenazas_online',
      titulo: 'Caso 3: Mensajes amenazantes tras una partida de videojuegos',
      hechos: 'Tras perder una partida online, un usuario envía mensajes reiterados amenazando con revelar la dirección real de un menor y acudir a pegarle si no le entrega su cuenta.',
      pregunta: '¿Cómo califica la justicia esta conducta de hostigamiento?',
      opciones: [
        'Es delito de amenazas graves y coacciones (arts. 169 y 172 CP)',
        'En los videojuegos no rige el Código Penal, solo las normas del juego',
        'Solo es delito si el agresor vive en la misma ciudad',
      ],
      correcta: 0,
      sentencia: '¡Delito grave! Las amenazas y coacciones cometidas a través de internet o videojuegos tienen plena validez penal. Protegerse guardando pruebas y denunciando ante la policía o llamando al 017 es fundamental.',
      articulo: 'Arts. 169 y 172 Código Penal',
    },
  ],
}

export async function getJuego(modo) {
  try {
    const r = await fetch(`/api/juegos/${modo}`)
    if (r.ok) {
      return await r.json()
    }
  } catch {
    // Si la API falla o está desconectada, devolvemos el fallback integrado
  }

  if (FALLBACK_JUEGOS[modo]) {
    return FALLBACK_JUEGOS[modo]
  }

  throw new Error('No se pudo cargar el juego')
}

// ============================================================================
// FUNCIONES DE SALAS MULTIJUGADOR (ESTILO KAHOOT)
// ============================================================================

export function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
  }
  return ''
}

export async function crearSala(modo = 'juicio', tiempoPregunta = 30) {
  const base = getApiBaseUrl()
  const r = await fetch(`${base}/api/salas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modo, tiempo_pregunta: tiempoPregunta }),
  })

  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'Error al crear la sala')
  }

  return await r.json()
}

export async function getInfoSala(pin) {
  const cleanPin = pin.replace(/\s+/g, '').trim()
  const base = getApiBaseUrl()
  const r = await fetch(`${base}/api/salas/${cleanPin}`)

  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'Sala no encontrada')
  }

  return await r.json()
}

export async function unirseASala(pin, nickname, avatar = {}) {
  const cleanPin = pin.replace(/\s+/g, '').trim()
  const base = getApiBaseUrl()
  const payload = {
    nickname,
    base_type: avatar?.baseType ?? avatar?.base_type,
    color_pelo: avatar?.colorPelo ?? avatar?.color_pelo,
    color_ropa: avatar?.colorRopa ?? avatar?.color_ropa,
    tiene_gorro: avatar?.tieneGorro !== undefined ? avatar.tieneGorro : avatar?.tiene_gorro,
  }
  const r = await fetch(`${base}/api/salas/${cleanPin}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'No se pudo unir a la sala')
  }

  return await r.json()
}


// ============================================================================
// FUNCIONES DE TELEMETRÍA Y TIEMPOS (PARA EL DASHBOARD DE ASISTENTES SOCIALES)
// ============================================================================

export async function getResumenTelemetria(storyId = 'all') {
  const base = getApiBaseUrl()
  const query = storyId && storyId !== 'all' ? `?story_id=${encodeURIComponent(storyId)}` : ''
  try {
    const r = await fetch(`${base}/api/telemetria/resumen${query}`)
    if (r.ok) {
      return await r.json()
    }
  } catch (err) {
    console.warn('Backend API telemetria no disponible, usando fallback local:', err)
  }

  // Fallback si la API no está disponible
  return {
    total_decisions: 0,
    overall_avg_time: 0,
    overall_median_time: 0,
    fastest_decision_time: 0,
    slowest_decision_time: 0,
    questions: [],
    story_stats: [],
  }
}

export async function getDecisionesTelemetria(storyId = 'all', limit = 200) {
  const base = getApiBaseUrl()
  const params = new URLSearchParams()
  if (storyId && storyId !== 'all') params.set('story_id', storyId)
  if (limit) params.set('limit', String(limit))

  try {
    const r = await fetch(`${base}/api/telemetria/decisiones?${params.toString()}`)
    if (r.ok) {
      return await r.json()
    }
  } catch (err) {
    console.warn('Backend API decisiones no disponible:', err)
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('chavales_telemetria_decisiones')
      if (stored) {
        const list = JSON.parse(stored)
        return storyId && storyId !== 'all' ? list.filter(item => item.story_id === storyId) : list
      }
    } catch {}
  }

  return []
}

export async function resetTelemetria() {
  const base = getApiBaseUrl()
  try {
    const r = await fetch(`${base}/api/telemetria/reset`, { method: 'POST' })
    if (r.ok) return await r.json()
  } catch (err) {
    console.warn('Error al reiniciar telemetría:', err)
  }
  return { status: 'fallback' }
}

export async function getResumenDibujosTelemetria() {
  const base = getApiBaseUrl()
  try {
    const r = await fetch(`${base}/api/telemetria/dibujos/resumen`)
    if (r.ok) return await r.json()
  } catch (err) {
    console.warn('Backend API resumen dibujos no disponible, usando fallback local:', err)
  }

  // Fallback con datos de localStorage si el backend no está disponible
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('legalinstory_avatar_drawings')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.phase2Metrics && parsed.deltaMetrics) {
          return {
            total_evaluations: 1,
            average_tremor_delta: parsed.deltaMetrics.delta_tremor_index || 0,
            average_occupancy_delta: parsed.deltaMetrics.delta_occupancy_ratio || 0,
            average_latency_delta_ms: parsed.deltaMetrics.delta_initial_latency_ms || 0,
            active_alerts_count: (parsed.alerts || []).length,
            alert_breakdown: {},
            recent_cases: [
              {
                id: 'local_current_session',
                student_nickname: 'Sesión Actual (Sara)',
                session_pin: 'Local',
                timestamp: new Date().toISOString(),
                metrics: parsed.phase2Metrics,
                delta: parsed.deltaMetrics,
                alerts: parsed.alerts || [],
                phase1_preview: parsed.phase1,
                phase2_preview: parsed.phase2,
              },
            ],
          }
        }
      }
    } catch {}
  }

  return {
    total_evaluations: 0,
    average_tremor_delta: 0,
    average_occupancy_delta: 0,
    average_latency_delta_ms: 0,
    active_alerts_count: 0,
    alert_breakdown: {},
    recent_cases: [],
  }
}

export async function getDibujosTelemetria(limit = 50) {
  const base = getApiBaseUrl()
  try {
    const r = await fetch(`${base}/api/telemetria/dibujos?limit=${limit}`)
    if (r.ok) return await r.json()
  } catch (err) {
    console.warn('Backend API dibujos no disponible:', err)
  }
  return []
}

export async function registrarDibujoTelemetria(payload) {
  const base = getApiBaseUrl()
  try {
    const r = await fetch(`${base}/api/telemetria/dibujo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (r.ok) return await r.json()
  } catch (err) {
    console.warn('Error registrando dibujo telemetria:', err)
  }
  return { status: 'fallback' }
}
