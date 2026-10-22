{ pkgs, ... }:

let
  # Python con todo lo que necesita el backend (equivalente a backend/requirements.txt).
  # websockets/watchfiles los usa uvicorn para --reload y por si vuelve a haber rutas WS.
  python = pkgs.python3.withPackages (ps: with ps; [
    fastapi
    pydantic
    uvicorn
    websockets
    watchfiles
  ]);
in
{
  # Solo lo imprescindible: cada paquete extra aquí alarga (o bloquea) el arranque de
  # `devenv up` porque hay que evaluarlo y bajarlo.
  packages = with pkgs; [
    git
    nodejs_22
    pnpm
    python
  ];

  env = {
    PYTHONUNBUFFERED = "1";
    # El frontend llama a /api y Next lo reescribe a este backend. No hay CORS: el
    # navegador solo habla con Next (mismo origen).
    API_URL = "http://127.0.0.1:8000";
    # La telemetría de Next añade una espera al arrancar y en un aula sin salida a
    # internet se queda colgada. No aporta nada aquí.
    NEXT_TELEMETRY_DISABLED = "1";
  };

  # ---------------------------------------------------------------------------
  # Procesos: `devenv up` levanta backend (FastAPI :8000) y frontend (Next :3000)
  # ---------------------------------------------------------------------------
  processes.backend.exec = "python -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload";
  # Instala las dependencias la primera vez para que `devenv up` funcione en un clon limpio.
  # El puerto va fijado a propósito: si está ocupado, el proceso falla en voz alta en vez de
  # arrancar en 3001 mientras un `next dev` viejo sigue sirviendo 3000 (dos dev sobre el mismo
  # .next se pisan la caché y el navegador acaba viendo 404s).
  processes.frontend.exec = ''
    [ -d LegalinStory/node_modules ] || npm --prefix LegalinStory install --no-audit --no-fund
    [ -d frontend/node_modules ] || npm --prefix frontend install --no-audit --no-fund
    node -e "const s=require('net').connect(3000,'127.0.0.1');s.on('connect',()=>{console.error('[frontend] El puerto 3000 ya esta ocupado: hay otro dev vivo (terminal aparte o sesion anterior).');console.error('[frontend] Cierralo o ejecuta: clean');process.exit(1)});s.on('error',()=>process.exit(0))"
    exec npm --prefix frontend run dev -- -p 3000
  '';

  # ---------------------------------------------------------------------------
  # Scripts de ayuda
  # ---------------------------------------------------------------------------
  scripts = {
    setup.exec = ''
      npm --prefix LegalinStory install --no-audit --no-fund
      npm --prefix frontend install --no-audit --no-fund
      echo "Dependencias instaladas. Arranca con: devenv up"
    '';

    dev.exec = "devenv up";

    backend.exec = "python -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload";

    frontend.exec = "npm --prefix frontend run dev -- -p 3000";

    build.exec = "npm --prefix frontend run build";

    # Igual que build, pero en otra carpeta de salida: se puede lanzar con `devenv up`
    # corriendo sin dejar sin caché al servidor de desarrollo.
    check.exec = "npm --prefix frontend run build:check";

    # Deja el entorno como recién clonado: para los dev servers huérfanos y borra las
    # cachés de Next. Es lo primero que hay que probar cuando el navegador da 404s raros.
    # Sin dependencias externas: borra las cachés de Next (la causa habitual de los 404
    # fantasma tras matar un dev server a lo bruto).
    clean.exec = ''
      rm -rf frontend/.next frontend/.next-check
      echo "Cachés de Next borradas."
      echo "Si queda un dev suelto, ciérralo con Ctrl-C en su terminal o: devenv processes down"
      echo "Vuelve a arrancar con: devenv up"
    '';

    # Las tres suites del repo: store de casos, derivación del informe y motor de la novela.
    test.exec = ''
      (cd backend && python -m unittest discover -s tests) &&
      (cd frontend && npm test) &&
      (cd LegalinStory && npm test)
    '';

    novela.exec = "npm --prefix LegalinStory run dev -- --host 0.0.0.0";
  };

  enterShell = ''
    echo "Chavales Legales · entorno de desarrollo"
    echo "  node    $(node --version)   npm $(npm --version)"
    echo "  python  $(python --version 2>&1)"
    echo ""
    echo "  devenv up arranca backend (:8000) + frontend (:3000)"
    echo "  setup     instala dependencias (se hace solo al arrancar si faltan)"
    echo "  test      backend + informe + motor de la novela"
    echo ""
  '';
}
