# JSON content format

The format uses three per-story files plus an asset catalog (which can be
shared between stories). Each answers a different question:

| File | Question | Owns |
| --- | --- | --- |
| `novel.json` | What is this game? | Entry points, stage size, save key |
| `assets.json` | What can appear? | Characters, backgrounds, audio, fonts |
| `scene.json` | What does the screen look like? | Layer tree, positions, z-order, transitions, location label |
| `story.json` | What happens? | Beats, text, choices, flags, routing |

Story beats never contain file paths. They reference **scene ids**, **character
ids**, and **asset ids**; only `assets.json` and `scene.json` know about files.
This is what makes localization, asset swapping, and tooling possible.

See [`public/content/`](../public/content) for a complete, validated set.
Paths inside `novel.json.content` are resolved relative to the manifest, so a
story can point at a shared catalog such as `../../shared/assets.json`.

## Common rules

- **Everything is addressed by id.** No positional references, no implicit
  "the current character".
- **Namespaces use `kind/id`**: `backgrounds/clubroom`, `characters/hana`,
  `audio/rain`. A reference is never a URL.
- **State is inherited.** A beat declares only what changes. `scene`, `cast`,
  and audio persist until overridden.
- **Strict schemas.** Unknown keys are errors, not ignored. Validation runs at
  load, before the first frame.
- **JSON is the build artifact.** If authors want comments or shorthand, use
  YAML/JSON5 at authoring time and compile to plain JSON.

## 1. `novel.json` — manifest

```json
{
  "version": 1,
  "id": "between-the-lines",
  "title": "Between the Lines",
  "content": {
    "story": "story.json",
    "assets": "assets.json",
    "scenes": "scene.json"
  },
  "stage": { "width": 1920, "height": 1080 },
  "start": { "node": "start", "scene": "classroom-dusk" },
  "save": { "key": "between-the-lines.save", "version": 1 }
}
```

`save.version` is separate from `version` so a save can be migrated when the
schema changes.

## 2. `assets.json` — asset catalog

```json
{
  "version": 1,
  "basePath": "assets",
  "characters": {
    "hana": {
      "displayName": "Hana",
      "size": { "width": 840, "height": 1240 },
      "pivot": { "x": 0.5, "y": 1.0 },
      "defaultExpression": "neutral",
      "expressions": {
        "neutral": "characters/hana/neutral.webp",
        "smile": "characters/hana/smile.webp"
      }
    }
  },
  "backgrounds": {
    "clubroom": { "size": { "width": 1920, "height": 1080 }, "src": "backgrounds/clubroom.webp" }
  },
  "audio": {
    "rain": { "kind": "music", "src": "audio/rain-loop.ogg", "loop": true, "volume": 0.35 }
  }
}
```

- `pivot` is the anchor used by `at` positions (`y: 1.0` means feet on the
  ground line). The engine should not guess this per sprite.
- `size` is the logical size at scale `1`, not the file's pixel size, so
  resolutions can change without touching scenes.
- A character may instead use layered expressions
  (`"smile": { "layers": [{ "src": "base.webp" }, { "src": "smile.webp" }] }`)
  for cheap mix-and-match faces.

## 3. `scene.json` — scene graph

Scenes are **presentation**, not narrative. They are templates: a beat may
enter a scene, then patch one character's expression. The `label` is a short
human-readable zone name used by tooling; the visual room change comes from the
background transition and the story narration.

```json
{
  "version": 1,
  "stage": { "width": 1920, "height": 1080, "safeArea": 0.9 },
  "presets": {
    "positions": {
      "left": { "x": 0.27, "y": 1.0, "scale": 0.92 },
      "center": { "x": 0.5, "y": 1.0, "scale": 1.0 },
      "right": { "x": 0.73, "y": 1.0, "scale": 0.92 }
    },
    "transitions": {
      "cut": { "type": "cut" },
      "fade": { "type": "fade", "duration": 400 }
    }
  },
  "scenes": {
    "clubroom": {
      "label": "Literature clubroom",
      "layers": [
        { "id": "bg", "type": "image", "asset": "backgrounds/clubroom", "fit": "cover" },
        {
          "id": "hana",
          "type": "character",
          "asset": "characters/hana",
          "expression": "happy",
          "at": "left",
          "z": 20
        },
        { "id": "vignette", "type": "effect", "effect": "vignette", "opacity": 0.3, "z": 90 }
      ]
    }
  }
}
```

Layer types:

