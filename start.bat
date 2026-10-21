@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo  Iniciando Chavales Legales
echo ========================================

echo.
echo [1/4] Actualizando cambios del repositorio (git pull)...
git pull

echo.
echo [2/4] Verificando dependencias de Python (Backend)...
pip install -r backend\requirements.txt --quiet

echo.
echo [3/4] Verificando dependencias de Node...
call npm --prefix LegalinStory install --no-audit --no-fund
call npm --prefix frontend install --no-audit --no-fund

echo.
echo [4/4] Levantando servidores...
echo  - Backend API : http://localhost:8000
echo  - Frontend Web: http://localhost:3000
echo.

start "ChavalesLegales - Backend" cmd /k "python -m uvicorn main:app --app-dir backend --reload --port 8000"
start "ChavalesLegales - Frontend" cmd /k "npm --prefix frontend run dev"

timeout /t 3 >nul
start http://localhost:3000

echo Todo iniciado. Puedes cerrar esta ventana sin afectar los servidores.
pause
