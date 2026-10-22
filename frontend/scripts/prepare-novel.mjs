// Publica el motor de la novela (LegalinStory) junto a Next, en el mismo origen.
//
// Se ejecuta desde `predev` y `prebuild`. Reconstruye con Vite solo cuando el motor o su
// contenido han cambiado: un `next dev` no debería pagar un build de Vite en cada arranque
// (y menos si no ha cambiado nada). Forzar con FORCE_NOVELA_BUILD=1.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
  if (!existsSync(join(destino, "precarga.json"))) escribirPrecarga();
  process.exit(0);
}

const result = spawnSync("npm", ["run", "build", "--", "--base=./", "--outDir=../frontend/public/novela", "--emptyOutDir"], {
  cwd: raizNovela,
  stdio: "inherit",
  shell: true,
});
if (result.error) console.error(result.error.message);
if (result.status === 0) escribirPrecarga();
process.exit(result.status ?? 1);

// Lista de lo que la portada descarga en segundo plano para que "Jugar" arranque con todo en
// caché. Los nombres llevan hash de Vite, así que no se pueden escribir a mano en la portada:
// se descubren aquí, tras el build, y se guardan en public/novela/precarga.json.
// Son las ilustraciones del capítulo 1 de Sara (fondos y personajes que salen primero).
function escribirPrecarga() {
  const PRECARGA = [
    "Gemini_Generated_Image_7szllf7szllf7szl", // exterior del instituto: lo primero que se ve
    "Gemini_Generated_Image_agpumragpumragpu", // aula
    "Gemini_Generated_Image_r2y2bgr2y2bgr2y2", // despacho de orientación
    "sara_normal", "sara_triste", "sara_verguenza", "sara_feliz",
    "Freckled Ginger Varsity Girl", "Cheerful Auburn Varsity Girl", "Warm Studio Portrait of a Woman",
  ];
  const html = readFileSync(marca, "utf8");
  const motor = [...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
  const imagenes = readdirSync(join(destino, "assets")).filter((f) =>
    PRECARGA.some((nombre) => f.startsWith(`${nombre}-`) && f.endsWith(".webp")),
  );
  const archivos = [...motor, ...imagenes.map((f) => `assets/${f}`)].map((ruta) => `/novela/${ruta.split("/").map(encodeURIComponent).join("/")}`);
  writeFileSync(join(destino, "precarga.json"), JSON.stringify({ archivos }));
  console.log(`[novela] precarga.json: ${archivos.length} archivos`);
}