| `type` | Fields | Notes |
| --- | --- | --- |
| `image` | `asset`, `fit` (`cover`/`contain`/`stretch`) | Scene background; the first image layer is used at runtime |
| `character` | `asset`, `expression`, `at`, `z`, `flip` | Expression is overridden by `cast` |
| `group` | `at`, `scale`, `rotation`, `opacity`, `children` | Transform container |
| `effect` | `effect`, `opacity`, `z` | Engine-defined: `vignette`, `grain`, `light-shaft` |
| `text` | `text`, `font`, `at`, `z` | Diegetic text (signs, letters) |

Common layer fields: `id` (unique per scene), `z` (defaults to document
order), `at` (preset name or `{x, y}` in stage units), `opacity`, `visible`,
`transition`.

Nested `children` inherit their parent's transform. That is the whole point of
calling it a scene graph: the window light belongs to the window group, so
moving the group moves the light.

## 4. `story.json` — story graph

```json
{
  "version": 1,
  "start": "start",
  "nodes": {
    "start": {
      "type": "dialogue",
      "scene": "classroom-dusk",
      "cast": { "hana": "neutral" },
      "speaker": null,
      "text": "The last bell rang ten minutes ago.",
      "next": "intro-1"
    },
    "intro-1": {
      "type": "dialogue",
      "cast": { "hana": "smile" },
      "speaker": "Hana",
      "text": "There you are!",
      "next": "the-question"
    },
    "the-question": {
      "type": "choice",
      "prompt": "Hana tilts her head, waiting for your answer.",
      "options": [
        {
          "id": "accept",
          "label": "Lead the way.",
          "flags": { "acceptedInvitation": true },
          "next": "after-choice"
        }
      ]
    },
    "after-choice": {
      "type": "branch",
      "when": { "flag": "acceptedInvitation" },
      "then": "accept-1",
      "else": "hesitate-1"
    },
    "ending": {
      "type": "ending",
      "kicker": "Chapter One",
      "title": "The First Page",
      "text": "Some stories begin with a book."
    }
  }
}
```

### Node types

| `type` | Required | Behavior |
| --- | --- | --- |
| `dialogue` | `text`, `next` | Waits for advance |
| `choice` | `prompt`, `options[]` | Waits for `choose(optionId)` |
| `branch` | `when`, `then`, `else` | Routes immediately, no render |
| `ending` | `title` | Clears save, stops |
| `chat` | `messages[]`, `next` | Phone-style message scene |
| `interstitial` | `title`, `next` | Full-screen chapter/perspective card |
| `minigame` | `title`, `prompt`, `cards[]`, `next` | Card-selection activity |
| `quiz` | `title`, `questions[]`, `next` | Guided questionnaire with feedback |
| `reconduction` | `title`, `continueTo` | Warning notice + continuation to the next beat |

### Beat fields (all types except `ending`)

- `scene` — enter another scene. Omit to stay.
- `cast` — patch characters. `"hana": "smile"` is shorthand for
  `{ "expression": "smile" }`; `"hana": null` removes her; `at`, `flip`, and
  `z` can be patched too.
- `flags` — merged into state when the node is entered.
- `effects` — tiny data-only counter DSL, applied once when the node is first
  entered: `{ "banderas_rojas": { "add": 1 }, "safePlace": true }`.
- `perspective` — presentation hint inherited by following beats: `maya`,
  `sofi`, `elena`, or `red`.
- `remote` — the speaker is a phone/message/off-screen voice. The view shows a
  “voz” badge and keeps the on-stage character unchanged.
- `mood` — presentation hint inherited by following beats: `neutral`, `cold`,
  `tense`, `warm`, `safe`, or `hope`.
- `transition` — how this beat's visual changes apply (default: `cut`).
- `audio` — `{ "music": "rain", "fade": 800 }` or `{ "sfx": "page-turn" }`.
- `tone` — presentation hint, never logic: `spoken` (default when there is a
  speaker), `narration` (third-person voice for a beat with no speaker),
  `thought` (inner voice: the view drops surrounding «…»/"…" quotation marks,
  uses its own nameplate and an italic, tinted box so it never reads as
  something said out loud), or `poem`.
- `reference: "people"` — in Sara, opens the short interactive people table from
  `guide.peopleTable`. The story waits while the panel is open; its continue
  button follows the beat's ordinary `next`. No row has to be opened first.

`dialogue.next` and every choice option's `next` must point at an existing
node. `ending` must not have `next`. A `branch` with neither `then` nor `else`
is a validation error unless it is a terminal guard.

### Optional presentation nodes

These node types are supported by the view and are useful for educational or
mobile-first stories.

**`chat`** — a phone-style conversation. Messages are revealed one by one;
a click or space reveals the rest, and the next click advances.

