'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './nubes.module.css'
import CidGame from '../experiments/cid-table/CidGame'
import CajaArenaGame from '../experiments/caja-arena/CajaArenaGame'

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

/**
 * Transición de "pensamiento": las nubes entran con el texto, se abren para mostrar el
 * minijuego y, al terminar, vuelven a cubrir la pantalla y se retiran hacia la historia.
 */
export default function MinijuegoNubes({ game, text, onDone }) {
  const [phase, setPhase] = useState('enter') // enter → think → open → play → close → leave
  const timers = useRef([])
  const Game = GAMES[game]
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  useEffect(() => {
    later(() => setPhase('think'), 30)
    later(() => setPhase('open'), 5600)
    later(() => setPhase('play'), 6800)
    return () => timers.current.forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const skipThinking = () => {
    if (phase !== 'think') return
    timers.current.forEach(clearTimeout)
    setPhase('open')
    later(() => setPhase('play'), 1200)
  }

  const finish = (report) => {
    setPhase('close')
    later(() => setPhase('leave'), 1500)
    later(() => onDone(report), 2900)
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
                transitionDelay: `${(covered ? i : CLOUDS.length - i) * 45}ms`,
              }}
            >
              <div className={styles.bob} style={{ animationDelay: `${-i * 0.7}s` }}><Nube size={size} /></div>
            </div>
          )
        })}
        <div className={`${styles.thought} ${phase === 'think' ? styles.thoughtOn : ''}`} aria-live="polite">
          <p className={styles.text}>{text}</p>
          <span className={styles.tail1} /><span className={styles.tail2} /><span className={styles.tail3} />
        </div>
      </div>
    </div>
  )
}
