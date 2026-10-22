'use client'

import { useEffect, useRef, useState } from 'react'
import { guardarMetaCaso } from '../lib/casos'
import { useI18n } from '../lib/i18n'
import FormularioCaso from './panel/FormularioCaso'
import ResultadoCaso from './panel/ResultadoCaso'
import { edadValida } from './panel/edad'
import styles from './panel/panel.module.css'

// Definición de las etapas de la generación asistida por IA
const FASES_CARGA = [
  { minPct: 0, maxPct: 22, fase: 'faseAnalizando' },
  { minPct: 22, maxPct: 52, fase: 'faseGenerandoHistoria' },
  { minPct: 52, maxPct: 84, fase: 'faseGenerandoJuegos' },
  { minPct: 84, maxPct: 99, fase: 'faseFinalizando' },
]

function obtenerFase(pct) {
  for (const f of FASES_CARGA) {
    if (pct < f.maxPct) return f.fase
  }
  return 'faseFinalizando'
}

// Ventana en la que un envío se considera el mismo gesto que la cancelación
const REENVIO_BLOQUEADO = 400

// Locale para formatear fechas según el idioma activo
const LOCALES_FECHA = { es: 'es-ES', ca: 'ca-ES', va: 'ca-ES-valencia', gl: 'gl-ES', eu: 'eu-ES', oc: 'oc' }

// 5 dígitos: es el código que el alumno teclea en la portada y que se valida
// contra GET /api/casos/CL-xxxxx. Se queda corto a propósito (D10).
function nuevoCodigoCaso() {
  return `CL-${Math.floor(10000 + Math.random() * 90000)}`
}

