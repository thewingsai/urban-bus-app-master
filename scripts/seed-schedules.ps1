param(
  [Parameter(Mandatory=$true)][string]$AdminToken,
  [string]$BaseUrl = 'https://urbanbus.co.in',
  [string]$Origin = 'Kalpa',
  [string]$Destination = 'Delhi',
  [string]$BusType = 'zingbus plus Bharat Benz A/C Semi Sleeper (2+2)',
  [int]$Seats = 31,
  [string[]]$Amenities = @('WiFi','Charging Point','Water Bottle','Reading Light','Blanket','GPS Tracking','Emergency Exit'),
  [string]$DepartureLocal = '11:00am',        # local time (accepts 11:00 or 11:00am)
  [string]$Duration = '16:00',                # HH:mm (ignored if ArrivalLocal provided)
  [string]$ArrivalLocal = '',                # optional: arrival local time (overrides Duration)
  [switch]$ArrivalNextDay = $false,           # if true, arrival is next day
  [int[]]$Prices = @(1480, 1580, 1810, 2150, 2299),
  [int]$Days = 30,                            # how many days from today to create
  [datetime]$StartDate = (Get-Date),          # start from today
  [int]$DeparturesPerDay = 1,                 # number of departures per day
  [int]$MinGapHours = 16,                     # minimum gap between departures (hours)
  [ValidateSet('random','cycle')][string]$PriceMode = 'random'
)

$ErrorActionPreference = 'Stop'

function Invoke-AdminApi {
  param([string]$Path, [string]$Method = 'GET', [object]$Body = $null)
  $uri = ($BaseUrl.TrimEnd('/')) + $Path
  $headers = @{ 'X-Admin-Token' = $AdminToken; 'Content-Type' = 'application/json' }
  if ($Body -ne $null) { $json = ($Body | ConvertTo-Json -Depth 8 -Compress) } else { $json = $null }
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json
}

function Get-RouteId {
  $qs = "?origin=ilike.$Origin&destination=ilike.$Destination"
  $res = Invoke-AdminApi -Path "/api/admin-routes.php$qs" -Method 'GET'
  foreach($r in ($res.items | ForEach-Object { $_ })){
    if ($r.origin -eq $Origin -and $r.destination -eq $Destination) { return $r.id }
  }
  return $null
}

function Ensure-Route {
  $rid = Get-RouteId
  if ($null -ne $rid) { return $rid }
  # approximate duration in hours from HH:mm
  $parts = $Duration.Split(':'); $durHours = [double]$parts[0] + ([double]$parts[1] / 60.0)
  $payload = @{ origin=$Origin; destination=$Destination; distance_km=0; duration_hours=$durHours; stops=@() }
  $res = Invoke-AdminApi -Path '/api/admin-routes.php' -Method 'POST' -Body $payload
  if ($res.success -ne $true) { throw "Failed to create route: $($res | ConvertTo-Json -Compress)" }
  return $res.item.id
}

function Get-BusId {
  $res = Invoke-AdminApi -Path '/api/admin-buses.php' -Method 'GET'
  foreach($b in ($res.items | ForEach-Object { $_ })){
    if ($b.bus_type -eq $BusType -and [int]$b.total_seats -eq $Seats) { return $b.id }
  }
  return $null
}

function Ensure-Bus {
  $bid = Get-BusId
  if ($null -ne $bid) { return $bid }
  $payload = @{ bus_type=$BusType; total_seats=$Seats; amenities=$Amenities }
  $res = Invoke-AdminApi -Path '/api/admin-buses.php' -Method 'POST' -Body $payload
  if ($res.success -ne $true) { throw "Failed to create bus: $($res | ConvertTo-Json -Compress)" }
  return $res.item.id
}

function New-IsoFromLocalIST {
  param([datetime]$DateLocal, [int]$AddMinutes = 0)
  # Map IANA Asia/Kolkata to Windows time zone
  $tz = [System.TimeZoneInfo]::FindSystemTimeZoneById('India Standard Time')
  $local = Get-Date -Date $DateLocal -Format o | Out-Null
  $dtLocal = [datetime]::SpecifyKind($DateLocal, [System.DateTimeKind]::Unspecified)
  $dtWithTz = [System.TimeZoneInfo]::ConvertTimeToUtc($dtLocal, $tz)
  if ($AddMinutes -ne 0) { $dtWithTz = $dtWithTz.AddMinutes($AddMinutes) }
  return $dtWithTz.ToString('o')
}

