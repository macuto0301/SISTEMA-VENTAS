param(
    [string]$RepoUrl = "https://github.com/macuto0301/SISTEMA-VENTAS.git",
    [string]$InstallDir = "$env:USERPROFILE\Documents\SISTEMA-VENTAS",
    [string]$DbName = "ventas_db",
    [string]$DemoDbName = "ventas_demo",
    [string]$DbUser = "admin",
    [string]$DbPassword = "secret_password",
    [int]$DbPort = 5432,
    [string]$PgAdminUser = "postgres",
    [string]$PgAdminPassword = "postgres",
    [switch]$StartApp
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Ensure-Winget {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "winget no esta disponible. Instala App Installer desde Microsoft Store e intenta de nuevo."
    }
}

function Ensure-Tool {
    param(
        [string]$Tool,
        [string]$WingetId,
        [string]$InstallName
    )

    if (Get-Command $Tool -ErrorAction SilentlyContinue) {
        return
    }

    Ensure-Winget
    Write-Step "Instalando $InstallName con winget"
    winget install --id $WingetId -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
}

function Get-PsqlPath {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Path
    }

    $candidate = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        Select-Object -First 1

    if (-not $candidate) {
        return $null
    }

    $psqlExe = Join-Path $candidate.FullName "bin\psql.exe"
    if (Test-Path $psqlExe) {
        return $psqlExe
    }

    return $null
}

function Ensure-PostgreSQL {
    $psqlPath = Get-PsqlPath
    if ($psqlPath) {
        return $psqlPath
    }

    Ensure-Winget
    Write-Step "Instalando PostgreSQL con winget"
    winget install --id PostgreSQL.PostgreSQL.16 -e --silent --accept-package-agreements --accept-source-agreements --override "--mode unattended --superpassword $PgAdminPassword" | Out-Host

    $psqlPath = Get-PsqlPath
    if (-not $psqlPath) {
        throw "No se pudo localizar psql.exe despues de instalar PostgreSQL."
    }

    return $psqlPath
}

function Ensure-PostgresService {
    $services = Get-Service | Where-Object { $_.Name -match "postgresql" }
    if (-not $services) {
        throw "No se encontro servicio de PostgreSQL."
    }

    foreach ($service in $services) {
        if ($service.Status -ne "Running") {
            Write-Step "Iniciando servicio $($service.Name)"
            Start-Service $service.Name
        }
    }
}

function Invoke-Psql {
    param(
        [string]$PsqlPath,
        [string]$Sql
    )

    $env:PGPASSWORD = $PgAdminPassword
    & $PsqlPath -h localhost -p $DbPort -U $PgAdminUser -d postgres -v ON_ERROR_STOP=1 -c $Sql | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "Error ejecutando SQL: $Sql"
    }
}

function Get-PsqlScalar {
    param(
        [string]$PsqlPath,
        [string]$Sql
    )

    $env:PGPASSWORD = $PgAdminPassword
    $result = & $PsqlPath -h localhost -p $DbPort -U $PgAdminUser -d postgres -tA -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "Error ejecutando consulta SQL: $Sql"
    }

    return ($result | Out-String).Trim()
}

