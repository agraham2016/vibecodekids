@echo off
echo.
echo ================================================================
echo    KID VIBE CODE - TEST BOT LAUNCHER
echo ================================================================
echo.
echo Make sure your servers are running first!
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:3001
echo.
echo ----------------------------------------------------------------
echo Choose a test to run:
echo.
echo   1. Interactive Bot (single quick demo)
echo   2. Quick API Tests (fast health checks)
echo   3. Full Test Suite (all basic tests)
echo.
echo   --- GAME BUILDER BOT (5 games, 8-10 prompts each) ---
echo   4. Build ALL 5 Games (takes 30-60 minutes)
echo   5. Build Game 1: Balloon Pop
echo   6. Build Game 2: Space Shooter
echo   7. Build Game 3: Cookie Clicker
echo   8. Build Game 4: Maze Runner
echo   9. Build Game 5: Drawing Canvas
echo.
echo   0. View Last Test Report
echo.
echo ----------------------------------------------------------------
set /p choice="Enter your choice (0-9): "

if "%choice%"=="1" (
    echo.
    echo Starting Interactive Bot... Watch the browser!
    echo.
    npm run test:bot
) else if "%choice%"=="2" (
    echo.
    echo Running quick API tests...
    echo.
    npm run test:quick
) else if "%choice%"=="3" (
    echo.
    echo Running full test suite...
    echo.
    npm run test:all
) else if "%choice%"=="4" (
    echo.
    echo ========================================
    echo BUILDING ALL 5 GAMES - This will take a while!
    echo 50 total prompts across 5 different games
    echo ========================================
    echo.
    npm run test:games
) else if "%choice%"=="5" (
    echo.
    echo Building Game 1: Balloon Pop (10 prompts)
    echo.
    npm run test:game1
) else if "%choice%"=="6" (
    echo.
    echo Building Game 2: Space Shooter (10 prompts)
    echo.
    npm run test:game2
) else if "%choice%"=="7" (
    echo.
    echo Building Game 3: Cookie Clicker (10 prompts)
    echo.
    npm run test:game3
) else if "%choice%"=="8" (
    echo.
    echo Building Game 4: Maze Runner (10 prompts)
    echo.
    npm run test:game4
) else if "%choice%"=="9" (
    echo.
    echo Building Game 5: Drawing Canvas (10 prompts)
    echo.
    npm run test:game5
) else if "%choice%"=="0" (
    echo.
    echo Opening test report...
    echo.
    npm run test:report
) else (
    echo Invalid choice. Running interactive bot by default...
    npm run test:bot
)

echo.
echo ================================================================
echo Test complete! Check test-results folder for screenshots.
echo ================================================================
pause
