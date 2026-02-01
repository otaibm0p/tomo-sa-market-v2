# =========================
# STEP 1: Verify PostgreSQL is installed
# =========================
$PSQL_PATH = "C:\Program Files\PostgreSQL\15\bin\psql.exe"
if (!(Test-Path $PSQL_PATH)) {
  Write-Error "PostgreSQL bin not found at expected path"
  exit 1
}
Write-Host "PostgreSQL found: $PSQL_PATH"

# =========================
# STEP 2: Create database 'tomo'
# Set PGPASSWORD if postgres has a password: $env:PGPASSWORD="YOUR_POSTGRES_PASSWORD"
# =========================
$createDb = & $PSQL_PATH -U postgres -c "CREATE DATABASE tomo;" 2>&1
if ($LASTEXITCODE -ne 0 -and $createDb -notmatch "already exists") {
  Write-Host "Note: Create DB failed (wrong password?). Edit backend\.env DATABASE_URL with correct postgres password. Continuing..."
}

# =========================
# STEP 3: Ensure backend .env exists and is valid
# =========================
$backendDir = Join-Path $PSScriptRoot "backend"
if (!(Test-Path $backendDir)) { Write-Error "backend folder not found"; exit 1 }
Set-Location $backendDir

if (!(Test-Path .env)) {
  @"
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:POSTGRES_PASSWORD@localhost:5432/tomo
JWT_SECRET=CHANGE_THIS_TO_A_LONG_SECURE_SECRET_32_CHARS_MIN
"@ | Out-File -Encoding utf8 .env
  Write-Host "Created backend\.env - replace POSTGRES_PASSWORD with your PostgreSQL password"
} else {
  Write-Host "backend\.env already exists"
}

# =========================
# STEP 4: Seed admin users (secure, no fallback)
# =========================
$env:TOMO_ADMIN_PASSWORD = "Tomo.2439"
node seed-admin-users.js
if ($LASTEXITCODE -ne 0) {
  Write-Host "Seed failed. Edit backend\.env: set DATABASE_URL=postgresql://postgres:YOUR_REAL_POSTGRES_PASSWORD@localhost:5432/tomo"
  exit 1
}

# =========================
# STEP 5: Start backend server
# =========================
Write-Host "Starting backend server..."
npm start
