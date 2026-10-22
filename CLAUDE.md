# CLAUDE.md

Educational web platform **Chavales Legales** (Team UCM). Spanish-language, minors' rights +
digital-safety content. Three runtimes live in this single repo and talk over HTTP and
`postMessage`.

Everything user-facing is in Spanish (identifiers, data keys, UI). Keep new code consistent:
`nombreJoven`, `correcto`, `caso`, `informe`, etc.

> **Deep dive:** see [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the data contracts, the
> LegalinStory internals and the verified list of architectural gaps.

---

## 1. Repo map

```
backend/                     FastAPI API: ONE resource, casos
  main.py                    app + 6 rutas, sin CORS (todo es mismo origen)
  casos.py                   CasoStore: un JSON por caso, lock, validación de id (170)
  tests/test_casos.py        17 tests con unittest de la stdlib
  casos_data/<id>.json       estado de runtime (gitignored)

frontend/                    Next.js 14 App Router (JavaScript, no TS, no lint, no tests)
  app/page.jsx               landing: entrada del alumno + rejilla de 4 juegos
  app/alumno/page.jsx        entrada por código: 5 dígitos -> valida contra la API
  app/profesores/page.jsx    panel del educador (genera el caso y su código)
  app/novela/page.jsx        EMBEBE la novela en un iframe y registra sus eventos
  app/avatar/page.jsx        EMBEBE la novela en modo avatar (?avatar=1)
  app/informe/               listado + [caso] (analisis.js, Graficas.jsx, informe.module.css)
  app/experiments/           cid-table + caja-arena: demos sueltas, NO registran nada
  app/asistentes-sociales/   redirige a /informe
  components/PanelEducador.jsx  orquestador del panel
  components/panel/          FormularioCaso · ResultadoCaso · opcionesRiesgo
  components/AvatarGeometrico.jsx  SVG paramétrico (también lo usa MesaCID)
  lib/casos.js               el ÚNICO cliente HTTP de la app
  lib/i18n.jsx               diccionarios por require.context
  locales/<lang>/<ns>.json   6 lenguas × 7 espacios de nombres

LegalinStory/                Motor de novela visual Vite, independiente
  src/core/                  VisualNovelEngine, conditions DSL, EventBus
  src/ui/                    VisualNovelView, Typewriter, DrawingCanvasModal
  src/app/                   App (genérico) + SaraExperience
  src/services/              saveStores, avatarStore (métricas del dibujo)
  public/content/stories/    6 stories (sara es la de por defecto)
  scripts/                   validador + generadores de contenido + 12 smoke tests

devenv.nix / devenv.yaml     entorno de desarrollo (nix + direnv)
start.bat / start.ps1        lanzador de Windows
ecosystem.config.js          OBSOLETO: apunta a /var/www, que no existe. El deploy real es Docker
```

---

## 2. Running it

Preferred (Nix):

```bash
devenv up          # backend :8000 + frontend :3000 (instala deps la primera vez)
devenv shell       # luego: setup | backend | frontend | build | test | novela
```

Sin Nix:

```bash
python -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
npm --prefix frontend install && npm --prefix frontend run dev
```

Tests:

```bash
cd backend && python -m unittest discover -s tests -v   # 25 tests, sin dependencias
cd frontend && npm test                                  # 16 tests de analisis.js (node:test)
cd LegalinStory && npm test                             # validador + 12 suites
cd LegalinStory && npm run validate
bash scripts/smoke.sh                                   # API de punta a punta
npm --prefix frontend run build                         # el único "linter" que hay
```

Variables de entorno:

| Var | Dónde | Defecto |
| --- | --- | --- |
| `API_URL` | rewrite de `next.config.mjs` | `http://localhost:8000` |
| `NEXT_PUBLIC_API_URL` | base REST del front | `""` = mismo origen |
| `CASOS_DIR` | directorio del store de casos | `backend/casos_data` |
| `CASOS_LEGACY_FILE` | blob antiguo a migrar | `<padre de CASOS_DIR>/casos_data.json` |
| `VITE_PLATFORM_URL` | destino de "Salir" en la novela suelta | `http://<host>:3000/` |

`ALLOWED_ORIGINS` ya no hace nada: el backend no tiene middleware CORS porque el navegador solo
habla con Next, que reescribe `/api/*` (mismo origen). Si añades un cliente cross-origin, tendrás
que volver a ponerlo.

---

## 3. Data flow (memorize this)

```
/profesores  PanelEducador ──await guardarMetaCaso──► POST /api/casos/CL-12345/meta
                                                        │  (si falla, NO se muestra el código)
                                                        ▼
                                             código CL-12345 que dicta al alumno

/alumno     5 dígitos ──► GET /api/casos/CL-12345 ──► /novela?caso=CL-12345
                                                        │  (404 = código inexistente)

/novela     iframe /novela/index.html  (LegalinStory)
              │ postMessage
              ├─ progress ──► registrarEvento('progreso')
              ├─ decision ──► registrarEvento('decision')
              ├─ minigame ──► MinijuegoNubes ──► registrarEvento('minijuego', {game, report})
              └─ exit ─────► router.push('/')

            además: sincronizarDibujo() copia legalinstory_avatar_drawings -> evento 'dibujo'
            Todo va a  POST /api/casos/{id}/eventos   (una sola fuente de verdad)

/informe/[caso]  GET /api/casos/{id} ──► analisis.js(eventos) ──► KPI + gráficas
                                                              └─► MesaCID / Escenario / Clima
```

**No hay multijugador.** Se eliminó por completo (salas, PIN de sala, WebSockets, `rooms.py`,
`telemetry.py`, `lib/api.js`, `lib/socket.js`). El PIN del alumno **es el código del caso**.

### Contrato de eventos

Todo evento es `{kind, t, t_servidor, data}` dentro del array `eventos` del caso.

- `t` es el reloj del **cliente**; `t_servidor` lo estampa el backend al recibir. El informe usa
  `t_servidor` (ver `tEvento()` en `analisis.js`): un reloj mal puesto o una pestaña suspendida
  corrompen todas las duraciones si se confía en el navegador.
- `schemaVersion` en el caso: 1 = anterior a `t_servidor`; 2 = actual.
- `add_evento` valida la **forma** (dict, `kind` texto no vacío, `data` objeto, `t` numérico) y
  responde 400 si no cuadra. Un `kind` desconocido se acepta con un warning: la novela puede
  emitir un tipo nuevo antes de que el informe lo entienda.

| `kind` | `data` | Emisor |
|---|---|---|
| `inicio` / `salida` | `{userAgent, pantalla}` / `{}` | `/novela` al montar y en `pagehide` |
| `progreso` | `{node_id, chapter, node_type}` | postMessage del motor |
| `decision` | payload completo del motor (`time_ms`, `chapter`, `option_label`…) | postMessage del motor |
| `minijuego-inicio` | `{game}` | `/novela` antes de abrir el minijuego |
| `minijuego` | `{game, report}` | `MinijuegoNubes.onDone` |
| `dibujo` | snapshot de `avatarStore`: `phase1`, `phase2`, `*Metrics`, `deltaMetrics`, `alerts`, `finalChoice` | `sincronizarDibujo()` |

`dibujo` es **última instantánea**: `CasoStore.add_evento` borra los `dibujo` previos para no
duplicar imágenes. Un caso con dibujos pesa ~50 KB (base64).

---

## 4. Backend conventions

* **Flat imports** (`from casos import caso_store`). Solo funcionan porque uvicorn arranca con
  `--app-dir backend` o `PYTHONPATH=backend`. Importar `backend.main` desde la raíz falla.
* **Una sola fuente de datos**: `backend/casos_data/<id>.json`, un archivo por caso.
  Cada evento reescribe **solo su caso**.
* `CasoStore` toma el mismo `threading.Lock` en las cuatro operaciones, incluidas las lecturas.
  `get()` y `set_meta()` devuelven `copy.deepcopy`: serializar el dict vivo mientras otro hilo lo
  muta revienta con *dictionary changed size during iteration*.
* **`caso_id` se valida antes de usarlo como nombre de archivo** (`^[A-Za-z0-9_-]{1,64}$`).
  Sin eso es path traversal: el id llega de `?caso=`. `main.py` responde 400.
* Migración: si existe el `casos_data.json` antiguo se importa una vez y se renombra a
  `.migrado`. No lo borres: es el respaldo.
* `resumen(caso_id)` es la versión ligera (`{id, eventos, ultimo, schemaVersion}`) que sondea el
  informe. No copia eventos ni imágenes: existe para que la página no se baje 50 KB cada 5 s.
* No hay base de datos, ni auth, ni expiración. Un proceso único; con `--workers` habría copias
  divergentes del store.

---

## 5. Frontend conventions

* Todo es `'use client'`. Sin componentes de servidor, sin TypeScript, sin ESLint.
  **`npm run build` es el único chequeo estático** — úsalo tras tocar imports.
* Estilos mezclados: CSS modules (`informe`, `cid`, `arena`, `nubes`), `app/globals.css` e inline.
  En los CSS modules, **una clase que no existe en el `.css` llega como `undefined`** y React
  omite el atributo: el elemento sale sin estilo y no hay error. Si añades una clase, añádela al
  módulo.
* `lib/casos.js` es el único cliente HTTP. `guardarMetaCaso` **lanza** si el backend no confirma;
  `registrarEvento` avisa por `console.warn`; `cargarCaso`/`listarCasos` devuelven vacío marcado.
  No hay espejo en localStorage: la app asume conexión.
* Nada de `catch {}` vacíos en código nuevo: convierten un fallo de red en "no hay datos".
* i18n: `t('<ns>.<clave>')`, 6 lenguas × 7 espacios. `alumno.json` solo existe en `es`; el resto
  cae al español por el fallback de `lib/i18n.jsx`.

---

## 6. Visual novel engine (LegalinStory)

* Vanilla JS + Vite. `main.js` lee `content/index.json`, elige story (`?story=`, por defecto
  `sara`) y monta `SaraExperience` o `App`.
* El contenido es **datos**: `novel.json` + `story.json` + `scene.json` + `assets.json`.
  Tipos de nodo: `dialogue`, `choice`, `branch`, `ending`, `chat`, `interstitial`, `minigame`,
  `external`, `quiz`, `reconduction`.
* **`external` es el minijuego de la plataforma** (el que produce el `report` para el informe);
  `minigame` es el minijuego interno de tarjetas y **no** emite informe. `sara` tiene dos
  `external`: `c3-mesa` (cid-table) y `c4-perros` (caja-arena).
* Las condiciones son un DSL de datos (`flag`, `seen`, `not`, `all`, `any`, comparaciones) en
  `core/conditions.js`; nunca cadenas de JS.
* El validador (`scripts/validate-content.mjs`) corre en `dev` y `build` y falla en duro.
  Es la red de seguridad real: ejecuta `npm run validate` tras tocar JSON.
* **`sara/story.json` y `dos-voces/story.json` se GENERAN** (`npm run story:sara`,
  `npm run story:build:dos-voces`). Editarlos a mano se pierde en la siguiente generación.
* Persistencia: `LocalStorageSaveStore` con clave `${storyId}.save`; si va embebida en un iframe,
  el save se limpia al entrar.
* Modo avatar (`?avatar=1`): guarda trazos y métricas en `legalinstory_avatar_drawings`.

---

## 7. Things that will bite you (verified quirks)

1. **`frontend/public/novela/` NO está en git.** Es salida de build. `predev` y `prebuild` la
   regeneran (`scripts/prepare-novel.mjs`) y el `Dockerfile` también. Tras un `git clone` hay que
   pasar por `npm --prefix frontend run dev` o `setup` antes de abrir `/novela`. **Nunca edites
   ahí**: edita `LegalinStory/`.
2. **Dos sistemas i18n independientes.** Next: `frontend/locales/<lang>/<ns>.json`, con claves
   `"<ns>.<clave>"`. Novela: `LegalinStory/src/locales/*.json` + overlays por story. Se
   sincronizan solo por la URL (`/novela` reenvía `location.search` al iframe).
3. **`sara/story.json` es generado.** Igual que `dos-voces`. Ver §6.
4. **Los minijuegos solo existen en `sara`, capítulos 3 y 4.** Los paneles `<Mesa>`/`<Mundo>` del
   informe están vacíos en cualquier caso que no llegue tan lejos. No es un bug.
5. **`/experiments/*` no registra nada.** Se puede jugar y no queda rastro: el único camino
   instrumentado es `MinijuegoNubes` dentro de `/novela`.
6. **`casoDesdeUrl()` devuelve `DEMO` si no hay `?caso=`.** Un `/novela` sin parámetros escribe
   eventos en el caso `DEMO`, que aparece en `/informe` sin que nadie lo haya creado.
7. **Ids de caso enumerables** (`CL-` + 5 dígitos) y **sin auth**: quien conozca un id puede leer
   y sobrescribir el caso. Aceptado por decisión de producto; no lo "arregles" sin hablarlo.
8. **`casos_data.json` y `casos_data/` son estado de runtime**, no fixtures. Están gitignorados.
   `casos_data.json.migrado` es el respaldo del store antiguo: no lo borres.
9. **Sin auth en ninguna capa.** El antiguo gate `2026`/`SOCIAL` se eliminó por ser un literal en
   el cliente; ahora `/informe` se alcanza por un enlace desde `/profesores`.
10. **`ecosystem.config.js` está obsoleto** (PM2, `/var/www/…`). El despliegue real es Docker
    Compose + Caddy. No lo uses como referencia.

---

## 8. Change recipes

* **Nuevo tipo de evento** → `/novela` (`registrarEvento`), `app/informe/analisis.js` y la vista
  `[caso]`. Recuerda que `CasoStore` tiene un caso especial para `dibujo`.
* **Nueva cadena de UI** → las 6 lenguas en `frontend/locales/*/<ns>.json`. Añádela a `es` siempre;
  el resto puede caer al fallback, pero entonces queda sin traducir.
* **Nueva story o beat** → `LegalinStory/public/content/stories/<id>/` + `content/index.json`,
  luego `npm run validate`. Si el story es generado, edita su `scripts/build-*.mjs`.
* **Minijuego nuevo** → regístralo en `GAMES` de `app/novela/MinijuegoNubes.jsx` y usa un nodo
  `external { game }` en el story. El `report` que devuelva es lo que verá el informe.
* **Nueva sección del informe** → `app/informe/[caso]/page.jsx` + derivaciones en `analisis.js` +
  gráficas en `Graficas.jsx`, con claves en el espacio `informe`. Usa clases que existan en
  `informe.module.css`.
* **Tocar el backend** → recuerda validar el id, tomar el lock y devolver copia. Añade un test en
  `backend/tests/`.

---

## 9. Bug-hunting checklist

1. Reproduce en el navegador: DevTools → Network (REST) y Console.
2. Decide qué runtime dueño del comportamiento: página de Next, FastAPI, o el iframe de la novela
   (`iframe#novela-frame` tiene su propio contexto de consola).
3. Para datos: `GET /api/casos`, `GET /api/casos/{id}`, y los `localStorage`
   (`legalinstory_avatar_drawings`, `*.save`, `chavales_lang`, `chavales_caso_*` de versiones
   antiguas que ya no se escriben).
4. Para la novela: `cd LegalinStory && npm test` y `npm run validate` antes de nada.
5. Para la API: `bash scripts/smoke.sh` y `cd backend && python -m unittest discover -s tests`.
   Si el smoke ensucia `casos_data/`, borra el archivo del caso `SMOKE-*`: es un archivo suelto.
6. Recuerda que el estado es local al proceso: reiniciar uvicorn recarga el store desde disco.
