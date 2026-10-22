# isolated_story_engine — prototipo aislado

> **Aislado a propósito.** Esta carpeta NO está conectada a la aplicación: no la importa ni la
> arranca ningún otro código del repo, no está en el `Dockerfile`, ni en `compose.prod.yml`, ni en
> los scripts de despliegue. No modifica nada fuera de ella. Hasta que se valide expresamente, no
> se integra: ni rutas, ni imports, ni cambios en `backend/`, `frontend/` ni `LegalinStory/`.
> Lo único que toca fuera es **leer** (nunca escribir) `LegalinStory/` para validar la salida: ver
> «Validación con el motor».

Genera una historia personalizada como un **DAG de nodos**, basada en la historia actual de Sara
(sus 6 capítulos son 5 grupos de nodos genéricos en `dag_swarm/node_catalog.py`; cada nodo indica en
`fuente` de qué nodos de la historia sale) y la exporta en el **formato del motor actual**
(`story.json`, `novel.json`, `scene.json`, `assets.json`).

## Entrada

| Campo | |
|---|---|
| `nombre` | Se incrusta en los textos de la salida. Nunca se guarda ni se envía al LLM. |
| `edad` | 5-18. Franja de lenguaje (<11 / ≥11) y variante legal (<14 / ≥14). |
| `contexto` | Texto libre. Lo clasifica el LLM por fases y de él se extrae el sexo del protagonista. |
| `tipo_riesgo` | Uno de los 5 del selector de la aplicación: `ciberacoso`, `suplantacion`, `grooming`, `control_pareja`, `privacidad`. Cada uno tiene su gancho en el grupo 1. |

No hay campo de sexo: se detecta en el contexto y solo sirve para elegir el **prototipo** de
personaje (`sara`, `julia`, `sergio`, `hugo`…). Si no se detecta con confianza, no hay prototipo y el
texto es neutro: no se adivina. Los textos no llevan concordancia de género.

## Etiquetas por fase y franja límite

El LLM no escribe la historia: solo clasifica. Para **cada fase** elige UNA etiqueta con su
confianza (0-1), y la franja límite `UMBRAL_CONFIANZA = 0,70` (global, configurable) decide:

- **confianza ≥ 0,70 → la etiqueta anula el azar**: sus nodos entran sí o sí.
- **por debajo → manda el azar**: los nodos se eligen al azar entre los compatibles.

| Fase | Etiquetas |
|---|---|
| **antes** | convivencia_conflictiva · aislamiento_social · ausencias_escolares · control_del_movil · difusion_de_imagenes · contacto_con_adulto_desconocido · cambios_de_conducta |
| **durante** | citacion_reciente · declaracion_pendiente · medidas_de_proteccion · acompanamiento_psicosocial · sin_denuncia_todavia |
| **después** | sentencia_condenatoria · sentencia_absolutoria · recurso_pendiente · archivo_de_la_causa · proteccion_continuada · vuelta_a_la_rutina |

Reglas de coherencia: «sin denuncia todavía» no admite sentencia, recurso ni archivo (la etiqueta de
«después» se descarta y se explica) y cambia todo el marco legal (no hay citación, juicio ni
sentencia). El cierre del proceso es siempre **una sola** explicación: sentencia genérica, condena,
absolución, archivo o «sin proceso». Cada decisión se devuelve con su motivo (`decisiones`).

## Estructura de la historia

| Grupo | Contenido | Obligatorio |
|---|---|---|
| 1 | Contexto inicial | gancho del tipo de riesgo · elección de la tutora |
| 2 | Nudo + actividades | `dibujo-avatar`, `mesa-familia` |
| 3 | Desarrollo intermedio | `caja-arena` |
| 4 | **Legalidad: enmarcado legal** | citación (o «sin citación»), quién es quién, declaración según edad |
| 5 | **Legalidad: cierre del proceso** | espera, cierre del proceso, cierre de la historia |

Hasta 4 nodos por grupo. Al cerrar cada grupo se **sobreescriben** al menos 2 etiquetas de estado
(`lugar`, `tension`, `foco`, `apoyo`). Los nodos de elección abren un rombo y vuelven a juntarse (grafo
acíclico). `validar()` impide una historia sin las 3 actividades, sin legalidad al final, con ciclos,
con una etiqueta aplicada que no aparece, o con un cierre del proceso ambiguo.

