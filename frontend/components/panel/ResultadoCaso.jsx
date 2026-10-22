'use client'

import Link from 'next/link'
import styles from './panel.module.css'

/**
 * Tarjeta del caso ya creado: código, enlace para compartir y accesos.
 * El código (CL-12345) es lo que el alumno teclea en la portada para entrar.
 */
export default function ResultadoCaso({ t, caso, copiado, onCopiar, onCrearOtro }) {
  const codigoCorto = caso.id.replace(/^CL-/, '')

  return (
    <div className={styles.resultado}>
      {/* Código que el alumno teclea: el dato clave, en ámbar y con puntos */}
      <div className={styles.codigo}>
        <span className={styles.codigoEtiqueta}>{t('profesores.codigoAlumnoLabel')}</span>
        <span className={styles.codigoNumero}>{codigoCorto}</span>
      </div>

      {/* Ficha resumen */}
      <div className={styles.ficha}>
        <div className={styles.fichaGrid}>
          <div>
            <span className={styles.fichaEtiqueta}>{t('profesores.edadLabel')}</span>
            <span className={styles.fichaValor}>
              {caso.edad ? t('profesores.edadValor', { edad: caso.edad }) : '—'}
            </span>
          </div>
          <div>
            <span className={styles.fichaEtiqueta}>{t('profesores.focoIntervencion')}</span>
            <span className={styles.fichaValor}>
              {caso.tipoRiesgoId ? t(`profesores.riesgo_${caso.tipoRiesgoId}`) : caso.tipoRiesgo}
            </span>
          </div>
        </div>
      </div>

      {/* Enlace único con botón copiar */}
      <div>
        <label className={styles.enlaceLabel} htmlFor="enlace-caso">
          {t('profesores.enlaceUnicoLabel')}
        </label>
        <div className={styles.enlaceFila}>
          <input id="enlace-caso" type="text" readOnly value={caso.enlace} className={styles.enlaceInput} />
          <button
            type="button"
            onClick={onCopiar}
            className={styles.copiar}
          >
            {copiado ? t('profesores.copiado') : t('profesores.copiarEnlace')}
          </button>
        </div>
      </div>

      {/* Acciones: ver el informe (ámbar, la acción que avanza) y crear otro */}
      <div className={styles.acciones}>
        <Link href={`/servicios/${caso.id}`} className={styles.btnPrimario}>
          <span>{t('profesores.verInforme')}</span>
          <span aria-hidden="true">▤</span>
        </Link>
        <button type="button" onClick={onCrearOtro} className={styles.btnTerciario}>
          {t('profesores.crearOtroCaso')}
        </button>
      </div>
    </div>
  )
}