export default function PanelTrabajadorSocial() {
  const { t, lang } = useI18n()
  const [nombreJoven, setNombreJoven] = useState('')
  const [edad, setEdad] = useState('')
  const [tipoRiesgo, setTipoRiesgo] = useState('ciberacoso')
  const [contexto, setContexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [casoGenerado, setCasoGenerado] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState(null)
  const [progreso, setProgreso] = useState(0)
  const [faseCarga, setFaseCarga] = useState('faseAnalizando')
  const [entrando, setEntrando] = useState(false)
  const timerPaso = useRef(null)
  const cancelado = useRef(false)
  const abortarPeticion = useRef(null)
  const resolverBarra = useRef(null)
  // Momento de la última cancelación: evita que el mismo clic (o un doble clic)
  // cancele y vuelva a arrancar la carga en el acto.
  const canceladoEn = useRef(0)

  const pararProgreso = () => {
    if (timerPaso.current) {
      clearTimeout(timerPaso.current)
      timerPaso.current = null
    }
  }

  // Simulación orgánica y menos predecible:
  // Combina tirones rápidos, avances discretos, estancamientos y micropausas
  // en puntos aleatorios (ej. 14%, 39%, 67%, 83%, etc.).
  const correrBarra = () =>
    new Promise((resolve) => {
      pararProgreso()
      resolverBarra.current = resolve
      setProgreso(0)
      setFaseCarga('faseAnalizando')

      let p = 0

      const darPaso = () => {
        if (cancelado.current) {
          resolve(false)
          return
        }

        if (p >= 99) {
          setProgreso(99)
          setFaseCarga('faseFinalizando')
          resolverBarra.current = null
          resolve(true)
          return
        }

        // Decidimos comportamiento para el siguiente paso:
        const tirada = Math.random()
        let incremento = 0
        let espera = 0

        // 1. Micropausa / atasco temporal en la generación (18% de probabilidad)
        if (tirada < 0.18 && p > 5 && p < 95) {
          incremento = 0
          // Pausa notable o micro-atasco entre 350ms y 900ms
          espera = 350 + Math.random() * 550
        }
        // 2. Tirón rápido / ráfaga de avance (22% de probabilidad)
        else if (tirada < 0.40) {
          incremento = 4 + Math.random() * 8
          espera = 80 + Math.random() * 120
        }
        // 3. Avance gradual con ritmo irregular (60% de probabilidad)
        else {
          incremento = 0.8 + Math.random() * 2.8
          espera = 120 + Math.random() * 260
        }

        // Si estamos cerca del 99, ralentizar para no saltárselo bruscamente
        if (p > 90) {
          incremento = Math.min(incremento, 1.2)
          espera = Math.max(espera, 220)
        }

        p = Math.min(99, p + incremento)
        setProgreso(p)
        setFaseCarga(obtenerFase(p))

        timerPaso.current = setTimeout(darPaso, espera)
      }

      // Arranca tras un breve titubeo inicial realista (100-200ms)
      timerPaso.current = setTimeout(darPaso, 150)
    })

  // Nada de intervalos ni peticiones vivos si se desmonta a mitad
  useEffect(
    () => () => {
      pararProgreso()
      abortarPeticion.current?.abort()
    },
    [],
  )

  // El caso tiene que existir en el backend ANTES de repartir su código:
  // si la creación falla, el alumno no debe recibir un código que la portada va a rechazar.
  const handleGenerarCaso = async (e) => {
    e.preventDefault()
    if (cargando) return
    // Recién cancelado: no se arranca otra carga por el mismo gesto
    if (Date.now() - canceladoEn.current < REENVIO_BLOQUEADO) return
    // Sin edad válida no hay caso. No se pone error aquí: el campo ya avisa al salir de
    // él, y así este mensaje no se queda pegado al corregir la edad.
    if (!edadValida(edad)) return

    setCargando(true)
    setError(null)
    cancelado.current = false

    const casoId = nuevoCodigoCaso()
    const baseOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

    // 1) Barra artificial. Si se cancela aquí, no se llega a pedir nada.
    const completada = await correrBarra()
    // Cancelado: la vuelta al estado normal la hace handleCancelarCarga
    if (!completada || cancelado.current) return

    // 2) Petición real. La barra se queda en el 99 % hasta que conteste.
    const controlador = new AbortController()
    abortarPeticion.current = controlador

    try {
      await guardarMetaCaso(casoId, {
        nombreJoven: nombreJoven.trim() || t('profesores.jovenParticipante'),
        edad: Number(edad),
        // Se guarda el id del riesgo, no su texto: el informe lo traduce en la
        // lengua del lector con t(`profesores.riesgo_${id}`).
        tipoRiesgo: t(`profesores.riesgo_${tipoRiesgo}`),
        tipoRiesgoId: tipoRiesgo,
        contexto: contexto.trim(),
        creadoEn: new Date().toISOString(),
      }, { signal: controlador.signal })

      if (cancelado.current) return
      setProgreso(100)

      setCasoGenerado({
        id: casoId,
        enlace: `${baseOrigin}/novela?caso=${casoId}`,
        nombreJoven: nombreJoven.trim() || t('profesores.jovenParticipante'),
        edad: Number(edad),
        tipoRiesgo: t(`profesores.riesgo_${tipoRiesgo}`),
        tipoRiesgoId: tipoRiesgo,
        contexto: contexto.trim() || t('profesores.sinObservaciones'),
        fecha: new Date().toLocaleDateString(LOCALES_FECHA[lang] || 'es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
      })
    } catch (err) {
      // Cancelar aborta la petición: eso no es un error que haya que enseñar
      if (!cancelado.current && err.name !== 'AbortError') {
        console.error('[PanelTrabajadorSocial] no se pudo crear el caso', err)
        setError(t('profesores.errorCrearCaso'))
      }
      setProgreso(0)
    } finally {
      pararProgreso()
      abortarPeticion.current = null
      setCargando(false)
    }
  }

  // Cancelar: corta la barra (y con ella la petición, si aún no había salido) y
  // aborta la que esté en vuelo esperando al backend.
  const handleCancelarCarga = () => {
    canceladoEn.current = Date.now()
    cancelado.current = true
    pararProgreso()
    abortarPeticion.current?.abort()
    resolverBarra.current?.(false)
    resolverBarra.current = null

    // 1) la barra vuelve a 0 con su transición (100 ms)
    setProgreso(0)

    // 2) y en seguida entra el botón normal con una animación corta
    setTimeout(() => {
      setCargando(false)
      setEntrando(true)
      setTimeout(() => setEntrando(false), 200)
    }, 140)
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
    setEdad('')
    setContexto('')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.titulo}>
          {casoGenerado ? t('profesores.panelTituloCreado') : t('profesores.panelTitulo')}
        </h1>

        {casoGenerado ? (
          <ResultadoCaso
            t={t}
            caso={casoGenerado}
            copiado={copiado}
            onCopiar={handleCopiarEnlace}
            onCrearOtro={handleCrearOtroCaso}
          />
        ) : (
          <FormularioCaso
            t={t}
            nombreJoven={nombreJoven}
            setNombreJoven={setNombreJoven}
            edad={edad}
            setEdad={setEdad}
            tipoRiesgo={tipoRiesgo}
            setTipoRiesgo={setTipoRiesgo}
            contexto={contexto}
            setContexto={setContexto}
            cargando={cargando}
            progreso={progreso}
            faseCarga={faseCarga}
            entrando={entrando}
            onCancelar={handleCancelarCarga}
            error={error}
            onSubmit={handleGenerarCaso}
          />
        )}
      </div>
    </div>
  )
}