function Test-PostgresConnection {
    param([string]$PsqlPath)

    if (-not $PsqlPath) {
        return $false
    }

    try {
        $env:PGPASSWORD = $PgAdminPassword
        & $PsqlPath -h localhost -p $DbPort -U $PgAdminUser -d postgres -tA -c "SELECT 1;" | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Resolve-PostgreSQL {
    $psqlPath = Get-PsqlPath

    if ($psqlPath) {
        Ensure-PostgresService
        if (Test-PostgresConnection -PsqlPath $psqlPath) {
            Write-Step "Conexion a PostgreSQL local verificada"
            return $psqlPath
        }
    }

    Write-Host "No hay conexion a PostgreSQL en localhost:$DbPort." -ForegroundColor Yellow
    $answer = Read-Host "Deseas instalar PostgreSQL ahora? (S/N)"

    if ($answer -notin @('S', 's', 'SI', 'Si', 'si', 'Y', 'y', 'YES', 'Yes', 'yes')) {
        throw "Instalacion cancelada: se requiere PostgreSQL para continuar."
    }

    $psqlPath = Ensure-PostgreSQL
    Ensure-PostgresService

    if (-not (Test-PostgresConnection -PsqlPath $psqlPath)) {
        throw "PostgreSQL fue instalado pero no se pudo establecer conexion en localhost:$DbPort con el usuario $PgAdminUser."
    }

    Write-Step "PostgreSQL instalado y conexion verificada"
    return $psqlPath
}

function Ensure-Database {
    param(
        [string]$PsqlPath,
        [string]$TargetDbName
    )

    Write-Step "Creando usuario y base de datos $TargetDbName si no existen"

    $safeUser = $DbUser.Replace("'", "''")
    $safePass = $DbPassword.Replace("'", "''")
    $safeDb = $TargetDbName.Replace("'", "''")

    $userExists = Get-PsqlScalar -PsqlPath $PsqlPath -Sql "SELECT 1 FROM pg_roles WHERE rolname = '$safeUser';"
    if ($userExists -eq "1") {
        Invoke-Psql -PsqlPath $PsqlPath -Sql "ALTER ROLE \"$DbUser\" WITH LOGIN PASSWORD '$safePass';"
    } else {
        Invoke-Psql -PsqlPath $PsqlPath -Sql "CREATE ROLE \"$DbUser\" LOGIN PASSWORD '$safePass';"
    }

    $dbExists = Get-PsqlScalar -PsqlPath $PsqlPath -Sql "SELECT 1 FROM pg_database WHERE datname = '$safeDb';"
    if ($dbExists -ne "1") {
        Invoke-Psql -PsqlPath $PsqlPath -Sql "CREATE DATABASE \"$TargetDbName\" OWNER \"$DbUser\";"
    }
}

function Ensure-Repo {
    if (Test-Path $InstallDir) {
        $gitDir = Join-Path $InstallDir ".git"
        if (Test-Path $gitDir) {
            Write-Step "Repositorio ya existe, actualizando"
            git -C $InstallDir pull --ff-only | Out-Host
            return
        }

        throw "La ruta $InstallDir ya existe y no es un repositorio git. Usa otra ruta con -InstallDir."
    }

    Write-Step "Clonando repositorio en $InstallDir"
    git clone $RepoUrl $InstallDir | Out-Host
}

function Write-EnvFile {
    $envPath = Join-Path $InstallDir "backend\.env"
    $demoDatabaseUrl = "postgresql://$($DbUser):$($DbPassword)@localhost:$($DbPort)/$($DemoDbName)"
    $realDatabaseUrl = "postgresql://$($DbUser):$($DbPassword)@localhost:$($DbPort)/$($DbName)"

    $envContent = @"
APP_MODE=demo
DATABASE_URL=$demoDatabaseUrl
DATABASE_URL_DEMO=$demoDatabaseUrl
DATABASE_URL_REAL=$realDatabaseUrl
PORT=5000
DEBUG=True
CORS_ORIGINS=http://localhost:5000,http://127.0.0.1:5000
"@

    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-Step "Archivo backend/.env generado"
}

function Setup-Python {
    Ensure-Tool -Tool "git" -WingetId "Git.Git" -InstallName "Git"
    Ensure-Tool -Tool "py" -WingetId "Python.Python.3.12" -InstallName "Python"

    $venvPython = Join-Path $InstallDir "backend\.venv\Scripts\python.exe"

    Write-Step "Creando entorno virtual"
    py -m venv (Join-Path $InstallDir "backend\.venv")

    Write-Step "Instalando dependencias del backend"
    & $venvPython -m pip install --upgrade pip | Out-Host
    & $venvPython -m pip install -r (Join-Path $InstallDir "backend\requirements.txt") | Out-Host
}

function Start-Backend {
    $venvPython = Join-Path $InstallDir "backend\.venv\Scripts\python.exe"
    $appPath = Join-Path $InstallDir "backend\app.py"

    Write-Step "Iniciando backend en una ventana nueva"
    Start-Process -FilePath $venvPython -ArgumentList $appPath -WorkingDirectory (Join-Path $InstallDir "backend")
}

Write-Step "Validando herramientas base"
Ensure-Tool -Tool "git" -WingetId "Git.Git" -InstallName "Git"
Ensure-Tool -Tool "py" -WingetId "Python.Python.3.12" -InstallName "Python"

Ensure-Repo
Setup-Python

$psqlPath = Resolve-PostgreSQL
Ensure-Database -PsqlPath $psqlPath -TargetDbName $DemoDbName
Ensure-Database -PsqlPath $psqlPath -TargetDbName $DbName
Write-EnvFile

Write-Step "Instalacion completada"
Write-Host "Proyecto: $InstallDir" -ForegroundColor Green
Write-Host "Backend listo en: http://localhost:5000" -ForegroundColor Green
Write-Host "Modo inicial activo: demo" -ForegroundColor Green
Write-Host "Credenciales demo: demo-admin / 1234 y demo-cajero / 1234" -ForegroundColor Green
Write-Host "Para iniciar demo: powershell -ExecutionPolicy Bypass -File $InstallDir\start_demo.ps1" -ForegroundColor Yellow
Write-Host "Para iniciar real: powershell -ExecutionPolicy Bypass -File $InstallDir\start_real.ps1" -ForegroundColor Yellow

if ($StartApp) {
    Start-Backend
}

Write-Host "Para iniciar manualmente: $InstallDir\backend\.venv\Scripts\python.exe $InstallDir\backend\app.py" -ForegroundColor Yellow
