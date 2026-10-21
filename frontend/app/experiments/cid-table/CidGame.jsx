'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './cid.module.css'
import MesaCID from './MesaCID'
import AjustesModal from './AjustesModal'
import { DEFAULT_CONFIG, ROUNDS, STORAGE_KEYS, roundNarrative, roundTitle } from './config'
import { buildReport, computeRoundMetrics, seatingForRound } from './metrics'
import { downloadJson, readStorage, useLongPress, writeStorage } from '../shared'
import { useT } from '../../../lib/i18n'

// Las métricas se registran en silencio: el niño solo ve la historia, el profesional las exporta desde Ajustes
export default function CidGame({ embedded = false, onFinish }) {
  const t = useT()
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [started, setStarted] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [childSeat, setChildSeat] = useState(null)
  const [results, setResults] = useState([])
  const [showSettings, setShowSettings] = useState(false)
  const startRef = useRef(0)
  const hoverRef = useRef({ sequence: [], firstMs: null })
  const settingsPress = useLongPress(() => setShowSettings(true))

  const round = ROUNDS[roundIndex]
  const finished = results.length === ROUNDS.length
  const seating = useMemo(
    () => seatingForRound(config.characters, round, config.totalSeats),
    [config, round],
  )

  useEffect(() => {
    setConfig(readStorage(STORAGE_KEYS.config, DEFAULT_CONFIG))
  }, [])

  // El cronómetro arranca en el primer frame pintado de cada ronda
  useEffect(() => {
    if (!started) return
    hoverRef.current = { sequence: [], firstMs: null }
    const id = requestAnimationFrame(() => {
      startRef.current = performance.now()
    })
    return () => cancelAnimationFrame(id)
  }, [started, roundIndex, config])

  const handleHover = (seat) => {
    const h = hoverRef.current
    if (h.firstMs === null) h.firstMs = performance.now() - startRef.current
    if (h.sequence[h.sequence.length - 1] !== seat) h.sequence.push(seat)
  }

  const handleSelect = (seat) => {
    if (childSeat !== null) return
    const metrics = computeRoundMetrics({
      round,
      roundIndex,
      childSeat: seat,
      seating,
      totalSeats: config.totalSeats,
      reactionTimeMs: performance.now() - startRef.current,
      hoverSequence: hoverRef.current.sequence,
      firstHoverMs: hoverRef.current.firstMs,
    })
    const next = [...results, metrics]
    setChildSeat(seat)
    setResults(next)
    if (next.length === ROUNDS.length) {
      const sessions = readStorage(STORAGE_KEYS.sessions, [])
      writeStorage(STORAGE_KEYS.sessions, [...sessions, buildReport(config, next)])
    }
  }

  const handleNextRound = () => {
    setChildSeat(null)
    setRoundIndex((i) => i + 1)
  }

  const handleRestart = (newConfig = config) => {
    setConfig(newConfig)
    setRoundIndex(0)
    setChildSeat(null)
    setResults([])
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        {embedded ? <span /> : <Link href="/" className={styles.btnGhost} aria-label={t('juegos.volverInicio')}>{t('juegos.inicioBtn')}</Link>}
        <div className={styles.progress} aria-label={t('juegos.cidProgresoAria', { n: roundIndex + 1, total: ROUNDS.length })}>
          {ROUNDS.map((r, i) => (
            <span key={r.id} className={i < results.length ? styles.dotDone : i === roundIndex ? styles.dotNow : styles.dot} />
          ))}
        </div>
        <button type="button" className={styles.gear} title={t('juegos.cidAjustesHint')} aria-label={t('juegos.cidAjustesAria')} {...settingsPress}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
        </button>
      </header>

      <div className={styles.banner} key={`${roundIndex}-${childSeat !== null}`}>
        <span className={styles.badge}>{roundTitle(t, round)}</span>
        <p className={styles.narrative}>
          {childSeat === null ? roundNarrative(t, round) : t('juegos.cidYaEnMesa')}
        </p>
        {childSeat !== null && !finished && (
          <button type="button" className={styles.btnPrimary} onClick={handleNextRound}>{t('juegos.cidContinuar')}</button>
        )}
      </div>

      <main className={styles.stage}>
        <MesaCID
          totalSeats={config.totalSeats}
          seating={seating}
          childSeat={childSeat}
          childAvatar={config.childAvatar}
          theme={round.theme}
          onSelect={handleSelect}
          onHover={handleHover}
          locked={!started || childSeat !== null}
        />
      </main>

      {!started && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <span className={styles.badge}>{t('juegos.cidIntroBadge')}</span>
            <h1 className={styles.dialogTitle}>{t('juegos.cidIntroTitulo')}</h1>
            <p className={styles.dialogText}>
              {t('juegos.cidIntroTexto')}
            </p>
            <button type="button" className={styles.btnPrimary} onClick={() => setStarted(true)}>{t('juegos.cidEmpezar')}</button>
          </div>
        </div>
      )}

      {finished && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <div className={styles.stars} aria-hidden="true">★ ★ ★</div>
            <h1 className={styles.dialogTitle}>{t('juegos.graciasTitulo')}</h1>
            <p className={styles.dialogText}>{t('juegos.cidFinTexto')}</p>
            <div className={styles.row}>
              {embedded ? (
                <button type="button" className={styles.btnPrimary} onClick={() => onFinish?.(buildReport(config, results))}>{t('juegos.seguirHistoria')}</button>
              ) : (
                <>
                  <Link href="/" className={styles.btnPrimary}>{t('juegos.volverInicio')}</Link>
                  <button type="button" className={styles.btnGhost} onClick={() => handleRestart()}>{t('juegos.cidJugarOtra')}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <AjustesModal
          config={config}
          canExport={results.length > 0}
          onExport={() => downloadJson(buildReport(config, results), 'informe-cid')}
          onExportAll={() => downloadJson(readStorage(STORAGE_KEYS.sessions, []), 'sesiones-cid')}
          onClose={() => setShowSettings(false)}
          onSave={(newConfig) => {
            writeStorage(STORAGE_KEYS.config, newConfig)
            handleRestart(newConfig)
            setShowSettings(false)
          }}
        />
      )}
    </div>
  )
}
