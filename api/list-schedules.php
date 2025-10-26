<?php
// GET /api/list-schedules.php?origin=Kalpa&destination=Delhi&hours=5
// Returns schedules with effective current_price (admin override if enabled) filtered by origin/destination
// hours: 5 (default) or 2 to control bucket size

require_once __DIR__ . '/supabase_client.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_out([ 'success' => false, 'error' => 'Method not allowed' ], 405);
  exit;
}

$origin = $_GET['origin'] ?? '';
$destination = $_GET['destination'] ?? '';
$hours = (int)($_GET['hours'] ?? 2);
$hours = ($hours === 2 || $hours === 5) ? $hours : 2; // default to 2h, allow 2 or 5

if ($origin === '' || $destination === '') {
  json_out([ 'success' => false, 'error' => 'origin and destination are required' ], 400);
  exit;
}

$view = $hours === 2 ? 'search_schedules_effective_priced_2h' : 'search_schedules_effective_priced';

// Build PostgREST query parameters
$query = http_build_query([
  'origin' => 'eq.' . $origin,
  'destination' => 'eq.' . $destination,
  'is_active' => 'eq.true',
  'order' => 'departure_time.asc'
]);

$path = '/' . $view . '?' . $query;
$resp = supabase_request('GET', $path, null, [ 'Accept-Profile: public', 'Content-Profile: public' ]);

if ($resp['status'] < 200 || $resp['status'] >= 300) {
  json_out([
    'success' => false,
    'error' => 'Failed to fetch schedules',
    'status' => $resp['status'],
    'details' => $resp['body']
  ], 502);
  exit;
}

$data = json_decode($resp['body'], true);
json_out([
  'success' => true,
  'hours' => $hours,
  'origin' => $origin,
  'destination' => $destination,
  'schedules' => $data,
]);
