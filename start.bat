@echo off
rem Starts the site locally (optional argument: port, default 5173).
rem Installs the dependencies first when node_modules is missing.
setlocal
cd /d "%~dp0"
set PORT=5173
if not "%~1"=="" set PORT=%~1

if not exist "node_modules\" (
  call "%~dp0install.bat"
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

echo.
echo ============================================
echo   AoM Retold - Build Orders
echo   Executando em: http://localhost:%PORT%
echo   Para parar: feche esta janela ou Ctrl+C
echo ============================================
echo.

call npm.cmd run dev -- --port %PORT% --strictPort
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel iniciar. A porta %PORT% pode estar em uso por outro programa.
  pause
  exit /b 1
)