## Salida (formato del motor)

`POST /historias` devuelve, además del DAG, `salida`: `{story_id, indice, archivos}` con
`story.json`, `novel.json`, `scene.json`, `assets.json` y la entrada para `content/index.json`.

- Narración y diálogo → `dialogue` · elección → `choice` (la opción elegida queda en `flags`) ·
  tarjetas de capítulo e inicio → `interstitial` · actividades → `external` · cierre → `ending`.
- Actividades: `cid-table` y `caja-arena` son las de la plataforma. **`dibujo-avatar` aún no existe
  como actividad externa**: hoy la dispara el código a medida de Sara por id de nodo, así que el motor
  actual no la ejecutaría hasta que se integre.
- Personajes y fondos salen de `dag_swarm/plantillas/` (copia de los de Sara), para no leer fuera al generar.
- El nombre va **incrustado** (el motor no tiene marcadores) y por eso la salida es **efímera**: la API
  la devuelve y no la guarda; la caché solo conserva la plantilla con `{nombre}`.

## Validación con el motor (solo lectura)

`validacion/validar_salida.py` escribe las historias en `isolated_story_engine/.validacion_tmp/`
(no se versiona), copia allí los recursos de `LegalinStory/public/assets` (lectura) y ejecuta el
**validador real** `LegalinStory/scripts/validate-content.mjs` contra esa carpeta. No modifica nada de
`LegalinStory/`. Si no hay `node` o no está `LegalinStory/`, la prueba se salta.

## Privacidad (decisiones de diseño)

La aplicación actual descarta el nombre del menor (`backend/main.py`). Este prototipo conserva esa
regla en todo lo que persiste o sale a Internet:

- **A Gemini nunca se le envía el nombre.** El contexto se anonimiza antes: se quita el nombre y
  también correos, teléfonos, DNI/NIE y enlaces, y se recorta a 500 caracteres. Viajan solo edad, tipo
  de riesgo y ese contexto reducido. Aun así, el profesional no debería escribir datos identificativos
  de terceros (padres, centro, localidad) en el contexto.
- **El nombre no se guarda**: ni ChromaDB, ni Redis, ni logs. Para recuperar una historia hay que
  volver a pasarlo (`?nombre=`).
- La respuesta de Gemini se valida contra la taxonomía; si falla, se usan reglas locales (con su propia
  confianza: una palabra clave da 0,60 —por debajo del umbral— y dos o más, 0,80 o más).
- La clave va **solo** en `GEMINI_API_KEY`. Sin autenticación: es local, no exponerlo a Internet tal cual.

## Uso

```bash
cd isolated_story_engine
pip install -r requirements.txt          # los servicios opcionales solo si los activas
python -m unittest discover -s tests -v  # no necesita red ni servicios
python -m uvicorn api:app --host 127.0.0.1 --port 8100
```

```bash
curl -X POST localhost:8100/historias -H "Content-Type: application/json" \
  -d '{"nombre":"Luna","edad":9,"contexto":"Es una niña. Hay gritos y discusiones en casa","tipo_riesgo":"privacidad","semilla":1}'
```

Variables (opcionales; por defecto todo apagado y en memoria): `UMBRAL_CONFIANZA`, `USE_CHROMA=1`,
`CHROMA_PERSIST_DIR`, `USE_REDIS=1`, `REDIS_URL`, `USE_GEMINI=1` + `GEMINI_API_KEY`, `GEMINI_MODEL`.

## Verificado y no verificado

- **Probado (41 pruebas):** reglas del enjambre, umbral, coherencia entre fases, edad, prototipo,
  privacidad, exportador, API y, sobre 26 variantes, el **validador real del motor**.
- **No probado contra los servicios reales:** ChromaDB, Redis y la API de Gemini (el código sigue sus
  SDK, pero no se ha ejecutado contra ellos; comprobar el nombre vigente de `GEMINI_MODEL`). Tampoco se
  ha abierto una historia generada en el navegador.
- **Límites conocidos:** los 15 personajes de `assets.json` son adolescentes, así que el prototipo no
  distingue por edad; `dibujo-avatar` no se ejecuta en el motor actual; el texto legal es un borrador
  basado en las notas de la historia actual y **está pendiente de revisión jurídica**.
- El DAG usa `graphlib` (biblioteca estándar) en lugar de networkx o LangChain: no hacían falta.
