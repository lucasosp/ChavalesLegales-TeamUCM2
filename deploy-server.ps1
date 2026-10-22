# ==============================================================================
# Script de despliegue directo al Servidor FDI UCM (chavaleslegales.fdi.ucm.es)
# Requiere estar conectado a la red de la UCM (eduroam, cable o VPN UCM)
# Contraseña del usuario datathon: D4t4th0n#FdI
# ==============================================================================

$serverUser = "datathon"
$serverHost = "chavaleslegales.fdi.ucm.es"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Desplegando ChavalesLegales-TeamUCM2 en el Servidor UCM " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Servidor: $serverHost" -ForegroundColor Yellow
Write-Host "Usuario : $serverUser" -ForegroundColor Yellow
Write-Host "Si te pide contrasena, introduce: D4t4th0n#FdI`n" -ForegroundColor Green

$remoteCommands = @"
echo '=== 1. Conectando al repositorio TeamUCM2 ==='
cd /var/www/chavaleslegales
git remote set-url origin https://github.com/lucasosp/ChavalesLegales-TeamUCM2.git || true
git fetch origin main
git reset --hard origin/main

echo '=== 2. Compilando Frontend Next.js ==='
cd /var/www/chavaleslegales/frontend
npm install
npm run build

echo '=== 3. Actualizando dependencias Backend ==='
cd /var/www/chavaleslegales/backend
if [ ! -d "venv" ]; then python3 -m venv venv; fi
source venv/bin/activate
pip install -r requirements.txt
deactivate

echo '=== 4. Reiniciando servicios PM2 ==='
cd /var/www/chavaleslegales
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save

echo ' Despliegue completado con exito en http://chavaleslegales.fdi.ucm.es/'
"@

ssh -o StrictHostKeyChecking=no "$serverUser@$serverHost" $remoteCommands
