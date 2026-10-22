// Ejecuta el VALIDADOR REAL del motor (LegalinStory/scripts/validate-content.mjs) contra una carpeta
// de contenido generada por este prototipo. Solo lee el validador: no lo modifica y no escribe nada
// en LegalinStory. La carpeta a validar vive dentro de isolated_story_engine/ (o en un directorio
// temporal), nunca en el motor.
//
//   node validacion/validar.mjs <raiz>      # <raiz>/public/content/index.json y <raiz>/public/assets/
import { validateContent } from '../../LegalinStory/scripts/validate-content.mjs'

const raiz = process.argv[2]
if (!raiz) {
  console.error('Uso: node validacion/validar.mjs <raiz>')
  process.exit(2)
}
const informe = await validateContent({ root: raiz })
console.log(JSON.stringify({ ok: informe.ok, errores: informe.errors, avisos: informe.warnings, stats: informe.stats }))
process.exit(informe.ok ? 0 : 1)
