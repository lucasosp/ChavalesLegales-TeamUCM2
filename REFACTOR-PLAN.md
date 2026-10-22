# Plan de refactor · Chavales Legales

> **Corrección importante respecto a la versión anterior de este documento.**
> No hay multijugador. La app es un **generador de casos + novela interactiva + informe**.
> Todo el stack de salas/Kahoot/WebSockets es código **inalcanzable**, no código a reordenar.
> Por tanto esto no es un refactor de arquitectura: es **borrar ~3.300 líneas y luego ordenar
> las ~2.800 que quedan**.

---

## 0.b Estado de ejecución

Última actualización: tras ejecutar las etapas 0-3a. **La rama de multijugador ya no existe.**

| Etapa | Estado | Resultado |
|---|---|---|
| 0 · Smoke | ✅ hecho | `scripts/smoke.sh` en verde |
| 1 · Borrar multijugador | ✅ hecho | −2.700 líneas, 15 archivos, 18 rutas → 5 |
| 1b · Home landing + `/alumno` | ✅ hecho | `page.jsx` 385→185, `/alumno` nueva (132) |
| 2 · Telemetría (D2-a) | ✅ hecho | `telemetry.py` borrado; todo pasa por `casos` |
| 3a · `lib/casos.js` sin offline (D11) | ✅ hecho | 85→72, cero `catch {}` mudos |
| 3 · Locking de `CasosStore` | ✅ hecho | 4 operaciones bajo lock + copias defensivas + 8 tests |
| 2b · Enseñar `deltaMetrics`/`alerts` | ✅ hecho | Δ + alertas + duración de minijuego + export de eventos |
| 4 · Routers | ✅ absorbida | ya no hay nada que partir: 5 rutas |
| 5 · Destrackear `public/novela` | ✅ hecho | −190 archivos, −33.095 líneas; D4 resuelto |
| 3b · Archivo por caso | 🅿️ aplazada | ticket aparte, no es refactor |
| 6 · Partir `PanelEducador` | ✅ hecho | 474 → 4 archivos, el mayor 190 |

**Bug preexistente detectado y arreglado:** `informe.module.css` y las dos páginas de
`/informe` usan **nombres de clase distintos**. La hoja define `topbar`, `mainContainer`,
`headerCard`, `seccionCard`, `kpisSection`, `btnTop`, `btnTopGhost`… y las páginas piden
`toolbar`, `doc`, `portada`, `seccion`, `kpis`, `btn`, `btnGhost`… Resultado: `styles.toolbar`
es `undefined`, React omite el atributo y esos contenedores salen **sin clase**. En el HTML de
`/informe` se ve `<div>` y `<article>` pelados. Faltan 5 de 10 clases en la lista y 13 de 43 en el
detalle. El informe se pinta casi sin estilos (solo funcionan `tabla`, `leyenda`, `page`…).
Se arregló en su propio commit con un mapa de renombrado; ahora los 3 archivos que importan la
hoja tienen 0 clases sin definir, y el HTML sale con `informe_topbar`, `informe_mainContainer`,
`informe_headerCard`… en vez de `<div>` pelados.

**Trabajo extra no previsto:** `sara-smoke.mjs` **ya fallaba en HEAD** (los nodos `external` de
`sara` no estaban registrados en el test y el bucle no cedía el event loop). Arreglado en 2 líneas;
`npm test` de `LegalinStory` pasa en verde por primera vez en el estado actual del repo.

---

## 1. Qué hace la app (grafo de llamadas verificado)

```
/profesores
  └─ PanelEducador ──── guardarMetaCaso(id, meta) ────► POST /api/casos/{id}/meta
       └─ genera link /novela?caso=CL-12345

/novela?caso=CL-12345
  └─ <iframe> /novela/index.html  (LegalinStory)
       └─ postMessage ──► registrarEvento(caso, 'inicio'|'progreso'|'decision'|'minijuego'|'dibujo')
                            ├─► localStorage chavales_caso_CL-12345
                            └─► POST /api/casos/{id}/eventos
       └─ (el motor también hace POST directo /api/telemetria/decision y /dibujo)

/informe ──► listarCasos()      ──► GET /api/casos
/informe/[caso] ──► cargarCaso() ──► GET /api/casos/{id}
                     └─ analisis.js(events) ──► KPI + gráficas + MesaCID / Escenario / Clima
```

Eso es **todo**. Cuatro pantallas y dos verbos sobre un solo recurso (`casos`).

### Lo que está desconectado (verificado, no supuesto)

| Sospechoso | Comprobación | Resultado |
|---|---|---|
| `lib/api.js` (357) | `grep "from '.*lib/api'"` → solo 2 imports | **Ninguna función se ejecuta nunca.** `page.jsx` importa `getInfoSala`/`unirseASala` sin usarlos; `profesores/page.jsx` importa `crearSala` solo dentro de `handleSolicitarCodigo` |
| `handleSolicitarCodigo` | `grep` en JSX | **Definido en `profesores/page.jsx:77` y jamás referenciado.** No hay botón que lo llame |
| `crearSala` | sin llamadores reales | nunca se crea una sala |
| `SalaEsperaAlumnos.jsx` (1680) | único uso en `profesores/page.jsx:140`, dentro de `if (pin && roomState?.state === 'LOBBY')` | `pin` y `roomState` nunca se asignan → **nunca se monta** |
| `lib/socket.js` (104) | 2 usos: el efecto muerto de `page.jsx` y el de `profesores` (que requiere `token`, nunca asignado) | **nunca se abre un WebSocket** |
| `backend/rooms.py` (499) | único importador `main.py:15` | sirve rutas que nadie llama |
| WS `/ws/host`, `/ws/player` | dependen de salas | **inalcanzables** |
| `/api/telemetria/*` lectura | `getResumenTelemetria`, `getDecisionesTelemetria`, `getResumenDibujosTelemetria`, `getDibujosTelemetria`, `resetTelemetria` | **0 llamadores cada una.** Solo `POST /api/telemetria/decision` tiene escritores (novela), y **nadie lo lee** |
| `chavales_telemetria_decisiones` (localStorage) | escritura en `novela/page.jsx:87-89` | **nadie lo lee** |

