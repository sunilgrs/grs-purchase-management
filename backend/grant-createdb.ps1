# Grant CREATEDB to grs_user via a temporary pg_hba trust edit.
# Run this from an ELEVATED PowerShell (right-click -> Run as administrator).
# It restores pg_hba.conf automatically, so leaving trust enabled is impossible.
$ErrorActionPreference = 'Stop'

$pgBin     = 'C:\Program Files\PostgreSQL\18\bin'
$hba       = 'C:\Program Files\PostgreSQL\18\data\pg_hba.conf'
$backup    = "$hba.bak-createdb"
$service   = 'postgresql-x64-18'

$trustLines = @(
    'host    all             postgres        127.0.0.1/32            trust',
    'host    all             postgres        ::1/128                 trust'
)

function Restore-Hba {
    if (Test-Path -LiteralPath $backup) {
        Copy-Item -LiteralPath $backup -Destination $hba -Force
        Remove-Item -LiteralPath $backup -Force
        Write-Output 'pg_hba.conf restored from backup.'
    }
}

try {
    Write-Output "Backing up pg_hba.conf -> $backup"
    Copy-Item -LiteralPath $hba -Destination $backup -Force

    Write-Output 'Prepending trust rules for postgres user.'
    $content = Get-Content -LiteralPath $hba
    $merged  = ($trustLines + $content)
    Set-Content -LiteralPath $hba -Value $merged -Encoding UTF8

    Write-Output 'Restarting PostgreSQL service...'
    Restart-Service -Name $service

    Write-Output 'Granting CREATEDB to grs_user...'
    $env:PGPASSWORD = 'ignored-by-trust'
    & "$pgBin\psql.exe" -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "ALTER ROLE grs_user CREATEDB;"
    if ($LASTEXITCODE -ne 0) { throw "ALTER ROLE failed with exit code $LASTEXITCODE" }

    Write-Output 'Restoring pg_hba.conf...'
    Restore-Hba

    Write-Output 'Restarting PostgreSQL service again...'
    Restart-Service -Name $service

    Write-Output 'Verifying...'
    & "$pgBin\psql.exe" -h 127.0.0.1 -U grs_user -d grs_purchase -tAc "SELECT rolname || ' createdb=' || rolcreatedb FROM pg_roles WHERE rolname='grs_user';"
    Write-Output 'Done. CREATEDB granted.'
}
catch {
    Write-Output "ERROR: $($_.Exception.Message)"
    Write-Output 'Restoring pg_hba.conf to a safe state...'
    Restore-Hba
    try { Restart-Service -Name $service } catch { Write-Output "WARNING: could not restart service: $($_.Exception.Message)" }
    throw
}
