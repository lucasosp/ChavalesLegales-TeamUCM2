# LegalinStory

Novela visual de Chavales Legales construida con JavaScript y Vite. La
experiencia principal es **Sara · Mi historia sigue**, una historia sobre
protección, apoyo socioeducativo y acceso a la justicia. El contenido
vive en JSON y las ilustraciones en `public/assets`. Las historias anteriores se
conservan como fixtures de regresión y siguen disponibles mediante
`?story=<id>`.

Contenido conservado en el repositorio:

- **Sara · Mi historia sigue** — seis capítulos con decisiones que reconvergen,
  mapa del proceso, cuaderno de conceptos, perfiles profesionales y guardado
  local opcional. El guion se genera con `npm run story:sara`.
- **Dos voces** — la experiencia principal. Cinco capítulos, 19 decisiones (13 de
  Maya y 6 de Sofi) y un cierre de dos preguntas. Dos modos de edad, mecánica de
  error–aviso–continuación, dos escenas de mensajes del padre, cambios de
  ubicación y de fondo, entradas y salidas narradas, la libreta de pruebas de
  Maya, cuatro finales y panel de derechos. La historia se centra en la violencia
  intrafamiliar y está pensada para unos 10 minutos de lectura.
- **No lo reenvíes** — una novela visual educativa sobre bullying, difusión no
  consentida de imágenes, protección de menores y acceso a la justicia.
- **No soy yo** — una historia complementaria sobre ciberacoso, identidad y
  pedir ayuda.
- **Between the Lines** — un capítulo corto sobre una chica, un poema y una
  puerta abierta.
- **The Locker Note** — una historia paralela sobre una nota que nunca debía
  leerse.

## Run it

Con Node.js compatible con Vite 8:

```bash
npm install
npm run dev
```

La plataforma Next.js integra la experiencia en `/novela`. Ejecuta también
`npm install` en `frontend/`; sus comandos `dev` y `build` compilan la novela
automáticamente a `frontend/public/novela` (artefactos ignorados por Git).
La partida se guarda localmente, sin enviar decisiones al backend. La pantalla
integrada enlaza al módulo existente `/necesito-ayuda`.

En uso independiente, `VITE_PLATFORM_URL` configura el destino del botón Salir;
en localhost apunta por defecto al frontend en el puerto 3000. Integrada en la
plataforma, el botón comunica la salida al contenedor mediante `postMessage`
con comprobación de origen y ventana emisora.

Los apoyos de Sara se marcan juntos y se confirman una vez. No se puntúan.
La actividad de evidencias permite corregir la selección y continuar tras
comprobarla; modificar tarjetas invalida la comprobación anterior.

**Dos voces** añade una mecánica de consecuencia: las opciones marcadas con
`safe: false` (o con `lesson`) abren una minihistoria. Al terminar, un nodo
`reconduction` muestra un aviso modal con la lección y continúa hacia la
siguiente decisión, sin devolver al jugador a la misma elección. Las
minihistorias combinan narración con diálogo hablado, no solo pensamientos
internos. Las decisiones acumuladas y el cierre de dos preguntas llevan a
**cuatro finales distintos**. Los contadores
`banderas_rojas`, `nivel_seguridad`, `apoyo_emocional`, `confidencialidad` y
`errores` se actualizan con el DSL `effects`. La perspectiva (`maya`, `sofi`,
`elena`) y el tono visual (`cold`, `tense`, `warm`, `safe`, `hope`) se heredan
como parte del escenario. La historia evita las pausas de relleno y el texto se
revela a 26 caracteres por segundo para dar tiempo a leer.
Cuando una conversación de chat termina sola, espacio/Enter se ignora durante
0,5 s para no saltar el diálogo siguiente por accidente; si el chat se salta
manualmente, no se añade esa espera y se puede seguir avanzando con pulsaciones
rápidas.