Consecuencia: las decisiones del menor se guardan **dos veces** (en `casos` y en `telemetria`),
y solo se leen desde `casos`. `telemetry.py` es un **pozo de escritura** de 764 líneas, 394 de
ellas datos demo literal.

---

## 2. Inventario de lo que sobra (medido)

### Frontend · ~2.419 líneas + 348 entradas de i18n

| Elemento | Líneas | Motivo |
|---|---:|---|
| `components/SalaEsperaAlumnos.jsx` | 1680 | nunca se monta (641 de ellas son un `<style>` inline) |
| `lib/api.js` | 357 | ninguna función se llama (`FALLBACK_JUEGOS` son ~130 de esas líneas) |
| `lib/socket.js` | 104 | solo lo usan dos efectos muertos |
| `app/page.jsx` (parte) | ~150 | pasos NICKNAME/GAME, efecto WS, `playerData`, `gameState`, `selectedOption`, `selectedSoloGame`, `cargando` |
| `app/profesores/page.jsx` (parte) | ~128 | `handleSolicitarCodigo`, `token`, `roomState`, efecto WS host, vista LOBBY, vista "iniciando aula" |
| `locales/{es,ca,va,gl,eu,oc}/sala.json` | 58 claves × 6 | namespace exclusivo de `SalaEsperaAlumnos` |
| `locales/*/profesores.json` (parte) | ~8 claves × 6 | solo las usa el flujo de salas |

**Se conserva** `components/AvatarGeometrico.jsx` (288): lo usa `experiments/cid-table/MesaCID.jsx`,
que sí se ve desde la rejilla de juegos y desde el informe.

### Backend · ~883 líneas

| Elemento | Líneas | Motivo |
|---|---:|---|
| `rooms.py` | 499 | sala multijugador sin UI |
| `main.py` (parte) | ~160 | `/api/salas*`, `/ws/host`, `/ws/player`, dict `JUEGOS`, imports |
| `models.py` (parte) | ~45 | `Player`, `RoomState`, `Create*/Join*` |
| `contenido.py` | 179 | solo lo consumen `main.py` (ruta muerta) y `rooms.py`. *Ver puerta D3* |

### Total

**≈ 3.300 líneas de código + 348 claves de traducción.** Sobre un repo de ~6.100 líneas de
aplicación (más la novela), es **más de la mitad**.

---

## 3. Lo que queda (y sí hay que ordenar)

```
backend/
  main.py             ~90 líneas  →  40 (solo app + CORS + include_router)
  casos.py             56          →  dominio/casos/store.py + fix de locking
  telemetry.py        764          →  depende de la puerta D2
  models.py            ~20         →  ¿sobra entero?

frontend/
  app/page.jsx        ~235         →  PIN + rejilla de 4 juegos
  app/profesores/     ~110         →  PanelEducador a pantalla completa
  components/PanelEducador.jsx  444  ← ahora es el archivo más grande del front
  app/informe/        ~600         →  analisis.js + Graficas + 2 páginas (ya está bien)
  app/experiments/    ~800         →  ya está bien troceado (config/metrics/componentes)
  app/novela/          229         →  iframe + postMessage + MinijuegoNubes
  lib/casos.js          85         →  el único cliente HTTP que se usa
  lib/i18n.jsx          66
```

---

## 4. Puertas de decisión (resuélvelas antes de tocar código)

**D1 · ¿Se borra el multijugador o se quiere cablear algún día?**
Yo recomiendo **borrar**. Está al 40 %: backend completo, UI a medias, nada conectado. Mantenerlo
cuesta 2.400 líneas de front que nadie puede probar. Si algún día se quiere, se reescribe en un
día con el backend actual como referencia (`rooms.py` es correcto, solo está desconectado).
*Si la respuesta es "cablearlo", este plan no aplica: hay que hacer un plan de feature, no de refactor.*

**D2 · ¿Qué pasa con `telemetry.py`?**

> **Aclaración importante, verificada en código:** los dibujos y los minijuegos **ya llegan al
> informe**, y no por telemetría, sino por `casos`. No hay nada que rescatar de `telemetry.py`.
>
> - `informe/[caso]/page.jsx:207-250` define `<Dibujo>`: renderiza las **dos imágenes**
>   (`phase1`/`phase2`, son data URLs), el avatar elegido y una tabla de **12 métricas**
>   (latencia inicial, duración, tiempo activo, pausas, trazos, presión, temblor, ocupación,
>   cuadrante, colores, cambios de color).
> - `informe/[caso]/page.jsx:379,386` renderiza los informes de minijuego: `<Mesa report={cid}>`
>   y `<Mundo report={arena}>`.
> - El dato entra por `casos`: `novela/page.jsx:31` (`sincronizarDibujo`) mete el snapshot completo de
>   `avatarStore` (imágenes + métricas) como evento `kind:'dibujo'`; `novela/page.jsx:116` mete el
>   `report` del minijuego como `kind:'minijuego'`. `analisis.js:60-65` los extrae.
> - Medido en `backend/casos_data.json`: el único evento `dibujo` del caso DEMO ocupa **48.751 bytes**
>   del archivo de 50 KB. Es decir: los dibujos se están guardando, y pesan.
>
> Lo que **sí** falta es otra cosa (ver D5): no el almacenamiento, sino **la vista y la exportación**.

Opciones sobre `telemetry.py` (ninguna afecta a dibujos ni minijuegos):