```json
{
  "type": "chat",
  "chatTitle": "Julia",
  "self": "Sara",
  "messages": [
    { "from": "Julia", "text": "están pasando una foto tuya", "time": "18:43" },
    { "from": "Sistema", "text": "Contenido no mostrado.", "system": true },
    { "from": "Hugo", "text": "Mensaje eliminado.", "deleted": true }
  ],
  "next": "after-chat"
}
```

Use `system: true` for notices, `deleted: true` for removed messages, and
`hidden: true` for sensitive content that must not be shown. Never put
intimate imagery in a chat asset.

**`interstitial`** — a full-screen chapter or perspective card.

```json
{
  "type": "interstitial",
  "kicker": "Capítulo 2",
  "title": "Ahora te toca a ti",
  "text": "Hasta ahora has decidido qué hacer cuando algo te ocurre a ti.",
  "next": "chapter-2"
}
```

**`minigame`** — a multi-select card activity with feedback.

```json
{
  "type": "minigame",
  "title": "Organiza la información",
  "prompt": "Selecciona lo que puede ayudar sin crear nuevas copias.",
  "cards": [
    { "id": "messages", "text": "Fechas y nombres de usuario.", "correct": true, "feedback": "Útil." },
    { "id": "download", "text": "Descargar y reenviar la imagen.", "correct": false, "feedback": "No." }
  ],
  "next": "after-minigame"
}
```

`mode: "support"` turns the activity into an ungraded selection of supports.

**`quiz`** — a guided, non-punitive questionnaire. Each question is answered
one at a time and shows feedback immediately. The engine records `quizScore`,
`quizTotal`, and `quizPerfect`; the story can branch on them.

```json
{
  "type": "quiz",
  "title": "Cuatro ideas para llevarte",
  "prompt": "Responde con calma.",
  "questions": [
    {
      "id": "q-digital",
      "voice": "Maya",
      "flag": "quizDigital",
      "question": "Te llega una imagen manipulada tuya. ¿Qué haces primero?",
      "explanation": "No reenvíes, guarda la prueba y pide ayuda.",
      "options": [
        { "id": "a", "label": "Borrarlo todo.", "correct": false, "feedback": "Puede destruir pruebas." },
        { "id": "b", "label": "Guardar captura, reportar y avisar al centro.", "correct": true, "feedback": "Es el protocolo seguro." }
      ]
    }
  ],
  "next": "final-router"
}
```

### Pedagogical consequence options

A choice option may be a safe route or a risky consequence. The preferred shape
is a short consequence story: the risky option points at three or four dialogue
beats (narration plus spoken exchanges) that end in a `reconduction` node. The
engine raises a blocking warning modal through the `notice` event, then continues
to the node named in `continueTo`. It does not rewind to the original decision.

```json
{
  "id": "risk",
  "label": "Ponerse delante para que pare.",
  "safe": false,
  "next": "risk-mini-1",
  "consequence": "La discusión se dirige ahora hacia ella.",
  "lesson": "Interponerse puede aumentar el riesgo. Busca un momento seguro y avisa a un adulto.",
  "lessonTitle": "Tu cuerpo no es un escudo"
}
```

```json
{
  "type": "reconduction",
  "title": "Tu cuerpo no es un escudo",
  "text": "La discusión se dirige ahora hacia ella.",
  "lesson": "Interponerse puede aumentar el riesgo.",
  "continueTo": "after-the-consequence"
}
```

A risky option without `next` keeps the older shortcut: the engine emits a
`lesson` event immediately and the view shows the consequence card. The legacy
`returnTo` field is kept only as a fallback for old saves.

A safe option moves forward and may carry `flags` and/or `effects`:

```json
{
  "id": "safe",
  "label": "Guardar una captura y avisar al centro.",
  "next": "after-evidence",
  "effects": { "banderas_rojas": { "add": 1 }, "nivel_seguridad": { "add": 1 } }
}
```

`effects` is data-only: `{ "flag": value }` sets a flag and
`{ "flag": { "add": number } }` increments a numeric flag. A choice must have
at least one forward option; risky options may omit `next`.

### Rights screen

An ending can show a story-wide rights and resources panel. Point the manifest at
a `rights.json` file:

```json
{
  "content": {
    "story": "story.json",
    "scenes": "scene.json",
    "assets": "../../shared/assets.json",
    "rights": "rights.json"
  }
}
```

`rights.json` contains `title`, an optional `intro`, a non-empty `sections`
array of `{ title, text }`, an optional `resources` array of
`{ name, text }`, and an optional `closing` sentence. The view renders it when
the player presses **Conoce tus derechos** on an ending.

