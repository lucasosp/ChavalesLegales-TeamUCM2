'use client'

import styles from './servicios.module.css'
import { Barras, BarrasH, LineaTiempo } from './Graficas'
import { fmtDuracion, fmtSeg } from './analisis'
import { useT } from '../../lib/i18n'
import { cap } from './piezas'
import { useTr } from './useTr'
import MesaCID from '../experiments/cid-table/MesaCID'
import { ROUNDS } from '../experiments/cid-table/config'
import Escenario from '../experiments/caja-arena/Escenario'
import Clima from '../experiments/caja-arena/Clima'
import { DOGS, Perro } from '../experiments/caja-arena/Perros'
import { VIEW } from '../experiments/caja-arena/config'

const CRITERIO = { 'ecosistema con más perros': 'criterio_masPerros', 'aleatorio (sin perros en ecosistemas)': 'criterio_aleatorio' }

export function Mesa({ report }) {
  const t = useT()
  const tr = useTr()
  const persona = (id, nombre) => tr(`persona_${id}`, nombre)
  const colores = Object.fromEntries((report.config?.characters ?? []).map((c) => [c.id, c.color]))
  const nombre = (id) => persona(id, report.rounds[0]?.distances.find((d) => d.characterId === id)?.name ?? id)
  return (
    <>
      <div className={styles.tres}>
        {report.rounds.map((r) => {
          const ronda = ROUNDS.find((x) => x.id === r.roundId)
          const seating = r.distances.map((d) => ({ id: d.characterId, name: d.name, seat: d.seatIndex, color: colores[d.characterId] ?? 'var(--neutro-400)' }))
          return (
            <figure key={r.roundId} className={styles.figura}>
              <MesaCID totalSeats={report.config.totalSeats} seating={seating} childSeat={r.childSeat} childAvatar={report.config.childAvatar} theme={ronda?.theme ?? 'daily'} locked onSelect={() => {}} />
              <figcaption>
                <strong>{tr(`ronda_${r.roundId}`, r.title)}</strong>
                <span>{t('informe.mesaRespuesta', { tiempo: fmtSeg(r.reactionTimeMs), sillas: r.seatsConsidered ?? '—' })}</span>
                <span>{t('informe.mesaCercaLejos', { cerca: nombre(r.closestCharacterId), lejos: nombre(r.furthestCharacterId) })}</span>
              </figcaption>
            </figure>
          )
        })}
      </div>
      <h3 className={styles.h3}>{t('informe.mesaDistanciaTitulo')}</h3>
      <BarrasH
        datos={report.summary.characterSummary.map((c) => ({ etiqueta: persona(c.characterId, c.name), valor: c.meanEuclidean, color: colores[c.characterId] }))}
        formato={(v) => Math.round(v)}
      />
      <div className={styles.tablaScroll}>
        <table className={styles.tabla}>
          <thead><tr><th>{t('informe.colPersona')}</th><th>{t('informe.colDistanciaMedia')}</th><th>{t('informe.colVecesCercana')}</th><th>{t('informe.colVecesLejana')}</th></tr></thead>
          <tbody>
            {report.summary.characterSummary.map((c) => (
              <tr key={c.characterId}><td>{persona(c.characterId, c.name)}</td><td>{Math.round(c.meanEuclidean)}</td><td>{c.closestCount}</td><td>{c.furthestCount}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className={styles.h3}>{t('informe.mesaTiempoTitulo')}</h3>
      <Barras datos={report.rounds.map((r, i) => ({ etiqueta: t('informe.ronda', { n: i + 1 }), titulo: tr(`ronda_${r.roundId}`, r.title), valor: r.reactionTimeMs / 1000 }))} unidad=" s" formato={(v) => v.toFixed(1)} alto={180} />
    </>
  )
}

export function Mundo({ report }) {
  const t = useT()
  const tr = useTr()
  const zona = (z) => tr(`zona_${z}`, z)
  const rasgo = (d) => tr(`rasgo_${d.id}`, d.trait)
  const accion = (a) => tr(`accion_${a}`, a)
  const lista = (xs) => xs.join(', ') || t('informe.ninguno')
  const placed = report.dogs.filter((d) => d.placed)
  const dogsById = Object.fromEntries(DOGS.map((d) => [d.id, d]))
  const nombre = (id) => dogsById[id]?.name ?? id
  const w = report.weather
  return (
    <>
      <figure className={styles.figura}>
        <div className={styles.mundo}>
          <div className={styles.capa}><Escenario /></div>
          {w && <div className={styles.capa}><Clima weather={w} /></div>}
          <div className={styles.capa}>
            <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} preserveAspectRatio="xMidYMid meet">
              {[...placed].sort((a, b) => a.y - b.y).map((d) => (
                <g key={d.id} transform={`translate(${d.x} ${d.y})`}>
                  <Perro dog={dogsById[d.id]} flip={d.facing === 'izquierda'} />
                </g>
              ))}
            </svg>
          </div>
        </div>
        <figcaption>
          <strong>{t('informe.mundoFinal')}</strong>
          <span>{t('informe.mundoResumen', { duracion: fmtDuracion(report.durationMs), colocados: report.summary.dogsPlaced, total: report.dogs.length, acciones: report.summary.totalActions })}</span>
        </figcaption>
      </figure>

      <div className={styles.dos}>
        <div>
          <h3 className={styles.h3}>{t('informe.perrosPorEcosistema')}</h3>
          <BarrasH ancho={360} datos={Object.entries(report.summary.zoneCounts).map(([z, n]) => ({ etiqueta: cap(zona(z)), valor: n, color: z === w?.zone ? 'var(--naranja-700)' : undefined }))} />
          {w && <p className={styles.leyenda}><span className={styles.swatch} /> {t('informe.ecosistemaAfectado')}</p>}
        </div>
        <div>
          <h3 className={styles.h3}>{t('informe.ordenColocacion')}</h3>
          <ol className={styles.orden}>
            {report.summary.placementOrder.map((id) => {
              const d = report.dogs.find((x) => x.id === id)
              return <li key={id}><strong>{nombre(id)}</strong> {t('informe.ordenItem', { rasgo: rasgo(d), zona: cap(tr(`zona_${d.zone}`, t('informe.retirado'))), tiempo: fmtSeg(d.firstPlacedMs) })}</li>
            })}
          </ol>
          {!!report.dogs.filter((d) => !d.placed).length && (
            <p className={styles.leyenda}>{t('informe.noColocados', { lista: report.dogs.filter((d) => !d.placed).map((d) => `${d.name} (${rasgo(d)})`).join(', ') })}</p>
          )}
        </div>
      </div>

      {w && (
        <div className={styles.evento}>
          <h3 className={styles.h3}>{t('informe.eventoMeteo')}</h3>
          <dl className={styles.dl}>
            <dt>{t('informe.dtEvento')}</dt><dd>{cap(tr(`eventoEn_${w.zone}`, `${w.type} · ${w.zone}`, { evento: tr(`clima_${w.type}`, w.type) }))}</dd>
            <dt>{t('informe.dtMomento')}</dt><dd>{t('informe.ddMomento', { tiempo: fmtSeg(w.atMs), criterio: CRITERIO[w.selectionRule] ? t(`informe.${CRITERIO[w.selectionRule]}`) : w.selectionRule })}</dd>
            <dt>{t('informe.dtPerrosInicio')}</dt><dd>{lista((w.dogsInZoneAtStart ?? []).map(nombre))}</dd>
            <dt>{t('informe.dtPrimeraAccion')}</dt><dd>{w.reactionLatencyMs != null ? t('informe.ddDespues', { tiempo: fmtSeg(w.reactionLatencyMs) }) : t('informe.sinAccionesPosteriores')}</dd>
            <dt>{t('informe.dtAccionesPosteriores')}</dt><dd>{report.summary.actionsAfterWeather}</dd>
            <dt>{t('informe.dtSacados')}</dt><dd>{lista(report.summary.dogsLeftWeatherZone.map(nombre))}</dd>
            <dt>{t('informe.dtLlevados')}</dt><dd>{lista(report.summary.dogsEnteredWeatherZone.map(nombre))}</dd>
            <dt>{t('informe.dtAlTerminar')}</dt><dd>{lista(report.summary.dogsInWeatherZoneAtEnd.map(nombre))}</dd>
          </dl>
        </div>
      )}

      <h3 className={styles.h3}>{t('informe.secuenciaAcciones')}</h3>
      <LineaTiempo
        duracion={report.durationMs}
        marcas={report.events.filter((e) => e.action !== 'soltar_fuera').map((e) => ({ t: e.t, tipo: e.action, etiqueta: `${nombre(e.dogId)}: ${accion(e.action)}` }))}
        eventos={w ? [{ t: w.atMs, etiqueta: tr(`climaCorto_${w.type}`, cap(w.type)) }] : []}
      />

      <div className={styles.tablaScroll}>
        <table className={styles.tabla}>
          <thead><tr><th>{t('informe.colPerro')}</th><th>{t('informe.colEcosistemaFinal')}</th><th>{t('informe.colMovimientos')}</th><th>{t('informe.colGiros')}</th><th>{t('informe.colPerroCercano')}</th><th>{t('informe.colDistCentro')}</th></tr></thead>
          <tbody>
            {report.dogs.map((d) => (
              <tr key={d.id}>
                <td>{d.name} <small>({rasgo(d)})</small></td>
                <td>{d.placed ? cap(zona(d.zone)) : t('informe.noColocado')}</td>
                <td>{d.moves}</td>
                <td>{d.turns}</td>
                <td>{d.nearestDogId ? `${nombre(d.nearestDogId)} (${Math.round(d.nearestDogDistance)})` : '—'}</td>
                <td>{d.distanceToCenter != null ? Math.round(d.distanceToCenter) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.leyenda}>{t('informe.distanciaMediaPerros', { valor: report.summary.meanPairDistance ?? '—' })}</p>

      {report.story && (
        <blockquote className={styles.cita}>
          <span>{t('informe.relatoMenor')}</span>
          “{report.story}”
        </blockquote>
      )}
    </>
  )
}

// Δ entre la fase 1 y la fase 2 tal como lo calculó el motor (avatarStore.#computeDelta).
// El dato ya llegaba al informe dentro del snapshot 'dibujo' y se descartaba: aquí solo
