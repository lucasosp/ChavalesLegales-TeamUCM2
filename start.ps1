# =======================================================
# Script de inicio / actualizacion de Chavales Legales
# =======================================================

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 🚀 Iniciando Chavales Legales" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Git pull
Write-Host "`n📥 [1/4] Actualizando cambios del repositorio (git pull)..." -ForegroundColor Yellow
try {
    git -C $rootDir pull
} catch {
    Write-Warning "No se pudo completar git pull o no hay conexión. Continuando con el código actual..."
}

# 2. Dependencias Backend (Python)
Write-Host "`n🐍 [2/4] Verificando dependencias de Python (Backend)..." -ForegroundColor Yellow
pip install -r "$rootDir\backend\requirements.txt" --quiet

# 3. Dependencias Frontend & LegalinStory
Write-Host "`n📦 [3/4] Verificando dependencias de Node (LegalinStory y Frontend)..." -ForegroundColor Yellow
npm --prefix "$rootDir\LegalinStory" install --no-audit --no-fund
npm --prefix "$rootDir\frontend" install --no-audit --no-fund

# 4. Lanzar Backend y Frontend
Write-Host "`n🌐 [4/4] Levantando servidores..." -ForegroundColor Green
Write-Host " - Backend API : http://localhost:8000" -ForegroundColor Gray
Write-Host " - Frontend Web: http://localhost:3000" -ForegroundColor Gray
Write-Host "`nPresiona Ctrl+C en esta consola para detener ambos servicios.`n" -ForegroundColor DarkCyan

$backendCmd = "python -m uvicorn main:app --app-dir `"$rootDir\backend`" --reload --port 8000"
$frontendCmd = "npm --prefix `"$rootDir\frontend`" run dev"

$backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Write-Host '--- BACKEND (FastAPI :8000) ---' -ForegroundColor Green; cd `"$rootDir`"; $backendCmd" -PassThru
$frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Write-Host '--- FRONTEND (Next.js :3000) ---' -ForegroundColor Cyan; cd `"$rootDir`"; $frontendCmd" -PassThru

# Abrir el navegador automaticamente tras unos segundos
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"

Write-Host "Ambos servidores se estan ejecutando en ventanas dedicadas." -ForegroundColor Green
Write-Host "Presiona Enter para cerrar los servidores cuando termines." -ForegroundColor Yellow
Read-Host

# Limpiar procesos al cerrar
Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
Write-Host "Servidores detenidos correctamente." -ForegroundColor Green
