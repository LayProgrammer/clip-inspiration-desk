@echo off
setlocal

cd /d "%~dp0"
title Clip Inspiration Studio

echo.
echo ==========================================
echo   Clip Inspiration Studio - Local Beta
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js 20 or newer first:
  echo https://nodejs.org/
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo Creating .env.local from .env.example ...
  copy ".env.example" ".env.local" >nul
  echo You can configure your AI key inside the app after it opens.
  echo.
)

if not exist "node_modules" (
  echo Installing dependencies. This may take a few minutes ...
  npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting local app at http://localhost:3001
start "" "http://localhost:3001"
npm run dev:local

pause
