// Tipos de riesgo que ofrece el trabajador social.
//
// Solo se guarda el `value`: el texto se resuelve en la UI con
// t(`profesores.riesgo_${value}`), que existe en las 6 lenguas. Antes había aquí un
// `label` hardcodeado en español que acababa dentro del caso y se mostraba tal cual
// en el informe, aunque la interfaz estuviera en otro idioma.
export const OPCIONES_RIESGO = [
  { value: 'ciberacoso' },
  { value: 'suplantacion' },
  { value: 'grooming' },
  { value: 'control_pareja' },
  { value: 'privacidad' },
]
