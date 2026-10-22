'use client'

import { useEffect, useRef, useState } from 'react'
import { guardarMetaCaso } from '../lib/casos'
import { useI18n } from '../lib/i18n'
import FormularioCaso from './panel/FormularioCaso'
import ResultadoCaso from './panel/ResultadoCaso'
import { edadValida } from './panel/edad'
import styles from './panel/panel.module.css'

// La barra es artificial y va delante de la petición: el trabajador social ve avanzar la
// carga y sólo al llegar al 99 % se pide el caso al backend. Ahí se queda
// clavada hasta que el backend responde (o hasta que se cancela, y entonces la
// petición no llega a hacerse o se aborta).
const DURACION_CARGA = 5000
const PASO_CARGA = 60
const TOPE_BARRA = 99
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
  const [entrando, setEntrando] = useState(false)
  const intervalo = useRef(null)
  const cancelado = useRef(false)
  const abortarPeticion = useRef(null)
  const resolverBarra = useRef(null)
  // Momento de la última cancelación: evita que el mismo clic (o un doble clic)
  // cancele y vuelva a arrancar la carga en el acto.
  const canceladoEn = useRef(0)

  const pararProgreso = () => {
    if (intervalo.current) {
      clearInterval(intervalo.current)
      intervalo.current = null
    }
  }

  // Lleva la barra de 0 a 99 en DURACION_CARGA ms.
  // Resuelve true al terminar y false si se cancela por el camino.
  const correrBarra = () =>
    new Promise((resolve) => {
      pararProgreso()
      resolverBarra.current = resolve
      setProgreso(0)
      const inicio = Date.now()
      intervalo.current = setInterval(() => {
        const avanzado = Math.min(TOPE_BARRA, ((Date.now() - inicio) / DURACION_CARGA) * TOPE_BARRA)
        setProgreso(avanzado)
        if (avanzado >= TOPE_BARRA) {
          pararProgreso()
          resolverBarra.current = null
          resolve(true)
        }
      }, PASO_CARGA)
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
