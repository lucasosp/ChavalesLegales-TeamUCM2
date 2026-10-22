#!/usr/bin/env bash
# Smoke de regresión de Chavales Legales.
# No hay tests de backend ni de frontend: esto es la red de seguridad mínima.
# Uso:  bash scripts/smoke.sh          (backend en localhost:8000)
#       BASE=http://host:8000 bash scripts/smoke.sh
set -euo pipefail

B=${BASE:-http://localhost:8000}
CID="SMOKE-$(date +%s)"

fail() { echo "FALLO: $*" >&2; exit 1; }

# --- 1. salud ---------------------------------------------------------------
curl -fsS "$B/" >/dev/null || fail "GET / no responde"

# --- 2. /api/juegos ya no existe (D3: borrado) ----------------------------
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$B/api/juegos/juicio")
[ "$CODE" = "404" ] || fail "/api/juegos/juicio devuelve $CODE (esperado 404)"

# --- 2b. /api/telemetria ya no existe (D2-a: todo pasa por casos) ---------
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$B/api/telemetria/resumen")
[ "$CODE" = "404" ] || fail "/api/telemetria/resumen devuelve $CODE (esperado 404)"

# --- 3. ciclo completo de un caso ------------------------------------------
curl -fsS -X POST "$B/api/casos/$CID/meta" \
  -H 'content-type: application/json' \
  -d '{"nombreJoven":"Smoke","tipoRiesgo":"ciberacoso","creadoEn":"2026-01-01T00:00:00Z"}' \
  >/dev/null || fail "POST meta"

# evento de progreso
curl -fsS -X POST "$B/api/casos/$CID/eventos" \
  -H 'content-type: application/json' \
  -d '{"kind":"inicio","t":1,"data":{}}' >/dev/null || fail "POST evento inicio"

# evento de decisión (mismos campos que lee app/informe/analisis.js)
curl -fsS -X POST "$B/api/casos/$CID/eventos" \
  -H 'content-type: application/json' \
  -d '{"kind":"decision","t":2,"data":{"node_id":"c1-01","chapter":1,"prompt":"¿Qué haces?","option_label":"Avisar","time_ms":1200}}' \
  >/dev/null || fail "POST evento decision"

# evento de minijuego con un report mínimo: comprueba el camino que alimenta
# <Mesa report> / <Mundo report> en /informe/[caso], sin jugar 3 capítulos.
curl -fsS -X POST "$B/api/casos/$CID/eventos" \
  -H 'content-type: application/json' \
  -d '{"kind":"minijuego","t":3,"data":{"game":"cid-table","report":{"config":{"characters":[]},"rounds":[]}}}' \
  >/dev/null || fail "POST evento minijuego"

# lectura: el caso existe y tiene los 3 eventos
N=$(curl -fsS "$B/api/casos/$CID" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["eventos"]))')
[ "$N" = "3" ] || fail "eventos leídos: $N (esperado 3)"

# la meta se conserva
curl -fsS "$B/api/casos/$CID" | grep -q 'Smoke' || fail "meta no persistida"

# aparece en el listado
curl -fsS "$B/api/casos" | grep -q "$CID" || fail "el caso no aparece en GET /api/casos"

# un evento 'dibujo' reemplaza al anterior (no se acumulan imágenes)
curl -fsS -X POST "$B/api/casos/$CID/eventos" -H 'content-type: application/json' \
  -d '{"kind":"dibujo","t":4,"data":{"phase1":"data:x","phase1Metrics":{}}}' >/dev/null
curl -fsS -X POST "$B/api/casos/$CID/eventos" -H 'content-type: application/json' \
  -d '{"kind":"dibujo","t":5,"data":{"phase1":"data:y","phase1Metrics":{}}}' >/dev/null
D=$(curl -fsS "$B/api/casos/$CID" | python3 -c 'import sys,json;print(sum(1 for e in json.load(sys.stdin)["eventos"] if e["kind"]=="dibujo"))')
[ "$D" = "1" ] || fail "eventos dibujo: $D (esperado 1)"

echo "smoke OK · caso $CID · $N eventos + dibujo único"
