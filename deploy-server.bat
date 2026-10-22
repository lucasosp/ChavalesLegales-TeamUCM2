@echo off
chcp 65001 > nul
echo ==========================================================
echo   Desplegando ChavalesLegales-TeamUCM2 en el Servidor UCM
echo ==========================================================
echo Contraseña de datathon: D4t4th0n#FdI
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0deploy-server.ps1"
pause
