'use client'

import Link from 'next/link'

/**
 * Tarjeta del caso ya creado: código, enlace para compartir y accesos.
 * El código (CL-12345) es lo que el alumno teclea en /alumno.
 */
export default function ResultadoCaso({ t, caso, copiado, onCopiar, onPrevisualizar, onCrearOtro }) {
  const codigoCorto = caso.id.replace(/^CL-/, '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Confirmación */}
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
            {t('profesores.idSesion')} <strong>{caso.id}</strong> · {t('profesores.adaptadoPara')}{' '}
            <strong>{caso.nombreJoven}</strong>
          </span>
        </div>
      </div>

      {/* Código que el alumno teclea */}
      <div
        style={{
          background: '#FFFBEB',
          border: '2px solid #18181B',
          borderRadius: 18,
          padding: '18px 20px',
          textAlign: 'center',
        }}
      >
        <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {t('profesores.codigoAlumnoLabel')}
        </span>
        <span style={{ display: 'block', fontSize: 40, fontWeight: 900, letterSpacing: '0.12em', color: '#4A1A1C', fontVariantNumeric: 'tabular-nums' }}>
          {codigoCorto}
        </span>
        <span style={{ fontSize: 12, color: '#92400E' }}>{t('profesores.codigoAlumnoAyuda')}</span>
      </div>

      {/* Ficha resumen */}
      <div style={{ background: '#F8FAFC', border: '2px solid #18181B', borderRadius: 18, padding: '18px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              {t('profesores.joven')}
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#18181B' }}>{caso.nombreJoven}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
              {t('profesores.focoIntervencion')}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#18181B' }}>
              {caso.tipoRiesgoId ? t(`profesores.riesgo_${caso.tipoRiesgoId}`) : caso.tipoRiesgo}
            </span>
          </div>
        </div>
      </div>

      {/* Enlace único con botón copiar */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#18181B', marginBottom: 6 }}>
          {t('profesores.enlaceUnicoLabel')}
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            readOnly
            value={caso.enlace}
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
            onClick={onCopiar}
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

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
        <button
          type="button"
          onClick={onPrevisualizar}
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
          href={`/informe/${caso.id}`}
          style={{ flex: 1, minWidth: 220, background: '#FEF08A', color: '#0F172A', border: '3px solid #18181B', borderRadius: 16, padding: '14px 20px', fontSize: 15, fontWeight: 900, boxShadow: '0 5px 0 #18181B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
        >
          <span>{t('profesores.verInforme')}</span>
          <span aria-hidden="true">▤</span>
        </Link>
        <button
          type="button"
          onClick={onCrearOtro}
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
  )
}
