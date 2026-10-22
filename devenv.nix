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
  };

  # ---------------------------------------------------------------------------
  # Procesos: `devenv up` levanta backend (FastAPI :8000) y frontend (Next :3000)
  # ---------------------------------------------------------------------------
  processes.backend.exec = "python -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload";
  # Instala las dependencias la primera vez para que `devenv up` funcione en un clon limpio.
  processes.frontend.exec = ''
    [ -d LegalinStory/node_modules ] || npm --prefix LegalinStory install --no-audit --no-fund
    [ -d frontend/node_modules ] || npm --prefix frontend install --no-audit --no-fund
    exec npm --prefix frontend run dev
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

    frontend.exec = "npm --prefix frontend run dev";

    build.exec = "npm --prefix frontend run build";

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
