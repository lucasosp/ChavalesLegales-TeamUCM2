'use client'

import { useState } from 'react'
import styles from './cid.module.css'
import { DEFAULT_CONFIG } from './config'

export default function AjustesModal({ config, onSave, onClose, onExport, onExportAll, canExport }) {
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
        <h2 id="cid-settings-title" style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>Ajustes del profesional</h2>
        <p style={{ margin: '0 0 16px', color: '#475569', fontSize: 13 }}>
          Edita nombres y sillas por defecto (0–{draft.totalSeats - 1}, la 0 es la de arriba y siguen en sentido horario). Guardar reinicia la partida.
        </p>

        <div className={styles.field}>
          <input
            className={styles.input}
            value={draft.childAvatar.label}
            aria-label="Etiqueta del niño o niña"
            onChange={(e) => setDraft((p) => ({ ...p, childAvatar: { ...p.childAvatar, label: e.target.value } }))}
          />
          <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>Niño/a</span>
        </div>

        {draft.characters.map((c, i) => (
          <div className={styles.field} key={c.id}>
            <input
              className={styles.input}
              value={c.name}
              aria-label={`Nombre del personaje ${i + 1}`}
              onChange={(e) => updateCharacter(i, { name: e.target.value })}
              style={{ borderLeft: `10px solid ${c.color}` }}
            />
            <select
              className={styles.input}
              value={c.seatDefault}
              aria-label={`Silla de ${c.name}`}
              onChange={(e) => updateCharacter(i, { seatDefault: Number(e.target.value) })}
            >
              {Array.from({ length: draft.totalSeats }, (_, s) => (
                <option key={s} value={s}>Silla {s}</option>
              ))}
            </select>
          </div>
        ))}

        {duplicated && <p className={styles.error}>Dos personajes no pueden ocupar la misma silla.</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={duplicated || draft.characters.some((c) => !c.name.trim())}
            onClick={() => onSave(draft)}
          >
            Guardar y reiniciar
          </button>
          <button type="button" className={styles.btnGhost} onClick={() => setDraft(structuredClone(DEFAULT_CONFIG))}>
            Valores por defecto
          </button>
          <button type="button" className={styles.btn} onClick={onExport} disabled={!canExport}>
            Exportar partida actual
          </button>
          <button type="button" className={styles.btn} onClick={onExportAll}>
            Exportar todas las sesiones
          </button>
          <button type="button" className={styles.btnGhost} onClick={onClose} style={{ marginLeft: 'auto' }}>
            Cerrar
          </button>
        </div>
        {!canExport && (
          <p style={{ fontSize: 12, color: '#64748B', margin: '8px 0 0' }}>El informe estará disponible al completar al menos una ronda.</p>
        )}
      </div>
    </div>
  )
}