El generador `scripts/build-dos-voces.mjs` aplica después
`scripts/dos-voces-adaptation.mjs`, una pasada de cohesión que convierte los
intercambios de mensajes en escenas de chat, marca las voces telefónicas como
`remote` y narra cada cambio de habitación antes de que ocurra. Después aplica
`scripts/dos-voces-plain-language.mjs`, que acorta la narración y simplifica el
vocabulario, y `scripts/dos-voces-simplify.mjs`, que retira la trama de la foto
filtrada, los rumores de clase y el minijuego de la libreta. Así
`npm run story:build:dos-voces` reproduce el mismo relato adaptado.

Pruebas: `npm test` y `npm run build`. No hay scripts de lint ni typecheck.
La batería recorre las rutas completas de las historias, comprueba los finales
y ejecuta recorridos específicos de **Dos voces** que incluyen consecuencias,
chat, cierre de dos preguntas, los cuatro finales, perspectiva y panel de derechos. Para pruebas de navegador
opcionales instala Playwright y Chromium fuera del proyecto y ejecuta
`scripts/browser-smoke.mjs` con `PLAYWRIGHT_MODULE_PATH` apuntando a
`playwright/index.mjs` y `PLAYWRIGHT_BROWSERS_PATH` a sus navegadores.
Ver el informe de auditoría en `docs/visual-novel-audit.md`.

Alternativa con Nix/pnpm:

```bash
devenv shell
pnpm install
pnpm dev
```

Open the printed URL. The main story opens directly. Progress is saved to
`localStorage` per story, so returning to a story resumes where you left off.
El botón **Salir** vuelve a la plataforma; **Reiniciar** limpia las decisiones
y empieza de nuevo.

`pnpm dev` validates all content **before** Vite starts. The same check runs
before `pnpm build`. If a sprite, background, scene, node link, cast entry, or
expression is missing, the server refuses to start and prints every problem it
found.

Production build:

```bash
pnpm build
pnpm preview
```

## Content layout

```
public/
├── content/
│   ├── index.json                     # registry: every playable story
│   ├── shared/
│   │   └── assets.json                # shared asset catalog
│   └── stories/
│       ├── dos-voces/
│       │   ├── novel.json             # manifest: entry node, stage, save key
│       │   ├── story.json             # generated story graph
│       │   ├── scene.json             # scene graph
│       │   └── rights.json            # rights/resources screen
│       ├── between-the-lines/
│       │   ├── novel.json
│       │   ├── story.json
│       │   └── scene.json
│       ├── the-locker-note/
│       │   ├── novel.json
│       │   ├── story.json
│       │   └── scene.json
│       ├── no-lo-reenvies/
│       │   ├── novel.json
│       │   ├── story.json
│       │   ├── scene.json
│       │   └── rights.json            # shared rights/resources screen
│       └── no-soy-yo/
│           ├── novel.json
│           ├── story.json
│           ├── scene.json
│           └── rights.json
└── assets/
    ├── backgrounds/
    │   ├── classroom-dusk.svg
    │   ├── hallway-dusk.svg
    │   ├── clubroom.svg
    │   ├── hallway-day.svg
    │   ├── classroom-day.svg
    │   ├── bedroom-evening.svg
    │   ├── patio-day.svg
    │   ├── orientation-office.svg
    │   ├── quiet-room.svg
    │   ├── home-living-cold.svg
    │   ├── home-kitchen-cold.svg
    │   ├── court-friendly.svg
    │   └── shelter-room.svg
    └── characters/
        ├── maya/
        ├── sofi/
        ├── madre/
        ├── padre/
        ├── profesor/
        ├── companera/
        ├── companero/
        ├── elena/
        ├── lucia/
        ├── hana/
        ├── sara/
        ├── julia/
        ├── sergio/
        ├── hugo/
        └── marina/
```

Each generated cast folder contains `neutral`, `smile`, `happy`, `sad`, and
`surprised` variants.

Story and scene files never contain file paths. They reference ids:

```json
{
  "type": "dialogue",
  "scene": "clubroom",
  "cast": { "hana": "happy" },
  "speaker": "Hana",
  "text": "Here we are. Welcome to the literature club.",
  "next": "ending"
}
```

Only `assets.json` maps ids to files:

```json
{
  "basePath": "assets",
  "characters": {
    "hana": {
      "defaultExpression": "neutral",
      "expressions": {
        "neutral": "characters/hana/neutral.svg",
        "happy": "characters/hana/happy.svg"
      }
    }
  },
  "backgrounds": {
    "clubroom": { "src": "backgrounds/clubroom.svg" }
  }
}
```

