@echo off
echo ========================================
echo      Kid Vibe Code - Startup Script
echo ========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo.
    echo Please create a .env file with your Anthropic API key:
    echo   1. Copy .env.example to .env
    echo   2. Add your ANTHROPIC_API_KEY
    echo.
    echo Get your API key at: https://console.anthropic.com/
    echo.
    pause
    exit /b 1
)

echo Starting Kid Vibe Code...
echo.
echo Starting backend server on port 3001...
start "Kid Vibe Code - Server" cmd /c "node server/index.js"

echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo Starting frontend on port 3000...
start "Kid Vibe Code - Frontend" cmd /c "npm run dev"

echo.
echo ========================================
echo   Kid Vibe Code is starting!
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo ========================================
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak > nul
start http://localhost:3000
