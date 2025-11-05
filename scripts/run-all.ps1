param(
  [string]$SshHost = '89.116.121.4',
  [string]$DeployPath = '/var/www/urbanbus',
  [int[]]$Prices = @(1480,1580,1810,2150,2299),
  [int]$Days = 30,
  [int]$DeparturesPerDay = 1,
  [int]$MinGapHours = 16
)
$ErrorActionPreference = 'Stop'

Write-Host 'Enter root password for the VPS (input hidden):'
$pw = Read-Host -AsSecureString
$env:DEPLOY_SSH_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pw))
if (-not $env:DEPLOY_SSH_PASSWORD) { throw 'Password is required.' }

# 1) Deploy site + APIs + admin assets
Write-Host 'Deploying site and APIs...'
pwsh -NoProfile -File scripts/deploy.ps1 -SshHost $SshHost -DeployPath $DeployPath

# 2) Generate ADMIN_TOKEN and set it on server
$tokenBytes = New-Object byte[] 48
(new-object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($tokenBytes)
$ADMIN_TOKEN = [Convert]::ToBase64String($tokenBytes)
Write-Host 'Configuring ADMIN_TOKEN on server...'
pwsh -NoProfile -File scripts/set-admin-token.ps1 -SshHost $SshHost -DeployPath $DeployPath -Token $ADMIN_TOKEN

# 3) Seed schedules (Kalpa → Delhi) with random departures >= 16h apart
Write-Host 'Seeding Kalpa → Delhi schedules...'
pwsh -NoProfile -File scripts/seed-schedules.ps1 -AdminToken $ADMIN_TOKEN -BaseUrl ("https://" + ($SshHost -eq '89.116.121.4' ? 'urbanbus.co.in' : $SshHost)) -Origin 'Kalpa' -Destination 'Delhi' -Prices $Prices -Days $Days -DeparturesPerDay $DeparturesPerDay -MinGapHours $MinGapHours -Duration '16:00' -PriceMode random

Write-Host 'All done. Visit https://urbanbus.co.in/admin-simple.html to review.'
