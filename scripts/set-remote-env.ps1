param(
  [string]$SshHost = 'urbanbus.co.in',
  [string]$DeployPath = '/var/www/urbanbus',
  [Parameter(Mandatory=$true)][string[]]$Vars
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force | Out-Null
  Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber -Confirm:$false | Out-Null
}
Import-Module Posh-SSH -Force

if (-not $env:DEPLOY_SSH_PASSWORD -or $env:DEPLOY_SSH_PASSWORD.Trim().Length -eq 0) {
  throw 'DEPLOY_SSH_PASSWORD env var is not set.'
}
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString $env:DEPLOY_SSH_PASSWORD -AsPlainText -Force))
$ssh = New-SSHSession -ComputerName $SshHost -Credential $cred -AcceptKey
$sid = $ssh.SessionId
$sftp = New-SFTPSession -ComputerName $SshHost -Credential $cred -AcceptKey
$sftpid = $sftp.SessionId

Invoke-SSHCommand -SessionId $sid -Command "mkdir -p '$DeployPath'" | Out-Null

$tmp = New-TemporaryFile
$remoteEnv = "$DeployPath/.env"
$downloaded = $false
try {
  Get-SFTPItem -SessionId $sftpid -Path $remoteEnv -Destination $tmp.FullName -Force | Out-Null
  $downloaded = $true
} catch {
  $downloaded = $false
}

$lines = @()
if ($downloaded) { $lines = Get-Content -LiteralPath $tmp.FullName -ErrorAction SilentlyContinue }

# Upsert provided Vars (KEY=VALUE)
foreach ($kv in $Vars) {
  if (-not ($kv -match '^[^=]+=')) { continue }
  $eq = $kv.IndexOf('=')
  $k = $kv.Substring(0,$eq)
  $v = $kv.Substring($eq+1)
  $escapedK = [Regex]::Escape($k)
  $replaced = $false
  for ($i=0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*$escapedK=") { $lines[$i] = "$k=$v"; $replaced = $true; break }
  }
  if (-not $replaced) { $lines += "$k=$v" }
}

Set-Content -LiteralPath $tmp.FullName -Value $lines -Encoding UTF8

# Upload to directory then move into place
$localName = [System.IO.Path]::GetFileName($tmp.FullName)
Set-SFTPItem -SessionId $sftpid -Path $tmp.FullName -Destination $DeployPath -Force
Invoke-SSHCommand -SessionId $sid -Command "mv '$DeployPath/$localName' '$remoteEnv'" | Out-Null

Remove-SFTPSession -SessionId $sftpid
Remove-SSHSession -SessionId $sid

Write-Host "Updated $remoteEnv"