- **D2-a (recomendada) · Borrarlo.** `POST /api/telemetria/decision` solo lo usa el motor cuando
  corre **standalone** (`VisualNovelEngine.js:275`: si está embebido hace `postMessage`, si no hace
  `fetch`). Embebido — el caso real — nunca se usa. `POST /api/telemetria/dibujo`
  (`avatarStore.js:251`) sí se dispara siempre, pero es **redundante**: manda las métricas sin las
  imágenes, y ya hay una copia completa en `casos`. Y los 5 endpoints de lectura no los llama nadie.
  Tocar 2 líneas de `LegalinStory` y **−764 líneas**.
- **D2-b · Conservar solo ingestion** para no romper `npm run novela` en desarrollo. Borrar los 5
  endpoints de lectura + resumen + `reset` + las 394 líneas de seed. `764 → ~120`.
- **D2-c · Mantener todo** y construir el dashboard de telemetría. Es una feature, no un refactor.

**D5 · ¿Qué hacemos con lo que se captura y no se ve?**

Esto es lo que de verdad está "sin cablear", y es barato de arreglar porque **el dato ya está guardado**:

| Dato | ¿Se captura? | ¿Se ve? |
|---|---|---|
| `phase1` / `phase2` (imágenes) | sí | sí (`<Dibujo>`) |
| 12 métricas por fase | sí | sí (tabla) |
| **`deltaMetrics`** (Δ temblor %, Δ presión %, Δ ocupación %, Δ latencia, borrados, monocromía) | sí (`avatarStore.js:130-168`) | **no** |
| **`alerts`** (umbrales diferenciales, con lectura clínica) | sí (`avatarStore.js:172+`) | **no** |
| `phase3.finalChoice` | sí | solo una etiqueta |
| Minijuegos distintos de `cid-table`/`caja-arena` | sí (`analisis.js:60`) | "Pendiente" |
| Detalle de un evento `dibujo` en el registro | sí | celda vacía (`page.jsx:421-423`) |

Recomendación: **conservar todo lo que se captura** (ya está) y añadir la vista en la etapa 2b.
No requiere tocar backend.

**D3 · ¿Se conserva `contenido.py` como contenido?**
`/api/juegos/{modo}` no tiene consumidores, pero el banco de `JUICIO` son casos jurídicos reales
(art. 197.7, 401, 169 CP) con valor pedagógico. Recomiendo **borrar la ruta y el módulo del backend**
y, si se quiere conservar el texto, moverlo a `LegalinStory/public/content/` como contenido de la novela.

**D4 · ¿Producción ejecuta `npm run build` en cada deploy?**
Necesario para la etapa 5 (dejar de versionar `frontend/public/novela`, 190 archivos).

---

### 4.b Decisiones ya tomadas (2026-xx)

| | Decisión | Consecuencia en el plan |
|---|---|---|
| **D6** | El PIN es del alumno, pero **en una página aparte y más sencilla**; fuera de la principal | `/` pasa a landing. Nuevo `app/alumno/page.jsx` estilo Kahoot. `page.jsx` ≈ 130 líneas |
| **D7** | Se quieren datos de minijuegos **en la novela** | **No requiere código**: ya funciona vía nodos `external` (ver §4.c) |
| **D8** | Los experimentos sueltos **no** registran | Sin trabajo. `/experiments/*` se queda como demo no instrumentada |
| **D9** | **Sin bloqueo** por ahora | Se borra la puerta falsa `2026`/`SOCIAL`; `/informe` se alcanza por enlace desde `/profesores` |
| **D10** | Los ids de caso dan igual | Se quedan como `CL-12345` (5 dígitos, enumerables). Aceptado |
| **D11** | En teoría siempre online | **`lib/casos.js` 85 → 72 líneas**: se elimina el espejo en localStorage. Esto **anula** el ítem de localStorage de la etapa 3b |
| **D12** | Traducciones pendientes | La etapa 2b añade claves **solo a `locales/es/`**; el resto cae a español por el fallback `DICTS[es]` de `lib/i18n.jsx` |
| **D2** | **D2-a**: borrar `telemetry.py` y usar la API de casos | ✅ Hecho. −764 líneas + 7 rutas. Los dibujos no se tocan (van por `casos`) |
| **D3** | **Borrar** `contenido.py` y `/api/juegos` | ✅ Hecho. −179 líneas + 1 ruta |
| **D4** | **Resuelto: SÍ se ejecuta** | ✅ `.dockerignore` ya excluía `frontend/public/novela`; el Dockerfile la reconstruye con `npm run build` |
| **D13** | El fallo de creación **tiene que verse en la UI** | ✅ `guardarMetaCaso` lanza, `PanelEducador` hace `await` y muestra un `role="alert"`; el código no se muestra si falla |

**D6b · ✅ Resuelto: (a) el PIN es el código del caso.**

El educador genera el caso en `/profesores` y obtiene `CL-12345`; el alumno teclea `12345` en
`/alumno` y entra en `/novela?caso=CL-12345`. `/alumno` **valida el código contra
`GET /api/casos/{id}`** y rechaza con mensaje si no existe, así que el formulario no es teatro.
Consecuencia directa de D13: si el caso no se pudo crear, el educador no recibe código que dar.

---

### 4.c D7 resuelto: los minijuegos ya existen (corrección)

> Una versión anterior de este documento afirmaba que "ningún story tiene minijuegos". **Era falso**
> por buscar la clave equivocada. El tipo de nodo es `external`, no `minigame`:
>
> - `type: "minigame"` = minijuego **interno** de la novela (tarjetas, `cards` + `mode`, validadas en
>   `validate-content.mjs:1060`). Se juega dentro del iframe y **no** emite informe.
> - `type: "external"` = minijuego **alojado por la plataforma**. Es el que produce el `report`.

