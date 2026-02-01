# fix-npm-eperm.ps1
# Deterministic fix for npm EPERM (locked file) or ENOENT (e.g. tailwind preflight.css missing)
# during frontend build on Windows. Use from repo root. Does NOT change vite.config or production build behavior.
# If the project is inside OneDrive/synced folder, copy the repo to C:\dev\tomo-market-v2 first, then run this script.
# Production server: use "npm ci" and "npm run build" as usual (no need for this script).

$ErrorActionPreference = "Stop"
# Repo root: script is tools/windows/fix-npm-eperm.ps1 -> go up twice
$RepoRoot = Split-Path (Split-Path $PSScriptRoot)
$FrontendPath = Join-Path $RepoRoot "frontend"

Write-Host "=== TOMO Frontend: Fix npm EPERM (Windows) ===" -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot"
Write-Host "Frontend:  $FrontendPath"
Write-Host ""

# 1) Stop Node processes to release locked .node files
Write-Host "[1/5] Stopping Node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Done."
Write-Host ""

# 2) Remove frontend/node_modules (keeps package-lock.json for reproducibility)
Write-Host "[2/5] Removing frontend/node_modules..." -ForegroundColor Yellow
$nodeModules = Join-Path $FrontendPath "node_modules"
if (Test-Path $nodeModules) {
    Remove-Item -Path $nodeModules -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $nodeModules) {
        Write-Host "WARNING: Could not fully remove node_modules. Close IDE/terminal/OneDrive and run again, or move repo to C:\dev\tomo-market-v2" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Done."
Write-Host ""

# 3) Clear npm cache
Write-Host "[3/5] Clearing npm cache..." -ForegroundColor Yellow
Set-Location $FrontendPath
npm cache clean --force 2>$null
Write-Host "Done."
Write-Host ""

# 4) Reinstall: prefer npm ci; if it fails, use npm install (Windows local dev only)
Write-Host "[4/5] Reinstalling dependencies (npm ci)..." -ForegroundColor Yellow
$ciOk = $false
try {
    npm ci 2>&1
    if ($LASTEXITCODE -eq 0) { $ciOk = $true }
} catch {
    $ciOk = $false
}
if (-not $ciOk) {
    Write-Host "npm ci failed. Trying npm install --no-audit --no-fund (Windows local dev fallback)..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Install failed. Move repo to C:\dev\tomo-market-v2 (non-synced path) and run this script again." -ForegroundColor Red
        exit 1
    }
}
Write-Host "Done."
Write-Host ""

# 4b) Verify tailwindcss installed (prevents ENOENT preflight.css)
$preflight = Join-Path $FrontendPath "node_modules\tailwindcss\lib\css\preflight.css"
if (-not (Test-Path $preflight)) {
    Write-Host "ERROR: tailwindcss incomplete (preflight.css missing)." -ForegroundColor Red
    Write-Host "  Copy the project to a NON-SYNCED folder (e.g. C:\dev\tomo-market-v2), then run this script again." -ForegroundColor Yellow
    Write-Host "  OneDrive/sync often causes incomplete node_modules." -ForegroundColor Yellow
    exit 1
}
Write-Host "Tailwind OK (preflight.css found)."
Write-Host ""

# 5) Build
Write-Host "[5/5] Running npm run build..." -ForegroundColor Yellow
$env:VITE_API_URL = "https://api.tomo-sa.com"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Success ===" -ForegroundColor Green
Write-Host "Frontend built. Output in frontend/dist/"
Write-Host "On production server use: npm ci && npm run build (no need for this script)."
