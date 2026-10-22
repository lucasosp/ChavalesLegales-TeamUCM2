'use client'

import { OPCIONES_RIESGO } from './opcionesRiesgo'

const estiloCampo = {
  width: '100%',
  padding: '12px 14px',
  fontSize: 15,
  fontWeight: 600,
  borderRadius: 14,
  border: '2px solid #18181B',
  background: '#F8FAFC',
  outline: 'none',
  boxSizing: 'border-box',
}

const estiloEtiqueta = {
  display: 'block',
  fontSize: 13,
  fontWeight: 800,
  color: '#18181B',
  marginBottom: 6,
}

/**
 * Formulario de generación de caso. Solo presentación: el estado y el envío los
 * lleva PanelEducador, que es quien decide si el caso se ha creado de verdad.
 */
export default function FormularioCaso({
  t,
  nombreJoven,
  setNombreJoven,
  tipoRiesgo,
  setTipoRiesgo,
  contexto,
  setContexto,
  cargando,
  error,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit}>
      {/* Nombre del joven */}
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="input-nombre-joven" style={estiloEtiqueta}>
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
          style={estiloCampo}
        />
      </div>

      {/* Tipo de riesgo */}
      <div style={{ marginBottom: 18 }}>
        <label htmlFor="select-tipo-riesgo" style={estiloEtiqueta}>
          {t('profesores.tipoRiesgoLabel')} <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <select
          id="select-tipo-riesgo"
          value={tipoRiesgo}
          onChange={(e) => setTipoRiesgo(e.target.value)}
          disabled={cargando}
          style={{ ...estiloCampo, cursor: 'pointer' }}
        >
          {OPCIONES_RIESGO.map((op) => (
            <option key={op.value} value={op.value}>
              {t(`profesores.riesgo_${op.value}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Contexto */}
      <div style={{ marginBottom: 22 }}>
        <label htmlFor="textarea-contexto" style={estiloEtiqueta}>
          {t('profesores.contextoLabel')}
        </label>
        <textarea
          id="textarea-contexto"
          rows={3}
          placeholder={t('profesores.contextoPlaceholder')}
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          disabled={cargando}
          style={{ ...estiloCampo, fontSize: 14, fontWeight: 500, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

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

      {/* Si el caso no se pudo crear en el backend, el educador lo ve aquí y NO recibe
          ningún código que repartir (D13). */}
      {error && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: '10px 14px',
            borderRadius: 12,
            background: '#FEF2F2',
            border: '2px solid #DC2626',
            color: '#B91C1C',
            fontSize: 13,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}
    </form>
  )
}
