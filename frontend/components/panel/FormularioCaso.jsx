'use client'

import { useState } from 'react'
import styles from './panel.module.css'
import Desplegable from './Desplegable'
import { OPCIONES_RIESGO } from './opcionesRiesgo'
import { EDAD_MAX, EDAD_MIN, edadValida, soloDigitos } from './edad'

/**
 * Formulario de generación de caso. Solo presentación: el estado y el envío los
 * lleva PanelTrabajadorSocial, que es quien decide si el caso se ha creado de verdad.
 */
export default function FormularioCaso({
  t,
  nombreJoven,
  setNombreJoven,
  edad,
  setEdad,
  tipoRiesgo,
  setTipoRiesgo,
  contexto,
  setContexto,
  cargando,
  progreso = 0,
  entrando = false,
  error,
  onSubmit,
  onCancelar,
}) {
  const edadOk = edadValida(edad)
  // El aviso no salta mientras se escribe: al teclear "1" camino de "12" no hay error que
  // enseñar. Se marca al salir del campo (o al enviar, que es lo mismo para el trabajador social).
  const [edadVisitada, setEdadVisitada] = useState(false)
  const edadMal = edadVisitada && !edadOk
  // Un único sitio para lo que va mal: debajo del botón. El campo solo se marca en rojo.
  const mensajeError = edadMal
    ? t('profesores.edadFueraRango', { min: EDAD_MIN, max: EDAD_MAX })
    : error

  return (
    <form onSubmit={onSubmit}>
      {/* Nombre y edad en la misma fila: el nombre se queda el 85 % y el 15 % derecho es
          para la edad, que rellena todo su hueco. */}
      <div className={styles.filaNombreEdad}>
        {/* Nombre del joven */}
        <div className={styles.campo}>
          <label htmlFor="input-nombre-joven" className={styles.etiqueta}>
            {t('profesores.nombreJovenLabel')} <span className={styles.obligatorio}>*</span>
          </label>
          <input
            id="input-nombre-joven"
            type="text"
            required
            placeholder={t('profesores.nombreJovenPlaceholder')}
            value={nombreJoven}
            onChange={(e) => setNombreJoven(e.target.value)}
            disabled={cargando}
            className={styles.control}
          />
        </div>

        {/* Edad del menor: solo dígitos y dentro de 5–18 */}
        <div className={styles.campo}>
          <label htmlFor="input-edad" className={styles.etiqueta}>
            {t('profesores.edadLabel')} <span className={styles.obligatorio}>*</span>
          </label>
          <input
            id="input-edad"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            pattern="[0-9]*"
            maxLength={2}
            placeholder={t('profesores.edadPlaceholder')}
            value={edad}
            onChange={(e) => setEdad(soloDigitos(e.target.value))}
            onBlur={() => setEdadVisitada(true)}
            disabled={cargando}
            aria-invalid={edadMal}
            aria-describedby={edadMal ? 'error-formulario' : undefined}
            className={`${styles.control} ${styles.controlEdad} ${edadMal ? styles.controlMal : ''}`}
          />
        </div>
      </div>

      {/* Tipo de riesgo */}
      <div className={styles.campo}>
        <label htmlFor="select-tipo-riesgo" className={styles.etiqueta}>
          {t('profesores.tipoRiesgoLabel')} <span className={styles.obligatorio}>*</span>
        </label>
        <Desplegable
          id="select-tipo-riesgo"
          valor={tipoRiesgo}
          onChange={setTipoRiesgo}
          disabled={cargando}
          ariaLabel={t('profesores.tipoRiesgoLabel')}
          opciones={OPCIONES_RIESGO.map((op) => ({
            value: op.value,
            label: t(`profesores.riesgo_${op.value}`),
          }))}
        />
      </div>

      {/* Contexto */}
      <div className={styles.campo}>
        <label htmlFor="textarea-contexto" className={styles.etiqueta}>
          {t('profesores.contextoLabel')}
        </label>
        <textarea
          id="textarea-contexto"
          rows={3}
          placeholder={t('profesores.contextoPlaceholder')}
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          disabled={cargando}
          className={`${styles.control} ${styles.area}`}
        />
      </div>

      {/* Mientras se crea, el propio botón es la barra de carga.
          Al pasar por encima se convierte en "¿Quieres cancelar?" en rojo. */}
      {cargando ? (
        <button
          type="button"
          onClick={onCancelar}
          className={`${styles.accion} ${styles.accionCargando}`}
          aria-label={`${t('profesores.creandoCasoPct', { pct: Math.round(progreso) })}. ${t('profesores.cancelarGeneracion')}`}
        >
          <span className={styles.accionRelleno} style={{ width: `${progreso}%` }} aria-hidden="true" />
          <span className={styles.cargaNormal}>
            {t('profesores.creandoCasoPct', { pct: Math.round(progreso) })}
          </span>
          <span className={styles.cargaCancelar} aria-hidden="true">
            {t('profesores.cancelarGeneracion')}
          </span>
        </button>
      ) : (
        <button
          type="submit"
          disabled={!nombreJoven.trim() || !edadOk}
          className={`${styles.accion} ${entrando ? styles.accionEntra : ''}`}
        >
          <span>{t('profesores.generarCaso')}</span>
        </button>
      )}

      {/* Todos los errores van aquí, debajo del botón, con el mismo formato de texto pequeño
          que tenía el aviso bajo el campo: edad fuera de rango o caso que el backend no
          confirma. Sin esto el trabajador social se queda sin saber qué corregir (D13). */}
      {/* Hueco fijo para el aviso: se reserva siempre una línea, para que la tarjeta no
          crezca ni mueva el botón cuando aparece el mensaje. Vacío si no hay nada que decir. */}
      <p
        role="alert"
        id="error-formulario"
        className={`${styles.ayuda} ${styles.ayudaMal} ${styles.huecoAviso}`}
      >
        {mensajeError || ''}
      </p>
    </form>
  )
}
