export const VIEW = { width: 800, height: 540, cx: 400, cy: 270 }
const SEAT_RX = 300
const SEAT_RY = 195

export function seatAngleDeg(index, totalSeats) {
  return -90 + (360 / totalSeats) * index
}

export function seatPosition(index, totalSeats) {
  const rad = (seatAngleDeg(index, totalSeats) * Math.PI) / 180
  return {
    x: Math.round((VIEW.cx + SEAT_RX * Math.cos(rad)) * 10) / 10,
    y: Math.round((VIEW.cy + SEAT_RY * Math.sin(rad)) * 10) / 10,
  }
}

export function seatingForRound(characters, round, totalSeats) {
  return characters.map((c) => ({
    ...c,
    seat: (c.seatDefault + round.seatShift) % totalSeats,
  }))
}

export function computeRoundMetrics({ round, roundIndex, childSeat, seating, totalSeats, reactionTimeMs, hoverSequence = [], firstHoverMs = null }) {
  const childPos = seatPosition(childSeat, totalSeats)
  const childAngle = seatAngleDeg(childSeat, totalSeats)

  const distances = seating.map((c) => {
    const pos = seatPosition(c.seat, totalSeats)
    const rawAngle = Math.abs(childAngle - seatAngleDeg(c.seat, totalSeats)) % 360
    const angularDeg = Math.min(rawAngle, 360 - rawAngle)
    return {
      characterId: c.id,
      name: c.name,
      seatIndex: c.seat,
      euclidean: Math.round(Math.hypot(childPos.x - pos.x, childPos.y - pos.y) * 10) / 10,
      angularDeg: Math.round(angularDeg * 10) / 10,
      seatSteps: Math.round(angularDeg / (360 / totalSeats)),
    }
  })

  const sorted = [...distances].sort((a, b) => a.euclidean - b.euclidean)

  return {
    roundIndex: roundIndex + 1,
    roundId: round.id,
    title: round.title,
    childSeat,
    childPosition: childPos,
    reactionTimeMs: Math.round(reactionTimeMs),
    firstHoverMs: firstHoverMs === null ? null : Math.round(firstHoverMs),
    hoverSequence,
    seatsConsidered: new Set(hoverSequence).size,
    distances,
    closestCharacterId: sorted[0]?.characterId ?? null,
    furthestCharacterId: sorted[sorted.length - 1]?.characterId ?? null,
    timestamp: new Date().toISOString(),
  }
}

export function buildReport(config, rounds) {
  const byCharacter = {}
  for (const r of rounds) {
    for (const d of r.distances) {
      byCharacter[d.characterId] ??= { name: d.name, euclidean: [], closestCount: 0, furthestCount: 0 }
      byCharacter[d.characterId].euclidean.push(d.euclidean)
    }
    if (byCharacter[r.closestCharacterId]) byCharacter[r.closestCharacterId].closestCount++
    if (byCharacter[r.furthestCharacterId]) byCharacter[r.furthestCharacterId].furthestCount++
  }

  const characterSummary = Object.entries(byCharacter).map(([id, v]) => ({
    characterId: id,
    name: v.name,
    meanEuclidean: Math.round((v.euclidean.reduce((a, b) => a + b, 0) / v.euclidean.length) * 10) / 10,
    closestCount: v.closestCount,
    furthestCount: v.furthestCount,
  }))

  const times = rounds.map((r) => r.reactionTimeMs)

  return {
    instrument: 'Comfortable Interpersonal Distance Scale (Duke & Nowicki, 1972) · adaptación mesa',
    createdAt: new Date().toISOString(),
    config,
    rounds,
    summary: {
      meanReactionTimeMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
      characterSummary: characterSummary.sort((a, b) => a.meanEuclidean - b.meanEuclidean),
    },
  }
}
