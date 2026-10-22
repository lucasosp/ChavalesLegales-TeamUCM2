// Tests de la derivación del informe. `analisis.js` es puro y es el único sitio donde un
// error de matemáticas se publica como informe profesional, así que merece tests propios.
//
//   cd frontend && npm test
//
// Sin dependencias: node:test + node:assert. Node 22 detecta el ESM de analisis.js.
import test from 'node:test'
import assert from 'node:assert/strict'

import { analizar, tEvento, fmtDuracion, fmtSeg, mediana, desviacion, media } from '../app/informe/analisis.js'

// Atajo: evento con reloj de servidor (esquema 2). El `t` del cliente va desfasado a propósito
// en algunos tests para comprobar que se ignora.
const ev = (kind, tServidor, data = {}, tCliente = tServidor) => ({ kind, t: tCliente, t_servidor: tServidor, data })

test('tEvento prefiere el reloj del servidor y cae al del cliente', () => {
  assert.equal(tEvento({ t: 10, t_servidor: 99 }), 99)
  assert.equal(tEvento({ t: 10 }), 10)
  assert.equal(tEvento({ t_servidor: 0, t: 10 }), 0)
  assert.equal(tEvento(undefined), undefined)
})

test('ordena por reloj de servidor aunque el del cliente esté desordenado', () => {
  const caso = {
    eventos: [
      ev('progreso', 300, { node_id: 'c', chapter: 1, node_type: 'dialogue' }, 3),
      ev('inicio', 100, {}, 9000),
      ev('progreso', 200, { node_id: 'b', chapter: 1, node_type: 'dialogue' }, 1),
    ],
  }
  const a = analizar(caso)
  assert.deepEqual(
    a.eventos.map((e) => tEvento(e)),
    [100, 200, 300],
  )
  assert.equal(a.inicio, 100)
  assert.equal(a.ultimo, 300)
  assert.equal(a.duracionMs, 200)
})

test('caso vacío no explota', () => {
  const a = analizar({})
  assert.equal(a.inicio, null)
  assert.equal(a.ultimo, null)
  assert.equal(a.duracionMs, 0)
  assert.deepEqual(a.decisiones, [])
  assert.deepEqual(a.capitulos, [])
  assert.equal(a.terminado, false)
  assert.equal(a.dibujo, null)
})

test('latencia de decisiones: mediana, media y destacadas', () => {
  const tiempos = [1000, 2000, 3000, 9000] // mediana 2500
  const caso = {
    eventos: tiempos.map((ms, i) =>
      ev('decision', 1000 + i * 100, { node_id: `n${i}`, chapter: 1, time_ms: ms }),
    ),
  }
  const a = analizar(caso)
  assert.equal(a.decisiones.length, 4)
  assert.equal(a.latencia.mediana, 2500)
  assert.equal(a.latencia.media, 3750)
  assert.equal(a.latencia.min, 1000)
  assert.equal(a.latencia.max, 9000)
  // con >=3 decisiones, >1.75x la mediana (4375) es destacada
  assert.deepEqual(
    a.decisiones.map((d) => d.destacada),
    [false, false, false, true],
  )
  assert.equal(a.decisiones[3].relativa, 3.6)
})

test('no marca destacadas con menos de tres decisiones', () => {
  const caso = { eventos: [
    ev('decision', 1, { time_ms: 100 }),
    ev('decision', 2, { time_ms: 5000 }),
  ] }
  assert.deepEqual(analizar(caso).decisiones.map((d) => d.destacada), [false, false])
})

test('capítulos: lectura acumulada, tope por pantalla, relecturas y pausas', () => {
  const caso = { eventos: [
    ev('inicio', 0),
    ev('progreso', 0, { node_id: 'a', chapter: 1, node_type: 'dialogue' }),
    ev('progreso', 5000, { node_id: 'b', chapter: 1, node_type: 'dialogue' }),
    ev('progreso', 10000, { node_id: 'a', chapter: 1, node_type: 'dialogue' }), // relectura
    ev('progreso', 200000, { node_id: 'c', chapter: 2, node_type: 'dialogue' }), // pausa larga
  ] }
  const a = analizar(caso)
  assert.equal(a.relecturas, 1)
  assert.equal(a.pantallasVistas, 3)
  assert.equal(a.pausasLargas, 1) // 190 s > 60 s

  const cap1 = a.capitulos.find((c) => c.capitulo === 1)
  assert.equal(cap1.pantallas, 3)
  assert.equal(cap1.relecturas, 1)
  // 5000 + 5000 + min(190000, 120000) = 130000
  assert.equal(cap1.lecturaMs, 130000)
  assert.ok(a.capitulos.some((c) => c.capitulo === 2))
})

