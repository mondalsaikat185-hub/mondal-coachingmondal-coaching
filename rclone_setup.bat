@echo off
echo ========================================================
echo Google Drive Authorization for VPS Sync
echo ========================================================
echo.
echo Step 1: Getting Auth Token from Google...
echo (A browser window will open. Please log in with your Google account, 
echo click "Advanced" and allow rclone access to view/download files.)
echo.

if not exist "scratch\rclone.exe" (
    echo [Error] scratch\rclone.exe not found!
    pause
    exit /b
)

.\scratch\rclone.exe authorize "drive"

echo.
echo ========================================================
echo SUCCESS! 
echo Please copy the ENTIRE token code printed above 
echo (including the curly braces { ... }) and paste it to the AI.
echo ========================================================
pause
