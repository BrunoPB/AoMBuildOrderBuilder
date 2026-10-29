@echo off
rem Installs the project dependencies (node_modules). Called by start.bat when they are missing.
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale o Node 22 ou mais novo: https://nodejs.org
  exit /b 1
)

echo Instalando dependencias...
call npm.cmd ci
if errorlevel 1 (
  echo [ERRO] Falha ao instalar as dependencias.
  exit /b 1
)

echo Dependencias instaladas.
exit /b 0
