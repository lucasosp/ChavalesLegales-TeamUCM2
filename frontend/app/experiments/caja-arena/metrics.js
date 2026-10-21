import { TRAY, ZONES, zoneAt } from './config'

const r1 = (n) => Math.round(n * 10) / 10
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

// Informe para el profesional. Nunca se muestra al niño: solo se guarda y se exporta desde el panel oculto.
export function buildReport({ dogs, positions, events, weather, startedAt, endedAt, story }) {
  const placed = dogs.filter((d) => positions[d.id]?.placed)
  const center = { x: TRAY.x + TRAY.w / 2, y: TRAY.y + TRAY.h / 2 }
  const weatherAt = weather?.atMs ?? Infinity

  const perDog = dogs.map((d) => {
    const p = positions[d.id]
    const own = events.filter((e) => e.dogId === d.id)
    const firstPlace = own.find((e) => e.action === 'colocar')
    const others = placed.filter((o) => o.id !== d.id)
    const nearest = p.placed && others.length
      ? others.map((o) => ({ id: o.id, d: dist(p, positions[o.id]) })).sort((a, b) => a.d - b.d)[0]
      : null
    const zoneBefore = [...own].reverse().find((e) => e.t < weatherAt && e.to)?.to?.zone ?? null
    const finalZone = p.placed ? zoneAt(p.x, p.y) : null
    return {
      id: d.id,
      name: d.name,
      trait: d.trait,
      placed: p.placed,
      x: p.placed ? r1(p.x) : null,
      y: p.placed ? r1(p.y) : null,
      zone: finalZone,
      facing: p.flip ? 'izquierda' : 'derecha',
      placementOrder: placed.length ? placementOrder(events).indexOf(d.id) + 1 || null : null,
      firstPlacedMs: firstPlace?.t ?? null,
      moves: own.filter((e) => e.action === 'mover').length,
      removals: own.filter((e) => e.action === 'retirar').length,
      turns: own.filter((e) => e.action === 'girar').length,
      totalHoldMs: own.reduce((a, e) => a + (e.holdMs || 0), 0),
      distanceToCenter: p.placed ? r1(dist(p, center)) : null,
      nearestDogId: nearest?.id ?? null,
      nearestDogDistance: nearest ? r1(nearest.d) : null,
      actionsAfterWeather: own.filter((e) => e.t >= weatherAt).length,
      inWeatherZoneBefore: weather ? zoneBefore === weather.zone : null,
      inWeatherZoneAtEnd: weather ? finalZone === weather.zone : null,
    }
  })

  const zoneCounts = Object.fromEntries([...ZONES.map((z) => [z.id, 0]), ['arena', 0]])
  perDog.forEach((d) => d.zone && zoneCounts[d.zone]++)

  const pairs = []
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++)
      pairs.push({ a: placed[i].id, b: placed[j].id, distance: r1(dist(positions[placed[i].id], positions[placed[j].id])) })

  const afterWeather = events.filter((e) => e.t >= weatherAt)
  const firstReaction = afterWeather[0]

  return {
    instrument: 'Técnica del Mundo (Margaret Lowenfeld) · adaptación digital con perros y ecosistemas',
    canvas: { width: 1600, height: 900, tray: TRAY },
    startedAt,
    endedAt,
    durationMs: Date.parse(endedAt) - Date.parse(startedAt),
    weather: weather ? { ...weather, reactionLatencyMs: firstReaction ? firstReaction.t - weather.atMs : null } : null,
    dogs: perDog,
    pairwiseDistances: pairs,
    summary: {
      dogsPlaced: placed.length,
      firstDog: placementOrder(events)[0] ?? null,
      placementOrder: placementOrder(events),
      zoneCounts,
      zonesUsed: Object.values(zoneCounts).filter(Boolean).length,
      emptyZones: Object.entries(zoneCounts).filter(([, n]) => !n).map(([z]) => z),
      meanPairDistance: pairs.length ? r1(pairs.reduce((a, p) => a + p.distance, 0) / pairs.length) : null,
      totalActions: events.length,
      actionsAfterWeather: afterWeather.length,
      dogsInWeatherZoneAtEnd: weather ? perDog.filter((d) => d.inWeatherZoneAtEnd).map((d) => d.id) : [],
      dogsLeftWeatherZone: weather ? perDog.filter((d) => d.inWeatherZoneBefore && !d.inWeatherZoneAtEnd).map((d) => d.id) : [],
      dogsEnteredWeatherZone: weather ? perDog.filter((d) => !d.inWeatherZoneBefore && d.inWeatherZoneAtEnd).map((d) => d.id) : [],
    },
    story: story || null,
    events,
  }
}

function placementOrder(events) {
  const seen = []
  events.forEach((e) => e.action === 'colocar' && !seen.includes(e.dogId) && seen.push(e.dogId))
  return seen
}