test('un nodo external no acumula tiempo de lectura', () => {
  const caso = { eventos: [
    ev('progreso', 0, { node_id: 'ext', chapter: 3, node_type: 'external' }),
    ev('progreso', 60000, { node_id: 'x', chapter: 3, node_type: 'dialogue' }),
  ] }
  assert.equal(analizar(caso).capitulos.find((c) => c.capitulo === 3).lecturaMs, 0)
})

test('decisiones se cuentan en su capítulo', () => {
  const caso = { eventos: [
    ev('progreso', 0, { node_id: 'a', chapter: 1, node_type: 'dialogue' }),
    ev('decision', 10, { chapter: 1, time_ms: 100 }),
    ev('decision', 20, { chapter: 1, time_ms: 200 }),
    ev('decision', 30, { chapter: 9, time_ms: 300 }), // capítulo sin progreso: se ignora
  ] }
  const a = analizar(caso)
  assert.equal(a.capitulos.find((c) => c.capitulo === 1).decisiones, 2)
  assert.equal(a.capitulos.length, 1)
})

test('minijuegos: duración desde el inicio y gana el último report', () => {
  const caso = { eventos: [
    ev('minijuego-inicio', 1000, { game: 'cid-table' }),
    ev('minijuego', 130000, { game: 'cid-table', report: { v: 1 } }),
    ev('minijuego', 160000, { game: 'cid-table', report: { v: 2 } }),
  ] }
  const a = analizar(caso)
  assert.equal(a.minijuegos['cid-table'].duracionMs, 159000) // desde el inicio más cercano
  assert.deepEqual(a.minijuegos['cid-table'].report, { v: 2 })
})

test('minijuego sin inicio no tiene duración', () => {
  const caso = { eventos: [ev('minijuego', 5000, { game: 'caja-arena', report: {} })] }
  const a = analizar(caso)
  assert.equal(a.minijuegos['caja-arena'].duracionMs, null)
})

test('el dibujo es la última instantánea', () => {
  const caso = { eventos: [
    ev('dibujo', 10, { phase1: 'a' }),
    ev('dibujo', 20, { phase1: 'b', deltaMetrics: { delta_tremor_index: 1 } }),
  ] }
  const a = analizar(caso)
  assert.equal(a.dibujo.phase1, 'b')
  assert.equal(a.dibujo.deltaMetrics.delta_tremor_index, 1)
})

test('terminado cuando hay un nodo ending', () => {
  assert.equal(analizar({ eventos: [ev('progreso', 1, { node_id: 'e', node_type: 'ending' })] }).terminado, true)
  assert.equal(analizar({ eventos: [ev('progreso', 1, { node_id: 'd', node_type: 'dialogue' })] }).terminado, false)
})

test('sesiones separadas por más de 5 segundos', () => {
  const caso = { eventos: [
    ev('inicio', 0), ev('inicio', 1000), ev('inicio', 2000), // misma sesión
    ev('inicio', 20000), // nueva sesión
  ] }
  assert.equal(analizar(caso).sesiones, 2)
})

test('desfase de relojes: sin datos no se marca como no fiable', () => {
  const caso = { eventos: [{ kind: 'inicio', t: 1000, data: {} }] } // esquema 1, sin t_servidor
  const d = analizar(caso).desfase
  assert.equal(d.medido, false)
  assert.equal(d.fiable, true)
  assert.equal(d.medianaMs, null)
})

test('desfase de relojes: un reloj muy desviado invalida las duraciones', () => {
  const caso = { eventos: [
    { kind: 'inicio', t: 1000, t_servidor: 1000, data: {} },
    { kind: 'progreso', t: 2000, t_servidor: 600000, data: { node_id: 'a', chapter: 1, node_type: 'dialogue' } },
  ] }
  const d = analizar(caso).desfase
  assert.equal(d.medido, true)
  assert.equal(d.fiable, false)
  assert.equal(d.maxMs, 598000)
})

test('helpers de formato y estadística', () => {
  assert.equal(fmtSeg(null), '—')
  assert.equal(fmtSeg(1500), '1.5 s')
  assert.equal(fmtDuracion(null), '—')
  assert.equal(fmtDuracion(40000), '40 s')
  assert.equal(fmtDuracion(61000), '1 min 01 s')
  assert.equal(mediana([]), null)
  assert.equal(mediana([3, 1, 2]), 2)
  assert.equal(mediana([4, 1, 3, 2]), 2.5)
  assert.equal(media([2, 4]), 3)
  assert.equal(desviacion([5]), 0)
  assert.ok(desviacion([2, 4, 4, 4, 5, 5, 7, 9]) > 2)
})
