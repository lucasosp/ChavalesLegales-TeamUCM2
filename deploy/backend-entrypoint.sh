#!/bin/sh
# The app keeps its state in JSON files next to the sources. The container
# filesystem is immutable, so point those paths at /data, which compose backs
# with a named volume; the code itself stays in the image so rebuilds actually
# ship new code.
#
# - telemetry_data.json / telemetry_drawings.json: leftovers of the removed
#   telemetry module. Kept so nothing breaks if the files exist.
# - casos_data.json: the old single-blob store. Kept ONLY so the migration in
#   backend/casos.py can read it once, then it is renamed to .migrado.
# - CASOS_DIR: the current store, one JSON per case (casos_data/<id>.json).
set -e

DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR"

# One file per case lives on the volume. Without this the app would write to the
# container's ephemeral layer and lose every case on the next redeploy -- and it
# would do so silently, working fine until the container is recreated.
export CASOS_DIR="${CASOS_DIR:-$DATA_DIR/casos_data}"
mkdir -p "$CASOS_DIR"

for f in telemetry_data.json telemetry_drawings.json casos_data.json; do
	[ -e "$DATA_DIR/$f" ] || : > "$DATA_DIR/$f"
	if [ ! -L "/app/$f" ]; then
		rm -f "/app/$f"
		ln -s "$DATA_DIR/$f" "/app/$f"
	fi
done

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