### Conditions

Conditions are data, never strings of JavaScript:

```json
{ "flag": "acceptedInvitation" }
{ "not": { "flag": "metHana" } }
{ "all": [{ "flag": "acceptedInvitation" }, { "seen": "poem-1" }] }
{ "any": [{ "flag": "routeA" }, { "flag": "routeB" }] }
{ "eq": [{ "flag": "chapter" }, 2] }
```

Supported leaves: `flag`, `seen`, `eq`, `neq`, `gt`, `gte`, `lt`, `lte`.
Choice options may carry `when`; hidden options are removed before rendering.

### Effects on stage

Do not put animation timelines in the story graph. Keep it declarative at the
beat level (`transition`, `audio`) and let the view animate the diff between
the previous and next resolved scene. If a cutscene genuinely needs keyframes,
add a separate `timeline` block scoped to that beat, not a general scripting
language.

## 5. Save data

```json
{
  "version": 1,
  "storyId": "between-the-lines",
  "nodeId": "paper-1",
  "flags": { "acceptedInvitation": true },
  "stage": {
    "scene": "classroom-dusk",
    "cast": { "hana": { "expression": "neutral", "at": "center" } },
    "audio": { "music": "rain" }
  },
  "seen": ["start", "intro-1", "the-question", "accept-1"]
}
```

Save the **resolved stage state**, not the node id alone: resuming must work
even if the scene template changed between releases (missing layers are
dropped, new layers come from the template). `seen` enables skip-read-text.

## 6. Validation rules

Fail at load with the full path of the offender:

1. `start` exists in `nodes`.
2. Node ids are unique (guaranteed by the object key).
3. Every `next` / `then` / `else` / option `next` points to a node.
4. `ending` has no `next`; `dialogue`, `chat`, `interstitial`, `minigame`, and
   `quiz` do. A `choice` routes through its options instead.
5. `text` / `prompt` / `label` are non-empty after trimming.
6. Choice option ids are unique within the node.
7. Every `scene` exists in `scenes`.
8. Every layer `asset` exists, and its namespace matches the layer type
   (`character` → `characters/*`, `image` → `backgrounds/*`).
9. Every cast id exists in `characters`; every expression exists.
10. Every `at` preset exists (or is an `{x, y}` object).
11. Every `when` references a flag that some node or option sets (warning),
    and every scene has at least one visible option after `when`.
12. No `branch` is unreachable and no non-ending loop has no exit (warning).
13. Every `quiz` question has at least two options and exactly one correct
    option.
14. Every `effects` entry is a primitive or `{ add: number }`.
15. `perspective` and `mood` use the documented vocabularies.
16. Every `choice` has at least one forward (non-risky) option.
17. Every `reconduction` has a title and, when present, a valid `continueTo` (or legacy `returnTo`) node.

JSON Schema handles shape; rules 1–6 and 8–10 need a small graph/reference
validator that runs after parsing.

## 7. Runtime resolution

Entering a beat:

1. Merge `flags`; apply `scene` / `cast` / `audio` patches onto inherited
   stage state.
2. Resolve the scene template into a layer tree, cloning layers by id.
3. For each `character` layer, look up the cast entry and override
   `expression` (and `at` / `flip` if patched). Drop layers whose cast entry
   is `null`.
4. Emit a render-agnostic `present` event:
   `{ node, text, speaker, tone, layers, choices, flags }`.
5. The view diffs `layers` by id and animates enters, exits, moves, and
   expression swaps using the declared transition.

## 8. Runtime mapping in this repo

- `public/content/index.json` is the registry the library screen reads.
- `src/content/contentLoader.js` fetches the manifest and the three content
  files, then resolves scene ids and asset ids to URLs.
- `src/content/compileStory.js` lowers `scene` and `cast` patches into the flat
  stage state the current engine/view understands.
- `scripts/validate-content.mjs` checks the registry, story graph, scene graph,
  cast references, conditions, and every file on disk. Vite runs it before the
  dev server and before a production build.
- Nodes are evaluated at runtime by `src/core/conditions.js`; there is no
  `eval` and no JavaScript embedded in content.

The runtime supports `dialogue`, `choice`, `branch`, `ending`, `chat`,
`interstitial`, `minigame`, `quiz`, `reconduction`, the ending rights panel,
consequence mini-stories, and `effects`. Current limits: one rendered character per beat (its
left/center/right `at` preset is applied), and a scene's first `image` layer
becomes the background. Groups, effects, additional character layers, and audio
are validated for future use but are not drawn or played yet.
