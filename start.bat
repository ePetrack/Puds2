@echo off
echo Starting Energy Management Platform...
echo.

REM Check if pocketbase.exe exists
if not exist "pocketbase.exe" (
    echo ERROR: pocketbase.exe not found!
    echo.
    echo Please download PocketBase from:
    echo https://github.com/pocketbase/pocketbase/releases/latest
    echo.
    echo Download: pocketbase_[version]_windows_amd64.zip
    echo Extract pocketbase.exe to this folder
    echo.
    pause
    exit /b 1
)

REM Disable migrations temporarily (until we set up schema manually)
if exist "pb_migrations" (
    if not exist "pb_migrations_disabled" (
        echo Disabling migrations...
        rename pb_migrations pb_migrations_disabled
    )
)

REM Start PocketBase in the background
echo Starting PocketBase on http://127.0.0.1:8090...
start /B pocketbase.exe serve --http=127.0.0.1:8090

REM Wait a moment for PocketBase to start
timeout /t 3 /nobreak > nul

REM Start SvelteKit dev server
echo Starting SvelteKit dev server on http://localhost:5173...
echo.
echo ============================================
echo   Energy Management Platform is starting!
echo ============================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://127.0.0.1:8090/_/
echo.
echo Press Ctrl+C to stop both servers
echo.

npm run dev
