<?php
// Admin KPI endpoint (approximate counts)
require_once __DIR__ . '/admin_auth.php';

require_admin();

function count_rows($path){
  // Fetch up to 10000 rows and count length (sufficient for admin UI KPIs)
  $resp = supabase_request('GET', $path . (str_contains($path,'?')?'&':'?') . 'select=id&limit=10000');
  if ($resp['status']>=200 && $resp['status']<300) { $rows = json_decode($resp['body'], true) ?: []; return count($rows); }
  return 0;
}

$revenue = 0;
try {
  $resp = supabase_request('GET', '/payments?select=amount&limit=10000');
  if ($resp['status']>=200 && $resp['status']<300) {
    $rows = json_decode($resp['body'], true) ?: [];
    foreach ($rows as $r) { $revenue += (float)($r['amount'] ?? 0); }
  }
} catch(Exception $e){}

$bookings = count_rows('/bookings');
$routes   = count_rows('/routes');
$buses    = count_rows('/buses');
$schedules= count_rows('/bus_schedules');
$offers   = count_rows('/offers');

json_out([ 'success'=>true, 'kpi' => [
  'revenue' => $revenue,
  'bookings' => $bookings,
  'routes' => $routes,
  'buses' => $buses,
  'schedules' => $schedules,
  'offers' => $offers
]]);