See [`docs/content-format.md`](docs/content-format.md) for the full format.

### Presentation nodes

Besides `dialogue`, `choice`, `branch`, and `ending`, the runtime understands:

- `chat` — a phone-style conversation with timed message reveal, system
  notices, and hidden/deleted content. The message text is always rendered as
  readable text; only sensitive imagery is replaced by a censored preview.
  **Dos voces** uses it for the class group, the father's messages and the
  blackmail conversation.
- `interstitial` — a full-screen chapter or perspective card.
- `minigame` — a multi-select card activity with feedback. **No lo reenvíes**
  uses it to practise identifying useful information without redistributing
  intimate content. **Dos voces** keeps the notebook as a story element, not as a minigame.
- `quiz` — a guided, non-punitive questionnaire. Each question has options with
  immediate feedback, and the engine records `quizScore`, `quizTotal`, and
  `quizPerfect`. **Dos voces** uses it for the final workshop with Elena.
- `reconduction` — an automatic story trigger that closes a consequence
  mini-story, raises a blocking warning modal and continues to the node named
  in `continueTo`. It does not send the player back to the decision.

Choice options can also be pedagogical consequences: `safe: false`,
`rewind: true`, or a `lesson` string. They open a short dialogue mini-story and
end in a `reconduction` node, which shows a blocking warning modal and then
continues forward. Safe options can carry `effects`, a
tiny data-only DSL: `{ "banderas_rojas": { "add": 1 } }`
increments a counter, `{ "confidencialidad": true }` sets a flag. Nodes and
options may carry `perspective` (`maya`, `sofi`, `elena`, `red`) and `mood`
(`neutral`, `cold`, `tense`, `warm`, `safe`, `hope`); the view uses them for the
perspective badge and the cold/warm palette treatment. The scene `label` is a
short human-readable zone name; room changes are conveyed by the background
transition and by narration. Character entrances and exits are written as
narration inside the story (for example, “Papá entra en el salón…”), not as a
floating UI chip. Remote voices use `remote: true` and show a “voz” badge
without swapping the on-stage sprite.

An ending can point at a story-wide `rights.json` through
`novel.json.content.rights`; the ending screen then exposes a **Conoce tus
derechos** panel with the legal/educational summary and support resources.

## Validation

```bash
pnpm validate
```

The validator checks, among other things:

- every registry manifest exists and every manifest field is well formed;
- every `next`, `then`, `else`, and choice option points to a real node;
- every `scene` and `cast` reference resolves;
- every character expression exists;
- every scene layer asset, position preset, and transition preset resolves;
- every file in the asset catalog exists on disk;
- conditions are well formed and reference flags or seen nodes correctly;
- unreachable nodes and conditions reading flags that are never set are
  reported as warnings.

All errors are collected and reported together:

```
Content validation failed with 2 error(s):
  - content/index.json.stories[0].cover: missing file public/assets/backgrounds/classroom-dusk.svg
  - [between-the-lines] asset "backgrounds/classroom-dusk": missing file public/assets/backgrounds/classroom-dusk.svg
```

The validator is wired into Vite in `vite.config.js`, so `pnpm dev` and
`pnpm build` cannot start with broken content.

## Adding a story

1. Create `public/content/stories/<id>/` with `novel.json`, `story.json`, and
   `scene.json` (copy an existing story as a starting point). Optionally add a
   `rights.json` for the ending rights panel.
2. Point `novel.json.content.assets` at the shared catalog, or give the story
   its own `assets.json`. Point `content.rights` at the rights file if used.
3. Add the story to `public/content/index.json` with its title, subtitle,
   manifest path, and cover.
4. Run `pnpm validate`, then `pnpm dev`.

The current runtime renders one character per beat, applies its left/center/right
`at` position preset, and uses the first image layer of a scene as the
background. It also supports `chat`, `interstitial`, `minigame`, and `rights`
content nodes. Scene groups, effects, extra character layers, and audio are
validated for future use, but are not composited or played yet.

