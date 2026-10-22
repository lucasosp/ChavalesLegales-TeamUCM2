'use client'

import { useState } from 'react'
import styles from './cid.module.css'
import { DEFAULT_CONFIG, characterName } from './config'
import { useT } from '../../../lib/i18n'

export default function AjustesModal({ config, onSave, onClose, onExport, onExportAll, canExport }) {
  const t = useT()
  const [draft, setDraft] = useState(() => structuredClone(config))

  const seats = draft.characters.map((c) => Number(c.seatDefault))
  const duplicated = seats.some((s, i) => seats.indexOf(s) !== i)

  const updateCharacter = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      characters: prev.characters.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }))
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="cid-settings-title" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.cerrarBoton} onClick={onClose} aria-label={t('juegos.cerrar')}>×</button>
        <h2 id="cid-settings-title" className={styles.modalTitle}>{t('juegos.cidAjustesTitulo')}</h2>
        <p className={styles.modalText}>
          {t('juegos.cidAjustesTexto', { max: draft.totalSeats - 1 })}
        </p>

        <div className={styles.personaje}>
          <div className={styles.campo}>
            <label className={styles.etiqueta} htmlFor="cid-ajustes-nino">{t('juegos.cidNino')}</label>
            <input
              id="cid-ajustes-nino"
              className={styles.input}
              value={draft.childAvatar.label}
              aria-label={t('juegos.cidEtiquetaNinoAria')}
              onChange={(e) => setDraft((p) => ({ ...p, childAvatar: { ...p.childAvatar, label: e.target.value } }))}
            />
          </div>
        </div>

        {draft.characters.map((c, i) => (
          <div className={styles.personaje} key={c.id}>
            <div className={styles.campo}>
              <label className={styles.etiqueta} htmlFor={`cid-ajustes-nombre-${c.id}`}>
                <span className={styles.swatch} style={{ background: c.color }} aria-hidden="true" />
                {t('juegos.cidNombrePersonajeAria', { n: i + 1 })}
              </label>
              <input
                id={`cid-ajustes-nombre-${c.id}`}
                className={styles.input}
                value={c.name}
                aria-label={t('juegos.cidNombrePersonajeAria', { n: i + 1 })}
                onChange={(e) => updateCharacter(i, { name: e.target.value })}
              />
            </div>
            <div className={styles.campo}>
              <label className={styles.etiqueta} htmlFor={`cid-ajustes-silla-${c.id}`}>{t('juegos.cidSillaEtiqueta')}</label>
              <select
                id={`cid-ajustes-silla-${c.id}`}
                className={styles.input}
                value={c.seatDefault}
                aria-label={t('juegos.cidSillaDeAria', { nombre: characterName(t, c) })}
                onChange={(e) => updateCharacter(i, { seatDefault: Number(e.target.value) })}
              >
                {Array.from({ length: draft.totalSeats }, (_, s) => (
                  <option key={s} value={s}>{t('juegos.cidSilla', { n: s })}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {duplicated && <p className={styles.error}>{t('juegos.cidErrorSillaDuplicada')}</p>}

        <div className={styles.acciones}>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={duplicated || draft.characters.some((c) => !c.name.trim())}
            onClick={() => onSave(draft)}
          >
            {t('juegos.cidGuardar')}
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => setDraft(structuredClone(DEFAULT_CONFIG))}>
            {t('juegos.cidPorDefecto')}
          </button>
          <button type="button" className={styles.btn} onClick={onExport} disabled={!canExport}>
            {t('juegos.exportarActual')}
          </button>
          <button type="button" className={styles.btn} onClick={onExportAll}>
            {t('juegos.exportarTodas')}
          </button>
        </div>
        {!canExport && (
          <p className={styles.hint}>{t('juegos.cidInformeNoDisponible')}</p>
        )}
      </div>
    </div>
  )
}