`sara` ya tiene dos, en `public/content/stories/sara/story.json`:

```json
"c3-mesa":  { "chapter": 3, "type": "external", "game": "cid-table",  "next": "c4-card" }
"c4-perros":{ "chapter": 4, "type": "external", "game": "caja-arena", "next": "c4-01" }
```

Cadena completa, verificada:

```
external → App.js#runExternal → postMessage 'legalinstory:minigame'{game,text}
  → /novela → <MinijuegoNubes> (GAMES: cid-table, caja-arena)
  → <CidGame embedded onFinish={finish}> → buildReport() → onDone(report)
  → registrarEvento(caso,'minijuego',{game,report}) → POST /api/casos/{id}/eventos
  → analisis.js:60 → a.minijuegos['cid-table'].report
  → informe: <Mesa report={cid}> / <Mundo report={arena}>  (page.jsx:61,104)
```

El caso `DEMO` de `casos_data.json` no tiene minijuegos **porque solo llegó al capítulo 1**.

**Consecuencia para el plan:** D7 no implica construir nada. Solo hay que **verificarlo** sin jugar
3 capítulos: añadir al `scripts/smoke.sh` un `POST` de un evento `minijuego` con un `report` de
muestra y comprobar que `/informe/X` renderiza el panel. Si sale bien, los paneles funcionan y
solo están vacíos porque nadie ha llegado al capítulo 3.

**Único trabajo opcional:** solo `sara` tiene nodos `external`. Si se quiere minijuego en
otros stories, hay que añadirlos — recordando que **`sara/story.json` se genera** desde
`scripts/build-sara.mjs:235`, igual que `dos-voces`. Editarlo a mano se pierde en la próxima
`npm run story:sara`.

---

## 5. Etapas

Cada etapa es un commit independiente. **El proyecto no tiene tests de backend ni de frontend**
(`LegalinStory` es el único con tests y no se toca), así que la etapa 0 no es opcional.

### Etapa 0 · Línea base (30 min, sin código)

1. `devenv up`; recorrer y capturar: `/`, `/profesores`, `/novela`, `/novela?caso=X`, `/informe`,
   `/informe/X`, `/experiments/cid-table`, `/experiments/caja-arena`.
2. Crear un caso real desde `/profesores`, jugar la novela 3 decisiones, abrir el informe y
   **guardar el JSON** de `GET /api/casos/X`. Es el fixture de comparación de todas las etapas.
3. `scripts/smoke.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
B=${BASE:-http://localhost:8000}
curl -fsS "$B/" >/dev/null

# Caso completo: crear → meta → eventos → leer
CID="SMOKE-$(date +%s)"
curl -fsS -X POST "$B/api/casos/$CID/meta" -H 'content-type: application/json' \
  -d '{"nombreJoven":"Smoke","tipoRiesgo":"ciberacoso","creadoEn":"2026-01-01T00:00:00Z"}' >/dev/null
curl -fsS -X POST "$B/api/casos/$CID/eventos" -H 'content-type: application/json' \
  -d '{"kind":"inicio","t":1,"data":{}}' >/dev/null
curl -fsS -X POST "$B/api/casos/$CID/eventos" -H 'content-type: application/json' \
  -d '{"kind":"decision","t":2,"data":{"id":"n1","correcta":true,"tiempo_ms":1200}}' >/dev/null
N=$(curl -fsS "$B/api/casos/$CID" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["eventos"]))')
[ "$N" = "2" ] || { echo "FALLO: $N eventos (esperado 2)"; exit 1; }
curl -fsS "$B/api/casos" | grep -q "$CID"
echo "smoke OK · caso $CID con $N eventos"
```

**Aceptación:** `bash scripts/smoke.sh` en verde. Se repite al final de **cada** etapa.

---

### Etapa 1 · ✅ Borrar el multijugador (≈2.400 líneas)

> **Hecho.** Borrados `rooms.py` (499), `models.py` (67), `telemetry.py` (764), `contenido.py` (179),
> `SalaEsperaAlumnos.jsx` (1680), `lib/api.js` (357), `lib/socket.js` (104), `locales/*/sala.json`
> (6 archivos × 58 claves). `main.py` 281→64, `page.jsx` 385→185, `profesores/page.jsx` 238→62,
> nueva `app/alumno/page.jsx` (132). Backend: 18 rutas → 5. Verificado con `scripts/smoke.sh`,
> `npx next build` y las cinco rutas del front en 200.

Un solo commit grande y **mecánico**. No reordenes nada aquí: solo borra.

**Backend**

```bash
git rm backend/rooms.py
```

En `main.py`: borrar el bloque `# ENDPOINTS REST DE SALAS` (líneas 56-120), el bloque
`# ENDPOINTS WEBSOCKET` (líneas 203-281) y el dict `JUEGOS` + la ruta `/api/juegos/{modo}`
(líneas 34-52, según D3). Quedan: `root`, telemetría (según D2), casos, y el `app`/CORS.

En `models.py`: borrar `Player`, `RoomState`, `CreateRoomRequest`, `CreateRoomResponse`,
`JoinRoomRequest`, `JoinRoomResponse`. **El archivo se queda vacío → bórralo** (nada más lo importa
tras este commit; verifícalo con `grep "from models" backend/`).

**Frontend**

```bash
git rm frontend/components/SalaEsperaAlumnos.jsx \
       frontend/lib/socket.js \
       frontend/lib/api.js \
       frontend/locales/*/sala.json
```

En `page.jsx`, borrar:
- imports `getInfoSala`, `unirseASala`, `SalaEsperaAlumnos`, `getWsBaseUrl`, `createGameSocket`
- `playerData`, `gameState`, `selectedOption`, `selectedSoloGame`, `socketRef`, `cargando`, `nickname`
- `handleSoloGameSelect`, `handleNicknameSubmit`, el efecto WS (líneas ~76-124), `handleSalirPartida`
- la rama `if (step === 'GAME')`
- la sección JSX `PASO 2: INTRODUCE APODO`

