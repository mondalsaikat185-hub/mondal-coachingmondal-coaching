Set-Location "C:\Users\monda\Desktop\Mondal Coaching"

Write-Host "=== BUILDING ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED! Check errors above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Build OK" -ForegroundColor Green

Write-Host "=== DEPLOYING ===" -ForegroundColor Cyan
npx firebase-tools deploy --only hosting
if ($LASTEXITCODE -ne 0) {
    Write-Host "DEPLOY FAILED!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Deploy OK" -ForegroundColor Green

Write-Host "=== GIT PUSH ===" -ForegroundColor Cyan
if (Test-Path ".git\index.lock") { Remove-Item ".git\index.lock" -Force }
if (Test-Path ".git\HEAD.lock")  { Remove-Item ".git\HEAD.lock"  -Force }
git add -A
git commit -m "Fix Admin Results: resolved search crash, populated exam titles, corrected score representation (marks got / total possible marks with percentage), added ranked scoreboard list for selected exams"
git push origin main
Write-Host "=== ALL DONE ===" -ForegroundColor Green
exit 0
