// Publica el motor de la novela (LegalinStory) junto a Next, en el mismo origen.
//
// Se ejecuta desde `predev` y `prebuild`. Reconstruye con Vite solo cuando el motor o su
// contenido han cambiado: un `next dev` no debería pagar un build de Vite en cada arranque
// (y menos si no ha cambiado nada). Forzar con FORCE_NOVELA_BUILD=1.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const raizNovela = fileURLToPath(new URL("../../LegalinStory", import.meta.url));
const destino = fileURLToPath(new URL("../public/novela", import.meta.url));
const marca = join(destino, "index.html");

// Todo lo que puede cambiar el resultado del build, sin recorrer node_modules ni dist.
const VIGILAR = ["src", "public/content", "index.html", "package.json", "vite.config.js", "vite.config.mjs", "vite.config.ts", "../images", "../fotoss"];

function masReciente(ruta) {
  if (!existsSync(ruta)) return 0;
  const st = statSync(ruta);
  if (!st.isDirectory()) return st.mtimeMs;
  let max = 0;
  for (const hijo of readdirSync(ruta)) {
    if (hijo === "node_modules" || hijo === "dist" || hijo === ".vite") continue;
    max = Math.max(max, masReciente(join(ruta, hijo)));
  }
  return max;
}

const forzar = process.env.FORCE_NOVELA_BUILD === "1";
const fuente = Math.max(...VIGILAR.map((p) => masReciente(join(raizNovela, p))));
const publicado = existsSync(marca) ? statSync(marca).mtimeMs : 0;

if (!forzar && publicado > fuente) {
  console.log("[novela] public/novela está al día, no se reconstruye");
  process.exit(0);
}

const result = spawnSync("npm", ["run", "build", "--", "--base=./", "--outDir=../frontend/public/novela"], {
  cwd: raizNovela,
  stdio: "inherit",
  shell: true,
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
