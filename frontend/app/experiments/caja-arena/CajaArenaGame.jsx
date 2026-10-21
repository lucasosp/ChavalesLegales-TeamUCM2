'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './arena.module.css'
import Escenario from './Escenario'
import Clima from './Clima'
import { DOGS, Perro } from './Perros'
import { SHELF, STORAGE_KEY, TRAY, VIEW, WEATHER_MAX_MS, WEATHER_MIN_MS, ZONES, inTray, zoneAt } from './config'
import { buildReport } from './metrics'
import { downloadJson, readStorage, useLongPress, writeStorage } from '../shared'
import { useT } from '../../../lib/i18n'

const SLOT_W = (TRAY.w - 220) / (DOGS.length - 1)
const shelfSlot = (i) => ({ x: TRAY.x + 100 + i * SLOT_W, y: SHELF.y + 128 })
const initialPositions = () => Object.fromEntries(DOGS.map((d, i) => [d.id, { ...shelfSlot(i), placed: false, flip: false }]))
const snap = (p) => ({ x: Math.round(p.x), y: Math.round(p.y), zone: p.placed ? zoneAt(p.x, p.y) : 'estante' })

export default function CajaArenaGame({ embedded = false, onFinish }) {
  const t = useT()
  const [phase, setPhase] = useState('intro') // intro | play | story | done
  const [positions, setPositions] = useState(initialPositions)
  const [dragging, setDragging] = useState(null)
  const [weather, setWeather] = useState(null)
  const [toast, setToast] = useState(null)
  const [story, setStory] = useState('')
  const [showPanel, setShowPanel] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  const svgRef = useRef(null)
  const posRef = useRef(positions)
  const dragRef = useRef(null)
  const eventsRef = useRef([])
  const t0Ref = useRef(0)
  const startedAtRef = useRef(null)
  const reportRef = useRef(null)
  const panelPress = useLongPress(() => {
    setSavedCount(readStorage(STORAGE_KEY, []).length)
    setShowPanel(true)
  })

  posRef.current = positions
  const placedCount = DOGS.filter((d) => positions[d.id].placed).length
  const elapsed = () => Math.round(performance.now() - t0Ref.current)

  const start = () => {
    t0Ref.current = performance.now()
    startedAtRef.current = new Date().toISOString()
    eventsRef.current = []
    setPhase('play')
  }

  const triggerWeather = useCallback(() => {
    const counts = Object.fromEntries(ZONES.map((z) => [z.id, 0]))
    Object.values(posRef.current).forEach((p) => {
      if (!p.placed) return
      const z = zoneAt(p.x, p.y)
      if (z in counts) counts[z]++
    })
    const max = Math.max(...Object.values(counts))
    const candidates = max > 0 ? ZONES.filter((z) => counts[z.id] === max) : ZONES
    const zone = candidates[Math.floor(Math.random() * candidates.length)]
    const type = zone.weathers[Math.floor(Math.random() * zone.weathers.length)]
    setWeather({
      zone: zone.id,
      type,
      atMs: elapsed(),
      selectionRule: max > 0 ? 'ecosistema con más perros' : 'aleatorio (sin perros en ecosistemas)',
      dogsInZoneAtStart: DOGS.filter((d) => {
        const p = posRef.current[d.id]
        return p.placed && zoneAt(p.x, p.y) === zone.id
      }).map((d) => d.id),
    })
    setToast({ zone: zone.id, type })
    setTimeout(() => setToast(null), 5200)
  }, [])

  useEffect(() => {
    if (phase !== 'play' || weather) return
    const id = setInterval(() => {
      const t = elapsed()
      const anyPlaced = Object.values(posRef.current).some((p) => p.placed)
      if ((t >= WEATHER_MIN_MS && anyPlaced) || t >= WEATHER_MAX_MS) triggerWeather()
    }, 500)
    return () => clearInterval(id)
  }, [phase, weather, triggerWeather])

  const toSvg = (e) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM().inverse())
  }

  const onDogDown = (e, id) => {
    if (phase !== 'play') return
    e.preventDefault()
    svgRef.current.setPointerCapture(e.pointerId)
    const p = toSvg(e)
    const pos = posRef.current[id]
    dragRef.current = { id, dx: p.x - pos.x, dy: p.y - pos.y, sx: p.x, sy: p.y, lastX: p.x, x: pos.x, y: pos.y, from: snap(pos), wasPlaced: pos.placed, t: performance.now(), moved: false }
    setDragging(id)
  }

  const onMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const p = toSvg(e)
    if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true
    const vx = p.x - drag.lastX
    drag.lastX = p.x
    drag.x = p.x - drag.dx
    drag.y = p.y - drag.dy
    if (Math.abs(vx) > 3) drag.flip = vx < 0
    setPositions((prev) => {
      const cur = prev[drag.id]
      const flip = Math.abs(vx) > 3 ? vx < 0 : cur.flip
      return { ...prev, [drag.id]: { ...cur, x: p.x - drag.dx, y: p.y - drag.dy, flip } }
    })
  }

  const onUp = () => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setDragging(null)
    const idx = DOGS.findIndex((d) => d.id === drag.id)
    // La posición sale del propio arrastre: el último render puede no haber llegado aún
    const prev = posRef.current[drag.id]
    const cur = { ...prev, x: drag.x, y: drag.y, flip: drag.flip ?? prev.flip }
    const holdMs = Math.round(performance.now() - drag.t)
    const log = (action, to) => eventsRef.current.push({ t: elapsed(), dogId: drag.id, action, from: drag.from, to, holdMs })

    if (!drag.moved) {
      // Un toque sin arrastrar gira al perro (solo si ya está en la bandeja)
      if (drag.wasPlaced) {
        const next = { ...cur, flip: !cur.flip }
        setPositions((prev) => ({ ...prev, [drag.id]: next }))
        log('girar', snap(next))
      } else {
        setPositions((prev) => ({ ...prev, [drag.id]: { ...shelfSlot(idx), placed: false, flip: false } }))
      }
      return
    }

    if (inTray(cur.x, cur.y)) {
      const next = { ...cur, placed: true }
      setPositions((prev) => ({ ...prev, [drag.id]: next }))
      log(drag.wasPlaced ? 'mover' : 'colocar', snap(next))
    } else {
      setPositions((prev) => ({ ...prev, [drag.id]: { ...shelfSlot(idx), placed: false, flip: false } }))
      if (drag.wasPlaced) log('retirar', { zone: 'estante' })
    }
  }

  const makeReport = (storyText = story) => buildReport({
    dogs: DOGS,
    positions: posRef.current,
    events: eventsRef.current,
    weather,
    startedAt: startedAtRef.current,
    endedAt: new Date().toISOString(),
    story: storyText.trim(),
  })

  const finish = () => {
    reportRef.current = makeReport()
    setPhase('story')
  }

  const saveAndClose = () => {
    const report = { ...reportRef.current, story: story.trim() || null }
    writeStorage(STORAGE_KEY, [...readStorage(STORAGE_KEY, []), report])
    reportRef.current = report
    setPhase('done')
  }

  const restart = () => {
    setPositions(initialPositions())
    setWeather(null)
    setStory('')
    reportRef.current = null
    setPhase('intro')
  }

  // Los perros en la bandeja se pintan por profundidad; el que se arrastra, siempre encima
  const order = [...DOGS].sort((a, b) => {
    if (a.id === dragging) return 1
    if (b.id === dragging) return -1
    return positions[a.id].y - positions[b.id].y
  })

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        {embedded ? <span /> : <Link href="/" className={styles.btnGhost}>{t('juegos.inicioBtn')}</Link>}
        <h1 className={styles.title}>{t('juegos.arenaTitulo')}</h1>
        <div className={styles.topRight}>
          {phase === 'play' && (
            <button type="button" className={styles.btnPrimary} onClick={finish} disabled={placedCount === 0}>
              {t('juegos.arenaTerminado')}
            </button>
          )}
          <button type="button" className={styles.gear} title={t('juegos.arenaPanelHint')} aria-label={t('juegos.arenaPanelAria')} {...panelPress}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" /></svg>
          </button>
        </div>
      </header>

      <main className={styles.stage}>
        <div className={styles.layer}><Escenario /></div>
        {weather && <div className={styles.layer}><Clima weather={weather} /></div>}
        <div className={`${styles.layer} ${styles.interactive}`}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
            preserveAspectRatio="xMidYMid meet"
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            role="application"
            aria-label={t('juegos.arenaAria')}
          >
            {DOGS.map((d, i) => {
              const s = shelfSlot(i)
              return (
                <g key={`tag-${d.id}`} transform={`translate(${s.x} ${SHELF.y + 156})`} opacity={positions[d.id].placed ? 0.35 : 1}>
                  <text textAnchor="middle" className={styles.dogName}>{d.name}</text>
                  <text y="17" textAnchor="middle" className={styles.dogTrait}>{t(`juegos.arenaRasgo_${d.id}`)}</text>
                </g>
              )
            })}
            {order.map((d) => {
              const p = positions[d.id]
              return (
                <g
                  key={d.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className={phase === 'play' ? styles.dog : undefined}
                  onPointerDown={(e) => onDogDown(e, d.id)}
                  role="button"
                  aria-label={t('juegos.arenaPerroAria', { nombre: d.name, rasgo: t(`juegos.arenaRasgo_${d.id}`) })}
                >
                  <rect x={-d.width * 0.5} y="-120" width={d.width} height="130" fill="transparent" />
                  <Perro dog={d} flip={p.flip} lifted={dragging === d.id} idle={p.placed && dragging !== d.id} />
                </g>
              )
            })}
          </svg>
        </div>
        {toast && <div className={styles.toast} role="status">{t(`juegos.arenaClima_${toast.zone}_${toast.type}`)}</div>}
      </main>

      {phase === 'intro' && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <span className={styles.badge}>{t('juegos.arenaIntroBadge')}</span>
            <h2 className={styles.dialogTitle}>{t('juegos.arenaIntroTitulo')}</h2>
            <p className={styles.dialogText}>
              {t('juegos.arenaIntroTexto')}
            </p>
            <button type="button" className={styles.btnPrimary} onClick={start}>{t('juegos.arenaEmpezar')}</button>
          </div>
        </div>
      )}

      {phase === 'story' && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <h2 className={styles.dialogTitle}>{t('juegos.arenaHistoriaTitulo')}</h2>
            <p className={styles.dialogText}>{t('juegos.arenaHistoriaTexto')}</p>
            <textarea className={styles.textarea} rows={4} value={story} onChange={(e) => setStory(e.target.value)} placeholder={t('juegos.arenaHistoriaPlaceholder')} maxLength={1200} />
            <div className={styles.row}>
              <button type="button" className={styles.btnGhost} onClick={() => setPhase('play')}>{t('juegos.arenaSeguirJugando')}</button>
              <button type="button" className={styles.btnPrimary} onClick={saveAndClose}>{t('juegos.arenaTerminar')}</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className={styles.overlay}>
          <div className={styles.dialog}>
            <div className={styles.stars} aria-hidden="true">★ ★ ★</div>
            <h2 className={styles.dialogTitle}>{t('juegos.graciasTitulo')}</h2>
            <p className={styles.dialogText}>{t('juegos.arenaFinTexto')}</p>
            <div className={styles.row}>
              {embedded ? (
                <button type="button" className={styles.btnPrimary} onClick={() => onFinish?.(reportRef.current)}>{t('juegos.seguirHistoria')}</button>
              ) : (
                <>
                  <Link href="/" className={styles.btnPrimary}>{t('juegos.volverInicio')}</Link>
                  <button type="button" className={styles.btnGhost} onClick={restart}>{t('juegos.arenaOtroMundo')}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showPanel && (
        <div className={styles.overlay} onClick={() => setShowPanel(false)}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ar-panel-title">
            <h2 id="ar-panel-title" className={styles.panelTitle}>{t('juegos.arenaPanelTitulo')}</h2>
            <p className={styles.panelText}>
              {t('juegos.arenaPanelTexto')}{' '}
              {t('juegos.arenaSesionesGuardadas')} <strong>{savedCount}</strong>.
            </p>
            <div className={styles.row}>
              <button type="button" className={styles.btn} disabled={phase === 'intro' && !reportRef.current}
                onClick={() => downloadJson(reportRef.current && phase === 'done' ? reportRef.current : makeReport(), 'caja-arena')}>
                {t('juegos.exportarActual')}
              </button>
              <button type="button" className={styles.btn} onClick={() => downloadJson(readStorage(STORAGE_KEY, []), 'caja-arena-sesiones')}>
                {t('juegos.exportarTodas')}
              </button>
              {phase === 'play' && !weather && (
                <button type="button" className={styles.btn} onClick={() => { triggerWeather(); setShowPanel(false) }}>{t('juegos.arenaLanzarEvento')}</button>
              )}
              <button type="button" className={styles.btnDanger} onClick={() => {
                if (confirm(t('juegos.arenaBorrarConfirm'))) {
                  writeStorage(STORAGE_KEY, [])
                  setSavedCount(0)
                }
              }}>{t('juegos.arenaBorrar')}</button>
              <button type="button" className={styles.btnGhost} onClick={() => setShowPanel(false)}>{t('juegos.cerrar')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
