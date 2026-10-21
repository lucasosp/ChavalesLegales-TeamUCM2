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
        <h2 id="cid-settings-title" style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>{t('juegos.cidAjustesTitulo')}</h2>
        <p style={{ margin: '0 0 16px', color: '#475569', fontSize: 13 }}>
          {t('juegos.cidAjustesTexto', { max: draft.totalSeats - 1 })}
        </p>

        <div className={styles.field}>
          <input
            className={styles.input}
            value={draft.childAvatar.label}
            aria-label={t('juegos.cidEtiquetaNinoAria')}
            onChange={(e) => setDraft((p) => ({ ...p, childAvatar: { ...p.childAvatar, label: e.target.value } }))}
          />
          <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{t('juegos.cidNino')}</span>
        </div>

        {draft.characters.map((c, i) => (
          <div className={styles.field} key={c.id}>
            <input
              className={styles.input}
              value={c.name}
              aria-label={t('juegos.cidNombrePersonajeAria', { n: i + 1 })}
              onChange={(e) => updateCharacter(i, { name: e.target.value })}
              style={{ borderLeft: `10px solid ${c.color}` }}
            />
            <select
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
        ))}

        {duplicated && <p className={styles.error}>{t('juegos.cidErrorSillaDuplicada')}</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
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
          <button type="button" className={styles.btnGhost} onClick={onClose} style={{ marginLeft: 'auto' }}>
            {t('juegos.cerrar')}
          </button>
        </div>
        {!canExport && (
          <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0 0' }}>{t('juegos.cidInformeNoDisponible')}</p>
        )}
      </div>
    </div>
  )
}
