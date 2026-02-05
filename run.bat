@echo off
setlocal
echo ==========================================
echo Matlance CRM - One-Click Launcher
echo ==========================================
echo.

:: 1. Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Docker is NOT installed.
    echo [+] Checking for Windows Package Manager (winget)...
    
    where winget >nul 2>&1
    if %errorlevel% neq 0 (
        echo [X] Winget is not detected. Cannot install automatically.
        echo     Please install Docker Desktop manually from:
        echo     https://www.docker.com/products/docker-desktop/
        pause
        exit /b
    )

    echo [+] Attempting to install Docker Desktop automatically...
    echo     (Please click 'Yes' if prompted for Administrator permission)
    
    :: Try installing Docker
    winget install --id Docker.DockerDesktop -e --accept-package-agreements --accept-source-agreements
    
    if %errorlevel% neq 0 (
        echo.
        echo [X] Automatic installation failed.
        echo     Reason: Winget command returned an error.
        echo.
        echo     Please install Docker Desktop manually from: 
        echo     https://www.docker.com/products/docker-desktop/
        pause
        exit /b
    )
    
    echo.
    echo ========================================================
    echo [v] Docker successfully installed!
    echo [!] You MUST restart your computer now.
    echo     After restarting, run this script again.
    echo ========================================================
    pause
    exit /b
)

:: 2. Check if Docker Daemon is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Docker is installed but NOT running.
    echo [+] Attempting to start Docker Desktop...
    
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    
    echo     Waiting for Docker to start (this may take a minute)...
    :wait_loop
    timeout /t 5 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 goto wait_loop
    
    echo [v] Docker is now running!
)

:: 3. Run the App
echo.
echo [v] Docker is ready.
echo [+] Building and Starting Matlance CRM...
echo     (First run may take a few minutes to download components)
echo.

docker compose up --build -d

echo.
echo ====================================================
echo [v] APP IS RUNNING!
echo.
echo Open your browser to: http://localhost:3000
echo ====================================================
echo.
echo To stop the app, you can close this window (it runs in background),
echo or run 'docker compose down' in this folder.
pause
