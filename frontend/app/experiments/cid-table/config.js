export const DEFAULT_CONFIG = {
  childAvatar: { id: 'child', label: 'Tú', color: '#FF6B6B' },
  characters: [
    { id: 'mother', name: 'Madre', color: '#4ECDC4', seatDefault: 0 },
    { id: 'father', name: 'Padre', color: '#45B7D1', seatDefault: 2 },
    { id: 'grandfather', name: 'Abuelo', color: '#96CEB4', seatDefault: 4 },
    { id: 'random', name: 'Persona Random', color: '#D4A5A5', seatDefault: 6 },
    { id: 'brother', name: 'Hermano Daniel', color: '#FFE66D', seatDefault: 7 },
  ],
  totalSeats: 8,
}

// seatShift rota a todos los personajes N sillas en sentido horario
export const ROUNDS = [
  {
    id: 'daily-dinner',
    title: 'Ronda 1 · Cena de cada día',
    narrative: 'Es una noche normal y la familia se sienta a cenar. ¿Dónde te quieres sentar?',
    theme: 'daily',
    seatShift: 0,
  },
  {
    id: 'celebration',
    title: 'Ronda 2 · Día de celebración',
    narrative: '¡Hoy hay tarta! Todos han cambiado de sitio para la fiesta. ¿Dónde te sientas ahora?',
    theme: 'celebration',
    seatShift: 1,
  },
  {
    id: 'free-choice',
    title: 'Ronda 3 · Tú eliges',
    narrative: 'La cena termina y todos vuelven a su sitio de siempre. Elige libremente tu silla para cerrar la historia.',
    theme: 'closing',
    seatShift: 0,
  },
]

export const STORAGE_KEYS = {
  config: 'cid_table_config',
  sessions: 'cid_table_sessions',
}
