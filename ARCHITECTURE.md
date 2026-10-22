# ARCHITECTURE.md

Mapa técnico de **Chavales Legales**: una plataforma en la que un trabajador social genera un *caso*, un
menor juega una novela visual y el registro de esa sesión se convierte en un informe descriptivo.

> Convención: todo lo que aparece aquí está verificado en el código. Si algo cambia, cámbialo
> aquí; si no estás seguro, compruébalo antes de escribirlo.

---

## 1. Contexto y actores

| Actor | Qué hace | Dónde |
|---|---|---|
| **Trabajador social / asistente social** | Genera un caso, reparte su código, lee el informe | `/profesores` → `/servicios/[caso]` |
| **Menor (alumno)** | Teclea el código y juega la novela | `/` → `/novela` |
| **Profesional de servicios sociales** | Consulta el listado de casos | `/servicios` |

No hay cuentas, ni roles, ni sesión de servidor. El "acceso" es conocer un código de caso.

---

## 2. Topología

```
navegador
  │
  ├─ Next.js :3000 ──── rewrite /api/* ────► FastAPI :8000
  │     │                                    (mismo proceso, estado en disco)
  │     └─ iframe ─► /novela/index.html   (build de LegalinStory, mismo origen)
  │                        │ postMessage
  │                        └─► página padre
  └─ localStorage (saves de la novela, idioma, snapshot del dibujo)
```

Dos procesos, un solo origen lógico detrás del rewrite. `public/novela` es un artefacto de build
que se genera y **no** está versionado.

---

## 3. Backend

Cinco rutas y un recurso.

```
GET  /                        salud
GET  /api/casos               [{id, meta, eventos: n}]
GET  /api/casos/{id}/resumen  {id, eventos, ultimo, schemaVersion}  (sondeo ligero)
GET  /api/casos/{id}          caso completo (404 si no existe, 400 si el id no es válido)
POST /api/casos/{id}/meta     crea o fusiona metadatos
POST /api/casos/{id}/eventos  añade un evento (400 si la forma no cuadra)
```

Sin middleware CORS: el navegador solo habla con Next, que reescribe `/api/*`. Todo es mismo
origen, incluido el iframe de la novela.

### `CasoStore`

| Aspecto | Decisión | Motivo |
|---|---|---|
| Persistencia | `casos_data/<id>.json`, un archivo por caso | cada evento reescribe **solo** su caso; un caso con dibujos pesa ~50 KB |
| Concurrencia | un `threading.Lock` en las 4 operaciones públicas | FastAPI atiende en un pool de hilos |
| Lecturas | `copy.deepcopy` en `get()`/`set_meta()` | serializar el dict vivo durante una mutación lanza *dictionary changed size* |
| Ids | `^[A-Za-z0-9_-]{1,64}$` | el id llega de `?caso=` y se usa como nombre de archivo (path traversal) |
| Tope | `MAX_EVENTOS = 5000` por caso | acota el crecimiento; **no** acota bytes |
| Reloj | `t_servidor` lo estampa el backend al recibir | las duraciones no pueden depender del reloj del navegador |
| Esquema | `schemaVersion` en el caso; forma del evento validada | los casos viejos se marcan como 1 y el informe cae a `t` |
| Migración | `casos_data.json` → carpeta, una vez, y se renombra a `.migrado` | no perder las sesiones del store monolítico |

`CASOS_DIR` permite mover el directorio (en Docker apunta al volumen). Sin él, los casos se
escribirían en la capa efímera del contenedor.

### Modelo de datos

