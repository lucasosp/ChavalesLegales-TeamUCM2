'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './nubes.module.css'
import CidGame from '../experiments/cid-table/CidGame'
import CajaArenaGame from '../experiments/caja-arena/CajaArenaGame'
import { useT } from '../../lib/i18n'

const GAMES = { 'cid-table': CidGame, 'caja-arena': CajaArenaGame }

// Posición final (cubriendo la pantalla) de cada nube, en % del viewport, y su tamaño en vmax
const CLOUDS = [
  [-12, -14, 52], [26, -20, 50], [62, -16, 54], [-20, 22, 50], [72, 18, 52],
  [-14, 58, 54], [22, 66, 52], [58, 62, 54], [84, 52, 46], [34, 24, 44], [8, 34, 40], [52, 36, 42],
]

function Nube({ size }) {
  return (
    <svg viewBox="0 0 200 110" width={`${size}vmax`} aria-hidden="true">
      <defs>
        <radialGradient id="nube-g" cx="45%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".72" stopColor="#f4f9ff" />
          <stop offset="1" stopColor="#c9dcef" />
        </radialGradient>
      </defs>
      <g fill="url(#nube-g)">
        <circle cx="52" cy="62" r="34" />
        <circle cx="92" cy="42" r="40" />
        <circle cx="138" cy="52" r="34" />
        <circle cx="166" cy="72" r="24" />
        <circle cx="30" cy="80" r="22" />
        <rect x="28" y="66" width="150" height="38" rx="19" />
      </g>
    </svg>
  )
}

function NubeTexto({ children }) {
  return (
    <div className={styles.cloudSpeechContainer}>
      <svg
        className={styles.cloudSpeechSvg}
        viewBox="0 0 900 520"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="nube-shadow" x="-10%" y="-10%" width="125%" height="130%">
            <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#0d3b66" floodOpacity="0.22" />
          </filter>
          <linearGradient id="nube-speech-g" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="85%" stopColor="#f7fbff" />
            <stop offset="100%" stopColor="#d5e8fb" />
          </linearGradient>
        </defs>
        <g filter="url(#nube-shadow)" fill="url(#nube-speech-g)">
          {/* Cuerpo principal con bulbos exteriores amplios para dar máxima área útil */}
          <ellipse cx="450" cy="260" rx="360" ry="175" />
          <ellipse cx="230" cy="260" rx="175" ry="140" />
          <ellipse cx="670" cy="260" rx="175" ry="140" />
          <ellipse cx="330" cy="150" rx="195" ry="135" />
          <ellipse cx="570" cy="150" rx="195" ry="135" />
          <ellipse cx="140" cy="270" rx="120" ry="105" />
          <ellipse cx="760" cy="270" rx="120" ry="105" />
          <ellipse cx="320" cy="370" rx="175" ry="105" />
          <ellipse cx="580" cy="370" rx="175" ry="105" />
          <ellipse cx="450" cy="390" rx="160" ry="95" />
        </g>
      </svg>
      <div className={styles.cloudSpeechContent}>
        {children}
      </div>
    </div>
  )
}

/**
 * Transición de "pensamiento": las nubes entran con el texto en una gran nube,
 * se abren para mostrar el minijuego y, al terminar, vuelven a cubrir la pantalla y se retiran.
 */
export default function MinijuegoNubes({ game, text, onDone }) {
  const t = useT()
  const [phase, setPhase] = useState('enter') // enter → think → open → play → close → leave
  const timers = useRef([])
  const Game = GAMES[game]
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  useEffect(() => {
    later(() => setPhase('think'), 20)
    later(() => setPhase('open'), 3200)
    later(() => setPhase('play'), 3900)
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skipThinking = () => {
    if (phase !== 'think') return
    timers.current.forEach(clearTimeout)
    setPhase('open')
    later(() => setPhase('play'), 700)
  }

  const finish = (report) => {
    setPhase('close')
    later(() => setPhase('leave'), 800)
    later(() => onDone(report), 1500)
  }

  const covered = phase === 'think' || phase === 'close'
  const showGame = ['open', 'play', 'close'].includes(phase)

  return (
    <div className={styles.root}>
      {showGame && Game && <Game embedded onFinish={finish} />}
      <div
        className={`${styles.sky} ${covered ? styles.skyOn : ''} ${phase === 'close' ? styles.skyFast : ''}`}
        style={{ pointerEvents: covered || phase === 'enter' ? 'auto' : 'none' }}
        onClick={skipThinking}
      >
        {CLOUDS.map(([x, y, size], i) => {
          const dx = (x + size / 2 < 50 ? -1 : 1) * 90
          const dy = (y + size / 4 < 45 ? -1 : 1) * 70
          return (
            <div
              key={i}
              className={styles.cloud}
              style={{
                left: `${x}vw`,
                top: `${y}vh`,
                transform: covered ? 'translate(0,0) scale(1)' : `translate(${dx}vw, ${dy}vh) scale(.8)`,
                transitionDelay: `${(covered ? i : CLOUDS.length - i) * 20}ms`,
              }}
            >
              <div className={styles.bob} style={{ animationDelay: `${-i * 0.7}s` }}><Nube size={size} /></div>
            </div>
          )
        })}
        <div
          className={`${styles.thought} ${phase === 'think' ? styles.thoughtOn : ''}`}
          aria-live="polite"
        >
          <NubeTexto>
            <p className={styles.text}>{text}</p>
            <button
              type="button"
              className={styles.skipBtn}
              onClick={(e) => {
                e.stopPropagation()
                skipThinking()
              }}
              title={t('juegos.saltarPensamiento')}
            >
              {t('juegos.saltarPensamiento')} ➔
            </button>
          </NubeTexto>
        </div>
      </div>
    </div>
  )
}