`step` se queda con un valor → colapsa: la página **deja de renderizar la tarjeta de PIN**
(D6: el PIN se va a su propia página). **385 → ~200 líneas.**

**D6 · Home como landing + página del alumno**

1. En `page.jsx`, borrar también la sección `PASO 1: INTRODUCE PIN` y el gate de roles:
   ```js
   if (upper.includes('SOCIAL') || upper.startsWith('SOC') || upper.includes('ASISTENT') || upper === '2026')
   ```
   Con D9 (sin bloqueo) ese gate es teatro y además es un PIN hardcodeado en el cliente que
   aparenta seguridad sin darla. Se sustituye por enlaces visibles:
   - "Soy alumno" → `/alumno`
   - "Soy educador" → `/profesores` → desde ahí, "ver informes" → `/informe`
   - La rejilla de 4 juegos se queda tal cual (los `/experiments/*` siguen siendo accesibles, sin
     registrar nada, según D8).

2. Nuevo `frontend/app/alumno/page.jsx` (~90 líneas): una sola tarjeta centrada, estilo Kahoot,
   con un input grande y un botón. Sin pasos, sin apodo, sin avatar, sin WebSocket.

   Si **D6b = (a)**, el submit hace:

   ```js
   const digitos = valor.replace(/\D/g, '').slice(0, 5)
   if (digitos.length !== 5) return setError(t('alumno.codigoInvalido'))
   router.push(`/novela?caso=CL-${digitos}`)
   ```

   Si **D6b = (b)**, `router.push('/novela')` y fuera.

   Si **D6b = (a)**, conviene añadir a `app/alumno/page.jsx` el mismo aviso que da el profesor:
   el código es el que aparece en `/profesores` (`CL-12345` → el alumno teclea `12345`).

   Reutiliza el CSS de `.pin-section-card` / `.pin-input` / `.btn-pin-submit` que ya existe en
   `app/globals.css`, así que no hay diseño nuevo.

3. `locales/*/inicio.json`: las claves `pinTitulo`, `pinPlaceholder`, `apodoTitulo`, `apodoAria`,
   `cambiarPin`, `apodoPlaceholder` quedan sin uso → borrar en las 6 lenguas. Las de `/alumno`
   nuevas van **solo a `es/`** (D12), en un namespace nuevo `alumno.json`.

En `profesores/page.jsx`, borrar `handleSolicitarCodigo`, `token`, `roomState`, el efecto WS host,
la vista `pin && roomState?.state === 'LOBBY'`, la vista `pin && !roomState`, y `handleCerrarSala`.
La página pasa a ser: `<main><PanelEducador /></main>` + un enlace a `/informe`.
**238 → ~110 líneas.**

En `locales/*/profesores.json`, borrar las claves que solo usaba el flujo de salas:
`errorConexion`, `errorGenerarCodigo`, `iniciandoAula`, `cancelar`, `lanzarSara`, `lanzarSaraTitle`
(en las **6** lenguas).

**Verificación**
- `bash scripts/smoke.sh`
- Comparar `/` y `/profesores` con las capturas de la etapa 0.
- `/` → sin tarjeta de PIN; "soy alumno" lleva a `/alumno`; `2026` ya **no** hace nada especial.
  Los 4 azulejos siguen navegando.
- `/alumno` → 5 dígitos válidos → `/novela?caso=CL-12345`; menos de 5 → mensaje de error.
  Con D6b = (a), comprobar que `/informe/CL-12345` existe si ese caso se creó desde `/profesores`.
- `/profesores` → generar un caso, copiar enlace, "ver informe", "crear otro caso".
- `npm --prefix frontend run build` sin errores. **Este es el chequeo que detecta cualquier import
  huérfano** (no hay ESLint, así que el build es el único linter que tienes).
- Consola del navegador sin `Cannot find module` ni `undefined is not a function`.

---

### Etapa 2 · ✅ `telemetry.py` borrado (D2-a)

> **Hecho.** `POST /api/telemetria/*` y `GET /api/telemetria/*` eliminados; `telemetry_data.json`
> y `telemetry_drawings.json` quedan en disco como residuo (gitignored, se pueden borrar).
> `novela/page.jsx` ya no duplica la decisión a telemetría ni a `localStorage`;
> `VisualNovelEngine.js` ya no postea standalone; `avatarStore.#syncTelemetry` es un no-op
> documentado (todo su contenido ya viaja en el snapshot `dibujo`).

**Ninguna de las tres opciones afecta a dibujos ni a minijuegos**: ese dato ya vive en `casos`
(ver D2/D5). Compruébalo antes y después con el fixture de la etapa 0: el informe debe seguir
mostrando las dos imágenes, la tabla de 12 métricas y los paneles de `cid-table`/`caja-arena`.

**Si D2-a:** borrar `telemetry.py`, las rutas `/api/telemetria/*` y tocar
`LegalinStory/src/core/VisualNovelEngine.js:277` + `src/services/avatarStore.js:251` para que no
posteen a un 404 (el `fetch` ya lleva `.catch`, pero apuntar a un endpoint inexistente en cada
decisión ensucia la red y el log). **−764 líneas.**

**Si D2-b:** partir el archivo y conservar solo lo que tiene escritores:

```
dominio/telemetria/store.py     # carga/guarda + add_decision + add_drawing_record  (~90)
dominio/telemetria/models.py    # DecisionRecord + ProjectiveDrawingRecord          (~30)
```
y borrar `resumen.py` (no existiría), `get_summary`, `get_drawing_summary`, `reset_to_seed`,
`_seed_initial_data` (**301 líneas**), `_seed_drawing_data` (**93 líneas**).
`telemetry.py: 764 → ~120`.

