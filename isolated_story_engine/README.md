# isolated_story_engine — prototipo aislado

> **Aislado a propósito.** Esta carpeta NO está conectada a la aplicación: no la importa ni la
> arranca ningún otro código del repo, no está en el `Dockerfile`, ni en `compose.prod.yml`, ni en
> los scripts de despliegue. No modifica nada fuera de ella. Hasta que se valide expresamente, no
> se integra: ni rutas, ni imports, ni cambios en `backend/` ni en `frontend/`.

Genera una historia personalizada como un **DAG de nodos** a partir de la edad, el sexo, el nombre
y el contexto legal que indica el profesional. Está basada en la historia actual de Sara: sus 6
capítulos se han convertido en 5 grupos de nodos genéricos (`dag_swarm/node_catalog.py`, cada nodo
indica en `fuente` de qué nodos de la historia sale).

## Cómo funciona

```
Perfil ─► etiquetas (Gemini, o reglas locales) ─► enjambre ─► DAG ─► historia renderizada
                                   │
                         ChromaDB (frases y nodos afines)      Redis (caché de la plantilla)
```

| Grupo | Contenido | Obligatorio |
|---|---|---|
| 1 | Contexto inicial (aleatorio entre nodos compatibles) | elección de la tutora |
| 2 | Nudo + minijuegos | `dibujo-avatar`, `mesa-familia` |
| 3 | Desarrollo intermedio | `caja-arena` |
| 4 | **Legalidad: enmarcado legal** | citación, quién es quién, declaración según edad |
| 5 | **Legalidad: cierre del proceso** | espera, sentencia, cierre |

- Hasta `MAX_NODES_PER_GROUP` (4) nodos por grupo, elegidos según las etiquetas del estado.
- Al cerrar cada grupo se **sobreescriben** al menos `MIN_OVERRIDDEN_TAGS` (2) etiquetas
  (`lugar`, `tension`, `foco`, `apoyo`); condicionan qué nodos son elegibles en el siguiente grupo.
- Los nodos de elección abren un rombo (dos ramas que se juntan): el grafo sigue siendo acíclico.
- Frases por edad: **<11** (lenguaje sencillo) y **≥11** (más completo), en `phrasing_db.py` y en la
  variante de cada nodo. Aparte, la variante legal cambia con **14 años** (declaración con
  garantías especiales por debajo de esa edad, como en la historia actual).
- `validar()` impide generar una historia sin los 3 minijuegos, sin legalidad en los dos últimos
  grupos, con ciclos, o con grupos que no sobreescriban etiquetas.

## Privacidad (decisiones de diseño)

La aplicación actual no guarda el nombre del menor (`backend/main.py` lo descarta). Este prototipo
mantiene esa regla aunque el nombre sea un dato de entrada:

- **A Gemini nunca se le envía el nombre.** El contexto se anonimiza antes (`anonimizar`): se quita
  el nombre y también correos, teléfonos, DNI/NIE y enlaces, y se recorta a 500 caracteres. Solo
  viajan edad, sexo y ese contexto reducido. Aun así, el profesional no debería escribir datos
  identificativos de terceros (padres, centro, localidad) en el contexto.
- **El nombre no se guarda.** ChromaDB y Redis solo ven la plantilla con `{nombre}`; el nombre se
  sustituye al responder. Para recuperar una historia hay que volver a pasarlo (`?nombre=`).
- La respuesta de Gemini se valida contra la taxonomía; si falla, se usan reglas locales.
- La clave va **solo** en la variable de entorno `GEMINI_API_KEY`. Nunca en el código.
- Sin autenticación: es local. No exponerlo a Internet tal cual.

## Uso

```bash
cd isolated_story_engine
pip install -r requirements.txt          # los servicios opcionales solo si los activas
python -m unittest discover -s tests -v  # no necesita red ni servicios
python -m uvicorn api:app --host 127.0.0.1 --port 8100
```

```bash
curl -X POST localhost:8100/historias -H "Content-Type: application/json" \
  -d '{"nombre":"Luna","edad":9,"sexo":"f","contexto_legal":"Hay gritos en casa","semilla":1}'
```

Variables (todas opcionales; por defecto todo apagado y en memoria): `USE_CHROMA=1`,
`CHROMA_PERSIST_DIR`, `USE_REDIS=1`, `REDIS_URL`, `USE_GEMINI=1` + `GEMINI_API_KEY`, `GEMINI_MODEL`.

## Lo que está y lo que no está verificado

- **Probado:** las reglas del enjambre, la edad, la privacidad, la API (`TestClient`) y los
  alternativos en memoria. Ver `tests/test_motor.py`.
- **No probado contra los servicios reales:** ChromaDB (se descarga un modelo de embeddings la
  primera vez), Redis y la API de Gemini. El código está escrito según sus SDK, pero no se ha
  ejecutado contra ellos. Comprobar también el nombre vigente del modelo (`GEMINI_MODEL`).
- **Texto legal:** es un borrador basado en las notas de la historia actual y está **pendiente de
  revisión jurídica** antes de usarlo con menores reales.
- El DAG usa `graphlib` (biblioteca estándar) en lugar de networkx o LangChain: no hacían falta.
