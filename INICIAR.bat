@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instale o Node.js 22.12 ou superior antes de iniciar.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instalando as dependencias do projeto...
  call npm.cmd ci
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias. Consulte o LEIA-ME.md.
    pause
    exit /b 1
  )
)
echo Abra http://localhost:8081 no navegador quando o servidor iniciar.
call npm.cmd run dev
pause
