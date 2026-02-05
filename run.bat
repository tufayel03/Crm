@echo off
echo ==========================================
echo Starting Matlance CRM (Docker Mode)
echo ==========================================
echo.
echo Ensuring Docker is running...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker is NOT running. Please start Docker Desktop and try again.
    pause
    exit /b
)

echo.
echo Building and Starting Containers...
echo This might take a few minutes the first time.
echo.

docker compose up --build

echo.
echo Process stopped.
pause