function Parse-TimeHM {
  param([string]$hm)
  $s = ($hm | Out-String).Trim().ToLower()
  if (-not $s) { throw "Invalid time: '$hm'" }
  $h = 0; $m = 0; $has = $false
  if ($s -match '^(\d{1,2})(?:[:\.](\d{1,2}))?\s*(am|pm)?$') {
    $h = [int]$matches[1]
    $m = if ($matches[2]) { [int]$matches[2] } else { 0 }
    $ampm = $matches[3]
    if ($ampm) {
      if ($ampm -eq 'pm' -and $h -lt 12) { $h += 12 }
      if ($ampm -eq 'am' -and $h -eq 12) { $h = 0 }
    }
    $has = $true
  }
  if (-not $has) { throw "Invalid time: '$hm'" }
  return @{ H=$h; M=$m }
}

# Ensure entities
Write-Host 'Ensuring route and bus...'
$RouteId = Ensure-Route
$BusId = Ensure-Bus

# Build schedule instances per day with random times and min gap
$minGapMinutes = [Math]::Max(0, $MinGapHours * 60)

# Determine duration minutes either from Duration or ArrivalLocal
$durMinutes = 0
if ($null -ne $ArrivalLocal -and $ArrivalLocal.Trim().Length -gt 0) {
  # Arrival fixed => duration depends on departure each day; compute later per dep
} else {
  $durHM = Parse-TimeHM -hm $Duration
  $durMinutes = ($durHM.H * 60) + $durHM.M
}

function Get-RandomDeparturesForDay {
  param([int]$Count, [int]$MinGap, [int]$Seed)
  $rand = New-Object System.Random($Seed)
  $maxPerDay = if ($MinGap -le 0) { $Count } else { [Math]::Min($Count, [Math]::Max(1,[math]::Floor(1440 / $MinGap))) }
  $target = $maxPerDay
  $picked = New-Object System.Collections.Generic.List[int]
  $attempts = 0
  while($picked.Count -lt $target -and $attempts -lt 2000){
    $attempts++
    # choose between 06:00 and 22:00 to keep reasonable times
    $m = $rand.Next(6*60, 22*60)
    $ok = $true
    foreach($p in $picked){
      $diff = [Math]::Abs($m - $p)
      $wrap = 1440 - $diff
      if ([Math]::Min($diff, $wrap) -lt $MinGap) { $ok = $false; break }
    }
    if($ok){ $picked.Add($m) }
  }
  $picked.Sort()
  return ,$picked.ToArray()
}

$priceIndex = 0
for($d=0; $d -lt $Days; $d++){
  $baseDateLocal = (Get-Date $StartDate.Date).AddDays($d)
  $seed = (Get-Date $baseDateLocal).DayOfYear + $baseDateLocal.Year
  $minsList = Get-RandomDeparturesForDay -Count $DeparturesPerDay -MinGap $minGapMinutes -Seed $seed
  foreach($m in $minsList){
    $depLocal = $baseDateLocal.AddMinutes($m)
    # Determine duration for this departure
    $durMinThis = $durMinutes
    if ($null -ne $ArrivalLocal -and $ArrivalLocal.Trim().Length -gt 0) {
      $depHM = @{ H = [int]($m/60); M = ($m % 60) }
      $arrHM = Parse-TimeHM -hm $ArrivalLocal
      $depMin = ($depHM.H * 60) + $depHM.M
      $arrMin = ($arrHM.H * 60) + $arrHM.M + (if ($ArrivalNextDay) { 1440 } else { 0 })
      $durMinThis = $arrMin - $depMin; if ($durMinThis -lt 0) { $durMinThis += 1440 }
    }
    $arrLocal = $depLocal.AddMinutes($durMinThis)
    $depIso = New-IsoFromLocalIST -DateLocal $depLocal
    $arrIso = New-IsoFromLocalIST -DateLocal $arrLocal

    # Pick price
    $price = if ($PriceMode -eq 'random') { $Prices[(Get-Random -Minimum 0 -Maximum $Prices.Count)] } else { $Prices[$priceIndex % $Prices.Count] }
    $priceIndex++

    $payload = @{ route_id=$RouteId; bus_id=$BusId; departure_time=$depIso; arrival_time=$arrIso; base_price=[int]$price; is_active=$true }
    try {
      $res = Invoke-AdminApi -Path '/api/admin-schedules.php' -Method 'POST' -Body $payload
      if ($res.success -eq $true) { Write-Host ("OK: {0:yyyy-MM-dd HH:mm} -> price {1}" -f $depLocal, $price) }
      else { Write-Warning ("Failed: {0}" -f ($res | ConvertTo-Json -Compress)) }
    } catch { Write-Warning ("Error creating schedule on {0}: {1}" -f $depLocal.ToString('yyyy-MM-dd'), $_.Exception.Message) }
  }
}

Write-Host 'Done.'