```jsonc
// casos_data/CL-12345.json
{
  "id": "CL-12345",
  "meta": {                       // libre: lo pone el trabajador social
    "nombreJoven": "…",
    "edad": 12,                  // entero 5–18: el panel solo admite dígitos y el POST /meta lo valida
    "tipoRiesgo": "…",            // texto ya traducido en el momento de crear
    "tipoRiesgoId": "grooming",   // id estable, es lo que usa el informe para traducir
    "contexto": "…",
    "creadoEn": "ISO-8601"
  },
  "schemaVersion": 2,
  "eventos": [                    // append-only, salvo 'dibujo'
    // t = reloj del cliente · t_servidor = reloj del servidor (el que usa el informe)
    { "kind": "inicio", "t": 1700000000000, "t_servidor": 1700000000123, "data": {} }
  ]
}
```

---

## 4. Frontend

### Rutas

| Ruta | Rol | Datos que toca |
|---|---|---|
| `/` | Landing: entrada del alumno (código en línea) + 4 juegos sueltos | `GET /api/casos/{id}` para validar el código |
| `/alumno` | Redirección a `/` (`next.config.mjs`); ya no es una pantalla | — |
| `/profesores` | Panel del trabajador social | `POST /api/casos/{id}/meta` |
| `/novela` | Embebe la novela y registra sus eventos | `POST /api/casos/{id}/eventos` |
| `/avatar` | Embebe la novela en modo dibujo | idem |
| `/servicios` | Listado de casos | `GET /api/casos` |
| `/servicios/[caso]` | Informe descriptivo, con refresco cada 5 s | `GET /api/casos/{id}` |
| `/experiments/*` | Demos jugables, **sin instrumentar** | ninguno |
| `/asistentes-sociales` | Redirección a `/servicios` | — |

### Flujo de creación y entrada

```
PanelTrabajadorSocial
  └─ await guardarMetaCaso(id, meta)      // lanza si la API no confirma
       └─ sólo si resuelve se muestra el código CL-12345
            └─ alumno teclea 12345 en la portada
                 └─ GET /api/casos/CL-12345 → 404 = "código inexistente"
                      └─ /novela?caso=CL-12345
```

El trabajador social **nunca** ve un código que no exista en el backend. Es la razón de que
`guardarMetaCaso` lance en vez de ser fire-and-forget.

### Cliente HTTP

`lib/casos.js` es el único. Sin espejo en `localStorage`: la app asume conexión y un fallo de red
se ve en vez de disfrazarse de datos viejos.

| Función | Contrato |
|---|---|
| `casoDesdeUrl()` | `?caso=` o `DEMO` |
| `resumenCaso(id)` | `{eventos, ultimo, …}` o `null`; es lo que sondea el informe |
| `guardarMetaCaso(id, meta)` | **rechaza** si la API responde != 2xx |
| `registrarEvento(id, kind, data)` | no rechaza; `console.warn` si falla |
| `cargarCaso(id)` | objeto con `fuente: 'servidor' \| 'error' \| 'inexistente'` |
| `listarCasos()` | `[]` si falla |

### Estilos

CSS modules (`servicios`, `cid`, `arena`, `nubes`), `app/globals.css` e inline. En un CSS module,
una clase inexistente llega como `undefined` y React omite el atributo: **el elemento sale sin
estilo y sin error**. Es un fallo silencioso; si añades una clase, añádela al módulo.

### i18n

`lib/i18n.jsx` carga con `require.context` y compone claves `"<ns>.<clave>"`.
6 lenguas (`es ca va gl eu oc`) × 6 espacios (`asistentes comun informe inicio juegos profesores`).
La entrada del alumno vive en el espacio `inicio` (`inicio.entradaAlumno*`) y está traducida en
las seis lenguas; cualquier clave ausente cae al español.

---

## 5. Motor de novela (LegalinStory)

Runtime independiente (Vite, JS puro) que se publica como estático en `/novela`.

### Contenido como datos

```
public/content/
  index.json                     catálogo de stories
  stories/<id>/
    novel.json                   manifiesto (start, save, stage)
    story.json                   nodos
    scene.json                   escenas
    assets.json                  mapas de imágenes
    i18n/<lang>.json             overlay de traducciones
```

### Tipos de nodo

`dialogue`, `choice`, `branch`, `ending`, `chat`, `interstitial`, `minigame`, `external`, `quiz`,
`reconduction`.

