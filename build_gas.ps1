# =========================================================================
# M-C Tuition Application: One-Click Google Apps Script Builder Script
# =========================================================================

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "M-C Tuition App: Compiling & Bundling Frontend" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Ensure node_modules are present
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules are missing! Running npm install first..." -ForegroundColor Yellow
    npm install
}

# 1. Clean dist directory
if (Test-Path "dist") {
    Write-Host "Cleaning old build files..." -ForegroundColor Gray
    Remove-Item -Path "dist" -Recurse -Force
}

# 2. Build the Vite React Frontend
Write-Host "Running Vite compiler (Bundling all CSS, JS & Assets into one file)..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ compilation and build failed!" -ForegroundColor Red
    Exit 1
}

# 3. Verify single-file output
$bundledHtml = "dist/index.html"
if (-not (Test-Path $bundledHtml)) {
    Write-Host "❌ Error: single-file dist/index.html was not generated!" -ForegroundColor Red
    Exit 1
}

# 4. Copy to gas-backend/Index.html
Write-Host "Copying bundled HTML to Google Apps Script template..." -ForegroundColor Yellow
if (-not (Test-Path "gas-backend")) {
    New-Item -ItemType Directory -Force -Path "gas-backend" | Out-Null
}

Copy-Item -Path $bundledHtml -Destination "gas-backend/Index.html" -Force

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS: Build completed successfully!" -ForegroundColor Green
Write-Host "Frontend bundled into: gas-backend/Index.html" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "You can now copy the contents of:" -ForegroundColor White
Write-Host "1. gas-backend/Code.gs -> Paste into Google Apps Script Code.gs" -ForegroundColor Cyan
Write-Host "2. gas-backend/Index.html -> Paste into Google Apps Script Index.html" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
