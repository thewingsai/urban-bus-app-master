param(
  [string]$SshHost = 'urbanbus.co.in',
  [string]$DeployPath = '/var/www/urbanbus',
  [Parameter(Mandatory=$true)][string]$Token
)

$ErrorActionPreference = 'Stop'

# Ensure Posh-SSH is available
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force | Out-Null
  Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber -Confirm:$false | Out-Null
}
Import-Module Posh-SSH -Force

# Connect SSH/SFTP using DEPLOY_SSH_PASSWORD from env
if (-not $env:DEPLOY_SSH_PASSWORD -or $env:DEPLOY_SSH_PASSWORD.Trim().Length -eq 0) {
  throw 'DEPLOY_SSH_PASSWORD env var is not set.'
}
$cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString $env:DEPLOY_SSH_PASSWORD -AsPlainText -Force))
$ssh = New-SSHSession -ComputerName $SshHost -Credential $cred -AcceptKey
$sid = $ssh.SessionId
$sftp = New-SFTPSession -ComputerName $SshHost -Credential $cred -AcceptKey
$sftpid = $sftp.SessionId

# Ensure remote path
Invoke-SSHCommand -SessionId $sid -Command "mkdir -p '$DeployPath'" | Out-Null

# Prepare local temp .env, merging existing if present
$tmp = New-TemporaryFile
$remoteEnv = "$DeployPath/.env"
$downloaded = $false
try {
  Get-SFTPItem -SessionId $sftpid -RemoteFile $remoteEnv -LocalPath $tmp.FullName -ErrorAction Stop | Out-Null
  $downloaded = $true
} catch {
  $downloaded = $false
}
$lines = @()
if ($downloaded) { $lines = Get-Content -LiteralPath $tmp.FullName -ErrorAction SilentlyContinue }
$lines = $lines | Where-Object { $_ -notmatch '^(?i)ADMIN_TOKEN=' }
$lines += "ADMIN_TOKEN=$Token"
Set-Content -LiteralPath $tmp.FullName -Value $lines -Encoding UTF8

# Upload .env back (upload to directory, then rename to .env)
$localName = [System.IO.Path]::GetFileName($tmp.FullName)
Set-SFTPItem -SessionId $sftpid -Path $tmp.FullName -Destination $DeployPath -Force
Invoke-SSHCommand -SessionId $sid -Command "mv '$DeployPath/$localName' '$remoteEnv'" | Out-Null

# Close
Remove-SFTPSession -SessionId $sftpid
Remove-SSHSession -SessionId $sid

Write-Host "Updated $remoteEnv"