Dos de ellos se confunden con facilidad:

| Tipo | Qué es | ¿Produce informe? |
|---|---|---|
| `minigame` | minijuego **interno** de tarjetas (`cards`, `mode`) | no |
| `external` | minijuego **alojado por la plataforma** (`game`, `text`) | **sí**: `<MinijuegoNubes>` → `report` |

`sara` tiene dos `external`: `c3-mesa` (`cid-table`, cap. 3) y `c4-perros` (`caja-arena`, cap. 4).

### Condiciones

DSL de datos en `core/conditions.js`: `flag`, `seen`, `not`, `all`, `any` y comparaciones.
Nunca cadenas de JavaScript: el validador las rechaza.

### Generación de contenido

`sara/story.json` y `dos-voces/story.json` **se generan** (`scripts/build-sara.mjs`,
`scripts/build-dos-voces.mjs`). Editarlos a mano se pierde en la siguiente generación.

### Validador y tests

`scripts/validate-content.mjs` corre en `dev` y `build` y falla en duro (nodos huérfanos, escenas,
cast, expresiones, assets). `npm test` encadena el validador + 12 suites de smoke, incluidas las
de `sara` (grafo completo, pausa, guardado, `external`).

### Protocolo con la plataforma

| Dirección | Mensaje | Efecto |
|---|---|---|
| novela → plataforma | `legalinstory:progress` | `registrarEvento('progreso')` |
| novela → plataforma | `legalinstory:decision` | `registrarEvento('decision')` |
| novela → plataforma | `legalinstory:minigame` | abre `<MinijuegoNubes>` |
| novela → plataforma | `legalinstory:exit` | `router.push('/')` |
| plataforma → novela | `legalinstory:minigame-done` | reanuda el nodo `external` |

`/novela` valida `event.origin === location.origin` **y** `event.source === frame.contentWindow`.
`/avatar` no comprueba el `source`: al tocar mensajería, mantén la forma estricta.

### Modo avatar

`?avatar=1` activa el lienzo de dibujo en tres fases. `avatarStore` acumula en
`legalinstory_avatar_drawings`:

```
{ phase1, phase2, phase1Metrics, phase2Metrics, deltaMetrics, alerts, finalChoice, … }
```

`deltaMetrics` (10 campos) y `alerts` (6 umbrales) los calcula el propio motor comparando fase 1
con fase 2. La plataforma copia ese snapshot al caso como evento `dibujo`.

---

## 6. Pipeline del informe

```
caso.eventos ──► analisis.js (descriptivo, sin valoraciones)
                   ├─ duracionMs, sesiones (>5 s de separación), terminado
                   ├─ decisiones + latencia (mediana, media, sd, min, max) + destacadas
                   ├─ capitulos (lectura, pantallas, relecturas, decisiones)
                   ├─ minijuegos[game] = { report, duracionMs }
                   ├─ desfase = comparación de relojes cliente/servidor
                   └─ dibujo = último snapshot
                        └─► Graficas.jsx (Barras, BarrasH, LineaTiempo, Kpi)
                        └─► MesaCID / Escenario / Clima (replay de los minijuegos)
                        └─► <Dibujo> (imágenes + 12 métricas) + <Delta> + <Alertas>
```

`analisis.js` **no emite juicios**: calcula y describe. La interpretación clínica vive en las
`alerts` que genera el motor.

Dos decisiones que sostienen la validez del informe:

- **Reloj del servidor.** `tEvento()` prefiere `t_servidor`. Si el dispositivo del menor tenía el
  reloj mal, la mediana de latencia, los tiempos de lectura y la duración de los minijuegos
  saldrían mal. `desfase` mide la diferencia y el informe **avisa** cuando supera 5 s.
- **Sondeo ligero.** El informe se refresca cada 5 s contra `/resumen` (unos bytes) y solo baja el
  caso completo —con las imágenes— cuando cambian el contador de eventos o el último sello. Se
  pausa con la pestaña oculta.