**Verificación:** el fixture de la etapa 0 debe dar el mismo informe. Si elegiste D2-a, jugar 3
decisiones y comprobar en DevTools → Network que **no** hay ningún `POST /api/telemetria/*`,
pero que **sí** sigue apareciendo `POST /api/casos/{id}/eventos` con `kind:'dibujo'` y
`kind:'minijuego'` al dibujar y al terminar el minijuego.

---

### Etapa 2b · Enseñar lo que ya se captura (≈60 líneas, sin backend)

Esto es lo que se pidió: **los datos de dibujos y minijuegos ya entran**; lo que falta es verlos y
poder sacarlos. Todo se hace en `app/informe/`, no toca backend ni el motor.

1. **`deltaMetrics` y `alerts` en `<Dibujo>`** (`page.jsx:207`). El snapshot de `avatarStore` ya los
trae; hoy se descartan. Añadir, debajo de la tabla de 12 filas, un bloque "Δ fase 1 → fase 2" con
   las 10 claves de `#computeDelta` (`delta_tremor_index`, `tremor_change_percent`,
   `delta_pressure_mean`, `pressure_change_percent`, `delta_occupancy_ratio`,
   `occupancy_change_percent`, `delta_initial_latency_ms`, `delta_air_time_ratio`,
   `delta_velocity_mean`, `delta_eraser_strokes`, `m1_monochrome`/`m2_monochrome`) y la lista de
   `alerts` ya generadas. **Cero cálculo nuevo**: solo renderizar.
2. **Fallback genérico de minijuego** (`page.jsx:379,386`). Hoy, si aparece un minijuego que no sea
   `cid-table` o `caja-arena`, se muestra "Pendiente" aunque `a.minijuegos[game].report` tiene el
   dato. Añadir al final de la sección: `Object.entries(a.minijuegos).filter(([g]) => !['cid-table','caja-arena'].includes(g))` → un `<details>` con el JSON del report.
3. **Arreglar la columna `detalle` del registro** (`page.jsx:421-423`): el ternario no tiene rama
   para `dibujo`, así que la celda sale vacía. Mostrar `dibujo.phase1 ? 'fase 1 + fase 2' : …`.
   Aprovechar para que `minijuego` muestre la duración, que `analisis.js` ya calcúla.
4. **Exportar el evento crudo.** El botón actual (`page.jsx:290`) hace
   `downloadJson({ caso, analisis: { ...a, eventos: undefined } }, …)`. `caso` sí lleva los eventos
   completos (incluidas las imágenes), así que el dato se puede sacar hoy — pero conviene un
   segundo botón "exportar eventos" que baje solo `{ id, meta, eventos }`, que es el formato con el
   que se puede analizar fuera de la app.

**i18n:** las 6 lenguas necesitan las claves nuevas en `locales/*/informe.json` (Δ, alertas,
"minijuegos sin panel", "exportar eventos"). Es el único coste real de esta etapa.

**Verificación:** con el fixture de la etapa 0 (que ya tiene un `dibujo` de 48 KB y `progreso`),
comprobar que aparecen el bloque Δ, las alertas y el JSON del minijuego. Repetir un dibujo desde
`/novela?avatar=1` y ver el Δ en el informe.

---

### Etapa 3a · ✅ `lib/casos.js` sin modo offline (D11)

> **Hecho.** 85 → 72 líneas. Sin `localStorage`: `guardarMetaCaso` lanza si el backend no confirma
> (D13), `registrarEvento` avisa por `console.warn`, `cargarCaso`/`listarCasos` devuelven vacío
> marcado en vez de datos viejos.

### Etapa 3 · ⏳ `casos.py` → `dominio/casos/store.py` + arreglar el locking

`CasoStore` toma el lock en `set_meta`/`add_evento` pero **no** en `_get()` (que muta con
`setdefault`), ni en `get()`, ni en `listar()`. Con un worker y `--reload` no explota, pero es
incorrecto y empeora con el tiempo.

- Un solo método privado `_con_lock(fn)` o reescribir las cuatro operaciones con `with self._lock`.
- `listar()` debe devolver copia (`{"id":…,"meta":…,"eventos":len(...)}` ya lo es; el riesgo está en `get()`).
- `_save()` ya usa el patrón `tmp` + `os.replace`: bien, no lo toques.
- Añadir `backend/tests/test_casos.py` con 3 asserts (meta merge, evento dibujo reemplaza, límite 5000).
  Añadir `pytest` a `requirements.txt`.

#### 3a · `lib/casos.js`: fuera el modo offline (D11)

Con D11 ("en teoría siempre online"), el espejo en `localStorage` es peso muerto **y** oculta
fallos: `escribirLocal` traga la excepción de cuota, así que un problema de red se convierte en
"datos viejos" en vez de en un error visible.

Reescribir el módulo a solo HTTP: **85 → ~35 líneas**.

| Antes | Después |
|---|---|
| `leerLocal` / `escribirLocal` / `localKey` | se borran |
| `registrarEvento`: escribe local + `fetch` fire-and-forget | `fetch` + `console.warn` si falla |
| `guardarMetaCaso`: ídem | `fetch` + `console.warn` |
| `cargarCaso`: elige "la fuente con más eventos" entre local y remoto | un solo `GET`; si falla, error explícito |
| `listarCasos`: fusiona local + remoto por id | un solo `GET` |

Ganancia adicional: el informe deja de poder mostrar un caso **parcial o viejo** sin avisar, que
es el fallo silencioso que hoy hace difícil depurar (CLAUDE.md §7.8).

**Ojo, no tocar:** `localStorage.legalinstory_avatar_drawings`. Ese lo escribe el motor dentro del
iframe y `/novela` lo lee para volcarlo a `casos`; no es el espejo offline. `chavales_lang` y
`*.save` tampoco se tocan.

