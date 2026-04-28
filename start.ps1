# Start Nexus Business Suite
Write-Host "Launching Nexus Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "cd backend; node server.js"

Write-Host "Launching Nexus Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "cd frontend; npm run dev"

Write-Host "Nexus Business Suite is now initializing. Welcome back, Pablo." -ForegroundColor Green
