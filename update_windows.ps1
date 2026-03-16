$ErrorActionPreference = "Stop"

param(
    [string]$InstallDir = (Split-Path -Parent $MyInvocation.MyCommand.Path),
    [switch]$StartDemo,
    [switch]$StartReal,
    [switch]$DryRun
)

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Ensure-Path {
    param([string]$PathToCheck, [string]$ErrorMessage)
    if (-not (Test-Path $PathToCheck)) {
        throw $ErrorMessage
    }
}

if ($StartDemo -and $StartReal) {
    throw "No puedes usar -StartDemo y -StartReal al mismo tiempo."
}

Ensure-Path -PathToCheck (Join-Path $InstallDir ".git") -ErrorMessage "No se encontro un repositorio git en $InstallDir"

$backendDir = Join-Path $InstallDir "backend"
$venvPython = Join-Path $InstallDir "backend\.venv\Scripts\python.exe"
$requirements = Join-Path $backendDir "requirements.txt"
$envPath = Join-Path $backendDir ".env"
$uploadsPath = Join-Path $backendDir "uploads"

Ensure-Path -PathToCheck $backendDir -ErrorMessage "No se encontro la carpeta backend en $InstallDir"
Ensure-Path -PathToCheck $venvPython -ErrorMessage "No se encontro el entorno virtual en backend\\.venv"
Ensure-Path -PathToCheck $requirements -ErrorMessage "No se encontro backend\\requirements.txt"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path $InstallDir "backups"
$backupDir = Join-Path $backupRoot ("update_" + $timestamp)
$backupEnvPath = Join-Path $backupDir "backend\.env"
$backupUploadsPath = Join-Path $backupDir "backend\uploads"

Write-Step "Creando carpeta de respaldo en $backupDir"
if (-not $DryRun) {
    New-Item -Path $backupDir -ItemType Directory -Force | Out-Null
}

if (Test-Path $envPath) {
    Write-Step "Respaldando backend/.env"
    if (-not $DryRun) {
        New-Item -Path (Split-Path -Parent $backupEnvPath) -ItemType Directory -Force | Out-Null
        Copy-Item -Path $envPath -Destination $backupEnvPath -Force
    }
} else {
    Write-Host "No existe backend/.env, se continua sin ese respaldo." -ForegroundColor Yellow
}

if (Test-Path $uploadsPath) {
    Write-Step "Respaldando backend/uploads"
    if (-not $DryRun) {
        New-Item -Path (Split-Path -Parent $backupUploadsPath) -ItemType Directory -Force | Out-Null
        Copy-Item -Path $uploadsPath -Destination $backupUploadsPath -Recurse -Force
    }
} else {
    Write-Host "No existe backend/uploads, se continua sin ese respaldo." -ForegroundColor Yellow
}

Write-Step "Actualizando codigo con git pull"
if ($DryRun) {
    Write-Host "[DryRun] git -C $InstallDir pull --ff-only"
} else {
    git -C $InstallDir pull --ff-only | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "git pull fallo. Revisa cambios locales o conectividad."
    }
}

Write-Step "Actualizando dependencias del backend"
if ($DryRun) {
    Write-Host "[DryRun] $venvPython -m pip install -r $requirements"
} else {
    & $venvPython -m pip install -r $requirements | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudieron actualizar dependencias."
    }
}

if (Test-Path $backupEnvPath) {
    Write-Step "Restaurando backend/.env"
    if (-not $DryRun) {
        Copy-Item -Path $backupEnvPath -Destination $envPath -Force
    }
}

if (Test-Path $backupUploadsPath) {
    Write-Step "Restaurando backend/uploads"
    if (-not $DryRun) {
        if (Test-Path $uploadsPath) {
            Remove-Item -Path $uploadsPath -Recurse -Force
        }
        Copy-Item -Path $backupUploadsPath -Destination $uploadsPath -Recurse -Force
    }
}

Write-Step "Actualizacion completada"
Write-Host "Respaldo guardado en: $backupDir" -ForegroundColor Green
Write-Host "Sistema actualizado correctamente." -ForegroundColor Green

if ($StartDemo) {
    Write-Step "Iniciando sistema en modo demo"
    if ($DryRun) {
        Write-Host "[DryRun] powershell -ExecutionPolicy Bypass -File $(Join-Path $InstallDir "start_demo.ps1")"
    } else {
        powershell -ExecutionPolicy Bypass -File (Join-Path $InstallDir "start_demo.ps1")
    }
}

if ($StartReal) {
    Write-Step "Iniciando sistema en modo real"
    if ($DryRun) {
        Write-Host "[DryRun] powershell -ExecutionPolicy Bypass -File $(Join-Path $InstallDir "start_real.ps1")"
    } else {
        powershell -ExecutionPolicy Bypass -File (Join-Path $InstallDir "start_real.ps1")
    }
}