**Verificación:** `/novela?caso=X` con el backend levantado → eventos en `GET /api/casos/X`.
Con el backend **caído** → `console.warn` visible y el informe muestra error, no datos viejos.
`/informe` y `/informe/X` siguen funcionando.

#### 3b · Tamaño de los dibujos — **opcional, y NO es refactor**

> Revisión: esta sección estaba sobrevalorada en la primera versión del plan. Es un cambio de
> almacenamiento con efecto en durabilidad, no un refactor. **Sácala a un ticket aparte** y no la
> mezcles con las etapas 1-6. Lo único obligatorio tras D2 es apuntar `avatarStore.js:251` fuera
> del endpoint borrado.

Medido: un evento `dibujo` = **48.751 bytes** (dos imágenes base64). Un caso DEMO completo son
24 eventos en un archivo de 50 KB, así que una sesión de ~100 nodos son ~5 MB de escritura
**acumulada** para un jugador. No es un incendio: es un olor.

| Riesgo | Severidad real | Comentario |
|---|---|---|
| `_save()` reescribe el archivo **entero** en cada evento (`casos.py:35,46`) | baja con 1 usuario, **media con ~30 alumnos simultáneos** | es el único punto con impacto plausible |
| `MAX_EVENTOS = 5000` limita eventos, no bytes | cosmético | no ha fallado nunca |
| `localStorage` al llegar a ~5 MB falla en silencio | **eliminado por D11** | la etapa 3a se lleva el espejo, así que este riesgo desaparece |
| `avatarStore` posteando a un endpoint borrado | solo si D2-a, solo en dev | arreglo de 1 línea |

**Lo que NO hay que hacer:** un `MAX_BYTES_POR_CASO` que recorte eventos. El recorte obvio borra
los dibujos que precisamente queremos conservar. Si se hace, que **mida y avise** (`console.warn`
+ log en backend), nunca que descarte.

**La solución buena, si se hace: un archivo por caso.**

```
backend/casos/<id>.json     # en vez de un dict único en casos_data.json
```

- `_save(caso_id)` escribe solo el caso tocado → desaparece la reescritura completa, **sin caps
  ni debounce**, que era el problema real.
- Encaja con el recurso: el caso es el agregado. `GET /api/casos/{id}` pasa a ser lectura de un archivo.
- `listar()` hace glob del directorio.

Dos requisitos que no son obvios y hay que no saltarse:

1. **Sanear el id.** Hoy `casoDesdeUrl()` devuelve `?caso=` **tal cual** (`lib/casos.js:24`), es decir
   input arbitrario del usuario. Como clave de un dict es inofensivo; como **nombre de archivo es
   path traversal** (`..%2F..%2F`). Hay que validar `^[A-Za-z0-9_-]{1,64}$` (o hashear) antes de
   construir la ruta. Este cambio **introduce** esa vulnerabilidad si se hace mal.
2. **Migración.** `casos_data.json` contiene datos de sesiones reales. Camino de lectura compatible;
   no reescribir el archivo existente.

**Verificación (si se hace):** 10 casos con dibujo → `du -sh backend/casos/`; el informe muestra
el dibujo más reciente; `caso_id` con `../` devuelve 400; el caso antiguo de `casos_data.json`
sigue abriéndose en `/informe`.

**Verificación del refactor (etapa 3):** `python -m pytest backend/tests -q` + smoke + `/informe/X` idéntico al fixture.

---

### Etapa 4 · ✅ Absorbida (ya no hay nada que partir)

Con D2-a y D3 aplicados el backend son **5 rutas y 120 líneas** (`main.py` 64 + `casos.py` 56).
No hay routers que separar. Lo único que se aplicó fue sacar las rutas de **casos** que vivían
dentro del bloque de telemetría, y corregir el CORS (`allow_credentials=False` con `"*"`).

Solo dos routers quedan, así que es pequeño:

```
api/casos.py       # GET /api/casos, GET /{id}, POST /{id}/meta, POST /{id}/eventos
api/telemetria.py  # (solo si sobrevive D2)
main.py            # app + CORS + include_router + GET /
```

Corrige además un desorden real: hoy las rutas de **casos** (`main.py:153-174`) están metidas
**dentro** del bloque de telemetría, entre `resumen` y `reset`.

Aprovecha para centralizar CORS: `ALLOWED_ORIGINS="*"` + `allow_credentials=True` juntos es una
configuración que los navegadores rechazan; con `"*"` deja `allow_credentials=False`.
Hoy no se nota porque todo va por el rewrite de Next (mismo origen), pero es una trampa.

**Verificación:** smoke + `/api/casos` desde el navegador + `/informe`.

---

### Etapa 5 · ✅ Hecha (D4 resuelto en el servidor)

Comprobado en `tete@miquella`: el deploy es **Docker + Caddy** (`datathon.service`), no PM2
(`ecosystem.config.js` está obsoleto). El `.dockerignore` del servidor **ya excluía**
`frontend/public/novela/` del contexto de build, y el `Dockerfile` la regenera:

```dockerfile
COPY LegalinStory ./LegalinStory
RUN cd LegalinStory && npm ci ...          # vite disponible
COPY frontend ./frontend
RUN cd frontend && npm run build           # prebuild -> prepare-novel.mjs -> public/novela
COPY --from=frontend-build /src/frontend/public ./public
```

Es decir: la copia commiteada **nunca ha entrado en la imagen**. Destrackearla no podía afectar
a producción. Hecho: −190 archivos, −33.095 líneas, y `.gitignore` documenta que tras un
`git clone` hay que pasar por `setup` o `npm --prefix frontend run dev` antes de abrir `/novela`.

Solo si **D4 = sí** (el deploy corre `npm run build`, que ya dispara `prebuild`).

