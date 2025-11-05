param(
  [string]$SshHost = '89.116.121.4',
  [string]$DeployPath = '/var/www/urbanbus'
)

$ErrorActionPreference = 'Stop'

# Ensure Posh-SSH is available
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
  Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force | Out-Null
  Install-Module -Name Posh-SSH -Scope CurrentUser -Force -AllowClobber -Confirm:$false | Out-Null
}
Import-Module Posh-SSH -Force

# Read password from env (do NOT print it)
if (-not $env:DEPLOY_SSH_PASSWORD -or $env:DEPLOY_SSH_PASSWORD.Trim().Length -eq 0) {
  Write-Error 'DEPLOY_SSH_PASSWORD is not set. In PowerShell: $env:DEPLOY_SSH_PASSWORD = "<your password>"'
  exit 1
}
$sec = ConvertTo-SecureString $env:DEPLOY_SSH_PASSWORD -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential('root', $sec)

# Open sessions
$ssh = New-SSHSession -ComputerName $SshHost -Credential $cred -AcceptKey
$sid = $ssh.SessionId
$sftp = New-SFTPSession -ComputerName $SshHost -Credential $cred -AcceptKey
$sftpid = $sftp.SessionId

# Ensure remote directories
Invoke-SSHCommand -SessionId $sid -Command "mkdir -p '$DeployPath' '$DeployPath/api'" | Out-Null

# Upload prebuilt package and admin assets
if (Test-Path -LiteralPath 'manual-deployment-package/urbanbus-enhanced.tar.gz') {
  Set-SFTPItem -SessionId $sftpid -Path 'manual-deployment-package/urbanbus-enhanced.tar.gz' -Destination "$DeployPath/" -Force
}
# Legacy admin (optional)
if (Test-Path -LiteralPath 'manual-deployment-package/admin.html') {
  Set-SFTPItem -SessionId $sftpid -Path 'manual-deployment-package/admin.html' -Destination "$DeployPath/" -Force
}
if (Test-Path -LiteralPath 'manual-deployment-package/admin.js') {
  Set-SFTPItem -SessionId $sftpid -Path 'manual-deployment-package/admin.js' -Destination "$DeployPath/" -Force
}
# Simple admin
if (Test-Path -LiteralPath 'manual-deployment-package/admin-simple.html') {
  Set-SFTPItem -SessionId $sftpid -Path 'manual-deployment-package/admin-simple.html' -Destination "$DeployPath/" -Force
}
if (Test-Path -LiteralPath 'manual-deployment-package/admin-simple.js') {
  Set-SFTPItem -SessionId $sftpid -Path 'manual-deployment-package/admin-simple.js' -Destination "$DeployPath/" -Force
}
# New dashboard script if present
if (Test-Path -LiteralPath 'manual-deployment-package/admin-dashboard.js') {
  Set-SFTPItem -SessionId $sftpid -Path 'manual-deployment-package/admin-dashboard.js' -Destination "$DeployPath/" -Force
}
if (Test-Path -LiteralPath 'manual-deployment-package/favicon.svg') {
  Set-SFTPItem -SessionId $sftpid -Path 'manual-deployment-package/favicon.svg' -Destination "$DeployPath/" -Force
}
if (Test-Path -LiteralPath 'manual-deployment-package/logo-horizontal.svg') {
  Set-SFTPItem -SessionId $sftpid -Path 'manual-deployment-package/logo-horizontal.svg' -Destination "$DeployPath/" -Force
}

# Extract package on server (ignore errors if not present)
Invoke-SSHCommand -SessionId $sid -Command "cd '$DeployPath'; tar -xzf urbanbus-enhanced.tar.gz; rm -f urbanbus-enhanced.tar.gz" | Out-Null

# Upload API PHP files
Get-ChildItem -Path 'api' -Filter *.php -File | ForEach-Object {
  Set-SFTPItem -SessionId $sftpid -Path $_.FullName -Destination "$DeployPath/api/" -Force
}

# Upload root PHP utilities and demo page
Get-ChildItem -Path . -Filter *.php -File | ForEach-Object {
  Set-SFTPItem -SessionId $sftpid -Path $_.FullName -Destination "$DeployPath/" -Force
}
if (Test-Path -LiteralPath 'demo-flow.html') {
  Set-SFTPItem -SessionId $sftpid -Path 'demo-flow.html' -Destination "$DeployPath/" -Force
}

# Try to reload common web servers (best effort)
Invoke-SSHCommand -SessionId $sid -Command 'nginx -t' | Out-Null
Invoke-SSHCommand -SessionId $sid -Command 'systemctl reload nginx' | Out-Null
Invoke-SSHCommand -SessionId $sid -Command 'service nginx reload' | Out-Null
Invoke-SSHCommand -SessionId $sid -Command 'systemctl reload apache2' | Out-Null
Invoke-SSHCommand -SessionId $sid -Command 'service apache2 reload' | Out-Null

# Close sessions
Remove-SFTPSession -SessionId $sftpid
Remove-SSHSession -SessionId $sid

Write-Host ("Deployed to {0}:{1}" -f $SshHost, $DeployPath)