## Architecture

```
vite.config.js                    # content validator plugin for dev/build

src/
├── main.js                       # entry: primary story loading, composition
├── app/
│   └── App.js                    # composition root, input -> engine commands
├── core/
│   ├── EventBus.js               # tiny pub/sub boundary
│   ├── VisualNovelEngine.js      # story graph, flags, seen set, persistence
│   └── conditions.js             # safe data-only condition evaluator
├── content/
│   ├── contentLoader.js          # fetch registry/manifest, resolve asset URLs
│   └── compileStory.js           # JSON story/scene/cast -> engine nodes
├── services/
│   └── saveStores.js             # LocalStorage + in-memory SaveStore adapters
├── ui/
│   ├── StorySelector.js          # library screen
│   ├── VisualNovelView.js        # DOM renderer + view-specific input
│   ├── Typewriter.js             # text reveal with skip support
│   └── templates.js              # novel shell markup
└── styles/
    └── main.css                  # scenes, typography, library, layout

scripts/
├── validate-content.mjs          # startup/build content validator
├── build-hana-svgs.mjs           # regenerates Hana's five SVGs
├── build-character-svgs.mjs      # regenerates the full cast, including Maya/Sofi/Elena/Lucía
├── build-no-lo-reenvies.mjs      # regenerates the no-lo-reenvies story/scene/rights JSON
├── build-dos-voces.mjs           # regenerates Dos voces' story.json
├── dos-voces-risk-dialogues.mjs  # specific spoken dialogue for each unsafe choice
├── dos-voces-plain-language.mjs  # shorter prose and simpler vocabulary
├── dos-voces-simplify.mjs        # removes photo plot, rumours and filler
├── validation-smoke.mjs          # proves missing assets fail validation
├── ui-smoke.mjs                  # engine/view smoke test
├── library-smoke.mjs             # published story HTTP loader + assets
├── no-lo-reenvies-smoke.mjs      # chat, minigame, ending, rights coverage
├── no-soy-yo-smoke.mjs           # cyberbullying story coverage
├── dos-voces-smoke.mjs           # consequence notice, chat, quiz, perspective, rights
├── dos-voces-endings-smoke.mjs   # four endings from decision profiles
├── input-buffer-smoke.mjs        # post-chat keyboard buffer
└── engine-regressions.mjs        # all routes, restart, save migration
```

### Design notes

- **Single responsibility** — the engine walks the graph, the view renders, the
  loader fetches and compiles, the validator checks references.
- **Open/closed** — node presentation is registered in a handler map
  (`registerNodeType`), so new beat types can be added without rewriting the
  engine's flow.
- **Dependency inversion** — the engine receives `story`, `bus`, and `saveStore`
  through its constructor; `main.js` chooses the concrete adapters.
- **Content is data** — conditions are a small object DSL (`flag`, `seen`,
  `not`, `all`, `any`, comparisons), never JavaScript strings.

### Tests

```bash
pnpm test
```

Runs the validator, a missing-asset validation test, the engine/view smoke test,
an HTTP test that starts Vite and loads the published story, full playthroughs of
**No lo reenvíes** and **No soy yo**, a complete **Dos voces** route covering the
pedagogical mini-story and notice, the message scenes, the two-question closing quiz and the rights panel,
and an exploration of all **No lo reenvíes** decision routes. Also checks
animation cleanup, restart and migration of saved progress.

**Dos voces** is generated from `scripts/build-dos-voces.mjs`:

```bash
pnpm story:build:dos-voces
```

The script enforces the 32-decision count and writes `story.json`. Edit the
script (or the generated JSON) and run the validator afterwards.

### Regenerating art and content

Hana and the **No lo reenvíes** cast are generated from shared SVG templates:

```bash
pnpm assets:build
```

`assets:build` runs both `build-hana-svgs.mjs` and
`build-character-svgs.mjs`. The long branching graph for **No lo reenvíes** is
generated by a small authoring script:

```bash
pnpm story:build
```

Edit `scripts/build-no-lo-reenvies.mjs` (or the generated JSON directly) and run
the command. The validator will catch dangling links or missing assets after any
change.