```bash
git rm -r --cached frontend/public/novela
printf '\n# Generado por frontend/scripts/prepare-novel.mjs\nfrontend/public/novela/\n' >> .gitignore
```

`predev` y `prebuild` ya regeneran la carpeta. Documentar: **tras `git clone` hay que ejecutar
`setup` o `npm --prefix frontend run dev` antes de abrir `/novela`.**

**Verificación:** `rm -rf frontend/public/novela && npm --prefix frontend run build` la recrea;
`/novela` carga el iframe; `cd LegalinStory && npm test` en verde.

**Riesgo:** si el deploy es `git pull && pm2 restart` sin build, `/novela` da 404. No lo hagas sin confirmar D4.

---

### Etapa 6 · ⏳ Partir `PanelEducador.jsx` (444 líneas)

> Ya no comparte protagonismo con `SalaEsperaAlumnos` (borrado): **es el archivo mayor del front**.
> Además ya incorpora el estado de error de D13, así que el split es más limpio ahora.

Tras las etapas 1-5 es el archivo vivo más grande, y mezcla tres cosas: formulario, generación
simulada (`setTimeout` de 1400 ms) y la tarjeta de resultado.

```
components/panel/
  PanelEducador.jsx      # orquestador (~120)
  FormularioCaso.jsx     # nombre, tipo de riesgo, contexto (~140)
  ResultadoCaso.jsx      # id, enlace, copiar, previsualizar (~120)
  opcionesRiesgo.js      # las 5 opciones + claves i18n
```

Dos cosas a limpiar en el camino, sin cambiar comportamiento:
- Las 5 `opcionesRiesgo` tienen el `label` **hardcodeado en español** (`'Ciberacoso y difusión no
  consentida'`), mientras `profesores.json` ya tiene `riesgo_ciberacoso`, `riesgo_grooming`… en las
  6 lenguas. Ese `label` se guarda en el caso y sale en el informe. Hay que usar `t()` (es un bug
  de i18n, no un refactor: decide si se arregla aquí o se anota).
- `construir el id` con `Math.floor(10000 + Math.random() * 90000)` da 5 dígitos → colisiones
  probables entre casos del mismo centro. `crypto.randomUUID()` o timestamp+corto.

**Verificación:** generar un caso con cada tipo de riesgo, comprobar que el informe muestra el
texto correcto, y que "copiar enlace" + "previsualizar" funcionan.

---

## 6. Resultado real (medido)

| Métrica | Antes | Ahora | Objetivo |
|---|---:|---:|---:|
| Backend total (`*.py`) | 1.846 | **120** | — |
| `backend/main.py` | 281 | **64** | ~40 |
| `frontend/app/page.jsx` | 385 | **185** | ~185 ✅ |
| `frontend/app/profesores/page.jsx` | 238 | **62** | ~110 ✅ |
| `frontend/lib/casos.js` | 85 | **72** | ~35 |
| `frontend/app + lib + components` | ~5.100 | **1.615** | — |
| Endpoints vivos | 18 (16 HTTP + 2 WS) | **5** | 5-8 ✅ |
| Archivos borrados | — | **15** | — |
| Almacenes de datos del menor | 2 (+1 localStorage huérfano) | **1** | 1 ✅ |
| Archivos > 400 líneas | 5 | **1** (`PanelEducador`, 474) | 0 |
| Archivos trackeados de build | 190 | 190 | −190 ⛔ D4 |
| Tests del repo | 1 suite, **en rojo** | **en verde** ✅ | — |

Las dos filas que no llegan al objetivo están bloqueadas por decisiones, no por trabajo:
la de build espera **D4**, y `PanelEducador` es la **etapa 6**, la única que queda de refactor puro.

---

## 7. Lo que este plan NO hace

- **No toca `LegalinStory`.** Tiene los únicos tests del repo y funciona. Solo 2 líneas de la puerta D2-a.
- **No pierde ni un dato de dibujos o minijuegos.** El plan los conserva todos porque viven en
  `casos`, no en `telemetría`; la etapa 2b añade la vista que hoy falta (`deltaMetrics`, `alerts`,
  reports de minijuegos no renderizados). Lo único que se borra de telemetría es una **copia
  redundante sin imágenes** de las métricas del dibujo.
- **No unifica los dos sistemas i18n** (Next `locales/<lang>/<ns>.json` vs novela `src/locales/*.json`).
  Siguen sincronizándose solo por URL. Es un proyecto propio.
- **No arregla los fallbacks silenciosos** de `lib/casos.js` (`catch {}` que convierte un fallo de red
  en "no hay datos"). Recomendación mínima: `console.warn` en cada `catch` — 6 líneas, hazlo en la etapa 3.
- **No añade auth.** `sessionStorage.chavales_asistente_social_auth` no lo comprueba nadie y el PIN
  `2026` abre `/informe`. Es una decisión de producto, no de arquitectura.
- **No añade tests de UI.** Sin playwright ni jest en el repo; montarlo es más trabajo que este plan.

---

## 8. Qué queda

**Si hay una tarde:** **etapa 2b** — renderizar `deltaMetrics` y `alerts` en `<Dibujo>`, fallback
para minijuegos distintos de `cid-table`/`caja-arena`, y arreglar la columna `detalle` del registro
(una fila `dibujo` sale vacía). Es aditivo, ~60 líneas, sin backend.

**Si hay dos:** ✅ ambas hechas. Queda la etapa 3b (archivo por caso) y el bug de estilos del
informe, también resuelto.

**Cuando se confirme D4:** destrackear `frontend/public/novela` (190 archivos).

**Ticket aparte:** etapa 3b (un archivo JSON por caso) — no es refactor, cambia durabilidad, y
requiere sanear `caso_id` antes de usarlo como nombre de archivo.
