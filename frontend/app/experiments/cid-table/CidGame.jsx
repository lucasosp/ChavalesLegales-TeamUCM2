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
  const [finished, setFinished] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const startRef = useRef(0)
  const selectedTimeRef = useRef(null)
  const hoverRef = useRef({ sequence: [], firstMs: null })
  // El panel se abre con un clic (y también manteniendo pulsado, para que siga
  // funcionando el gesto de siempre: nunca hay un toque accidental del niño
  // porque el botón es una pegatina pequeña en la esquina).
  const openSettings = () => setShowSettings(true)
  const settingsPress = useLongPress(openSettings)

  const round = ROUNDS[roundIndex]
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
    selectedTimeRef.current = null
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
    if (finished) return
    // Si pulsa su propio asiento, se levanta para volver a elegir libremente
    if (seat === childSeat) {
      setChildSeat(null)
      selectedTimeRef.current = null
      return
    }
    const h = hoverRef.current
    if (h.firstMs === null) h.firstMs = performance.now() - startRef.current
    if (h.sequence[h.sequence.length - 1] !== seat) h.sequence.push(seat)
    selectedTimeRef.current = performance.now() - startRef.current
    setChildSeat(seat)
  }

  const handleDeselect = () => {
    setChildSeat(null)
    selectedTimeRef.current = null
  }

  const handleConfirmRound = () => {
    if (childSeat === null) return
    const metrics = computeRoundMetrics({
      round,
      roundIndex,
      childSeat,
      seating,
      totalSeats: config.totalSeats,
      reactionTimeMs: selectedTimeRef.current ?? (performance.now() - startRef.current),
      hoverSequence: hoverRef.current.sequence,
      firstHoverMs: hoverRef.current.firstMs,
    })
    const next = [...results, metrics]
    setResults(next)

    if (roundIndex + 1 >= ROUNDS.length) {
      const sessions = readStorage(STORAGE_KEYS.sessions, [])
      writeStorage(STORAGE_KEYS.sessions, [...sessions, buildReport(config, next)])
      setFinished(true)
    } else {
      setChildSeat(null)
      selectedTimeRef.current = null
      setRoundIndex((i) => i + 1)
    }
  }

  const handleRestart = (newConfig = config) => {
    setConfig(newConfig)
    setRoundIndex(0)
    setChildSeat(null)
    setResults([])
    setFinished(false)
    selectedTimeRef.current = null
  }

  return (
    <div className={styles.page}>
      {/* Fondo orgánico, el mismo de la portada (sin el SVG de curvas) */}
      <div className={styles.bg} aria-hidden="true">
        <span className={styles.bgWave} />
        <span className={styles.bgArc} />
        <span className={styles.bgGlow} />
      </div>

      <header className={styles.topbar}>
        {embedded ? <span /> : <Link href="/" className={`${styles.btnGhost} ${styles.back}`} aria-label={t('juegos.volverInicio')}>{t('juegos.inicioBtn')}</Link>}
        <div className={styles.progress} aria-label={t('juegos.cidProgresoAria', { n: roundIndex + 1, total: ROUNDS.length })}>
          {ROUNDS.map((r, i) => (
            <span key={r.id} className={i < results.length ? styles.dotDone : i === roundIndex ? styles.dotNow : styles.dot} />
          ))}
        </div>
        <div className={styles.topbarRight}>
          <button type="button" className={styles.gear} title={t('juegos.cidAjustesHint')} aria-label={t('juegos.cidAjustesAria')} onClick={openSettings} {...settingsPress}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
          </button>
        </div>
      </header>

      <div className={styles.banner} key={`${roundIndex}-${childSeat !== null}`}>
        <span className={styles.badge}>{roundTitle(t, round)}</span>
        <p className={styles.narrative}>
          {childSeat === null ? roundNarrative(t, round) : t('juegos.cidYaEnMesa')}
        </p>
        {childSeat !== null && !finished && (
          <div className={styles.bannerActions}>
            <button type="button" className={styles.btnGhost} onClick={handleDeselect}>{t('juegos.cidCambiarAsiento')}</button>
            <button type="button" className={styles.btnPrimary} onClick={handleConfirmRound}>{t('juegos.cidContinuar')}</button>
          </div>
        )}
      </div>

      <main className={styles.stage}>
        <div className={styles.stageCard}>
          <MesaCID
            totalSeats={config.totalSeats}
            seating={seating}
            childSeat={childSeat}
            childAvatar={config.childAvatar}
            theme={round.theme}
            onSelect={handleSelect}
            onHover={handleHover}
            locked={!started || finished}
          />
        </div>
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
