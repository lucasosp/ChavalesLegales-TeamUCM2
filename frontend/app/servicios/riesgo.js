// El caso guarda el id del riesgo; el texto se resuelve en la lengua del lector.
// Los casos antiguos solo tienen el texto, así que se muestra tal cual.
export const textoRiesgo = (t, meta) =>
  meta?.tipoRiesgoId ? t(`profesores.riesgo_${meta.tipoRiesgoId}`) : meta?.tipoRiesgo