Tiene tests propios (`frontend/tests/analisis.test.mjs`, `npm test`): es el único sitio donde un
error de matemáticas se publica como informe profesional.

Exportación: "Exportar JSON" baja `{caso, analisis}` sin el array de eventos; "Exportar eventos"
baja `{id, meta, eventos}` en crudo, con las imágenes y los reports.

---

## 7. Build y despliegue

```
LegalinStory (vite build) ──► frontend/public/novela   (artefacto, gitignored)
                                        │
frontend (next build) ◄─────────────────┘
```

`frontend/package.json` encadena `predev` y `prebuild` → `scripts/prepare-novel.mjs`, que
reconstruye la novela dentro de `frontend/public/novela`. Por eso:

* `frontend/public/novela/` **no está versionado**; editar ahí es perder el tiempo.
* Tras un `git clone` hay que ejecutar `setup` o `npm run dev` antes de abrir `/novela`.

El despliegue de producción es **Docker Compose + Caddy** con tres targets en un `Dockerfile`
(`frontend-build`, `backend`, `caddy`). El build de la imagen ejecuta `npm run build`, así que la
novela se regenera dentro de la imagen. El estado (`casos_data/`) vive en un volumen y
`deploy/backend-entrypoint.sh` exporta `CASOS_DIR` para apuntarlo.

`ecosystem.config.js` (PM2) es residuo de un despliegue anterior: apunta a una ruta que no existe.

---

## 8. Huecos conocidos (verificados)

| Hueco | Consecuencia | Postura |
|---|---|---|
| Sin auth en API ni páginas | cualquiera con un id lee y sobrescribe casos | decisión de producto, aceptada |
| Ids enumerables (`CL-` + 5 dígitos) | ~90 000 combinaciones, adivinables | aceptada |
| `GET /api/casos` devuelve **todos** los casos con `nombreJoven` y `contexto` | datos de menores sin control de acceso | pendiente, alto impacto |
| `casos_data.json` es un único archivo por caso, reescrito entero en cada evento | con ~30 alumnos simultáneos son muchas escrituras de 50 KB | aceptable hoy |
| `localStorage` ya no espeja los casos | el informe no tiene respaldo offline | asumido: la app requiere conexión |
| `/experiments/*` no registra | sesiones invisibles si alguien entra por ahí | aceptado: son demos |
| Solo `sara` tiene minijuegos, y en los capítulos 3-4 | los paneles del informe salen vacíos casi siempre | es contenido, no código |
| Dos sistemas i18n sincronizados solo por URL | añadir una cadena puede requerir dos archivos | deuda asumida |

---

## 9. Matriz de impacto

| Si cambias… | Revisa también |
|---|---|
| Un tipo de evento | `novela/page.jsx`, `analisis.js`, `[caso]/page.jsx`, `CasoStore` (caso especial `dibujo`) |
| El esquema de un caso | `casos.py`, migración, `lib/casos.js`, `analisis.js` |
| Una ruta de la API | `main.py`, `lib/casos.js`, `scripts/smoke.sh` |
| Un nodo o story | `validate-content.mjs`, `npm test`, y el `build-*.mjs` si es generado |
| Un minijuego | `GAMES` en `MinijuegoNubes.jsx`, nodo `external`, y el `<Mesa>`/`<Mundo>` del informe |
| Una cadena de UI | `frontend/locales/*/<ns>.json` (6 lenguas) |
| Estilos del informe | `servicios.module.css` **y** las clases usadas en los 3 archivos que lo importan |
| Algo de `LegalinStory` | rebuild a través de `frontend` (`npm run dev`), nunca editar `public/novela` |
| La forma de un evento | `casos.validar_evento`, `analisis.js` **y sus tests**, `detalleEvento` |
| Los tiempos del informe | `tEvento()`, `desfase`, y `backend/casos.py` (`t_servidor`) |
