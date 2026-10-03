@echo off
echo ========================================================
echo Google Apps Script - Clasp Login ^& Project Pull Tool
echo ========================================================
echo.
echo Step 1: Logging in to Google...
echo (A browser window will open. Please log in with your Google account and allow access.)
echo.
call npx @google/clasp login

echo.
echo Step 2: Setting up the Live Backend Directory...
if not exist "gas-backend-live" (
    mkdir gas-backend-live
)
cd gas-backend-live

echo.
set /p SCRIPT_ID="Please enter your Google Apps Script SCRIPT ID (e.g. 1ABCxyz...): "

echo.
echo Step 3: Cloning the live code...
call npx @google/clasp clone %SCRIPT_ID%

echo.
echo ========================================================
echo SUCCESS! 
echo The live Google Apps Script code has been pulled into the "gas-backend-live" folder.
echo You can now close this window.
echo ========================================================
pause
