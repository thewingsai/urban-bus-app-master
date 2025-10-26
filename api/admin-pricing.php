<?php
// Admin pricing management endpoint
// Requires header: X-Admin-Token: {ADMIN_TOKEN}
// 
// GET  /api/admin-pricing.php?origin=Kalpa&destination=Delhi
// POST /api/admin-pricing.php  { origin, destination, allowed_fares: number[], active_fare?, is_enabled? }
// PATCH /api/admin-pricing.php { origin, destination, active_fare?, is_enabled?, allowed_fares? }

require_once __DIR__ . '/supabase_client.php';

function require_admin() {
  $provided = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
  $expected = getenv('ADMIN_TOKEN') ?: '';
  if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
    json_out([ 'success' => false, 'error' => 'Unauthorized' ], 401);
    exit;
  }
}

function get_route_id($origin, $destination) {
  $q = http_build_query([
    'origin' => 'eq.' . $origin,
    'destination' => 'eq.' . $destination,
    'select' => 'id,origin,destination',
    'limit' => 1
  ]);
  $resp = supabase_request('GET', '/routes?' . $q, null, [ 'Accept-Profile: public', 'Content-Profile: public' ]);
  if ($resp['status'] >= 200 && $resp['status'] < 300) {
    $rows = json_decode($resp['body'], true);
    if (is_array($rows) && count($rows) > 0) { return $rows[0]['id']; }
  }
  return null;
}

require_admin();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $origin = $_GET['origin'] ?? null;
  $destination = $_GET['destination'] ?? null;

  if ($origin === null || $destination === null || $origin === '' || $destination === '') {
    // List all admin pricing entries with route info
    $q = http_build_query([
      'select' => 'route_id,allowed_fares,active_fare,is_enabled,updated_at,updated_by,routes:routes(id,origin,destination)'
    ]);
    $resp = supabase_request('GET', '/route_admin_pricing?' . $q, null, [ 'Accept-Profile: public', 'Content-Profile: public' ]);
    $rows = [];
    if ($resp['status'] >= 200 && $resp['status'] < 300) { $rows = json_decode($resp['body'], true); }
    json_out([ 'success' => true, 'items' => $rows ]);
    exit;
  }

  $rid = get_route_id($origin, $destination);
  if (!$rid) {
    json_out([ 'success' => true, 'route' => null, 'pricing' => null ]);
    exit;
  }

  $q = http_build_query([
    'route_id' => 'eq.' . $rid,
    'select' => 'route_id,allowed_fares,active_fare,is_enabled,updated_at,updated_by'
  ]);
  $resp = supabase_request('GET', '/route_admin_pricing?' . $q, null, [ 'Accept-Profile: public', 'Content-Profile: public' ]);
  $rows = [];
  if ($resp['status'] >= 200 && $resp['status'] < 300) { $rows = json_decode($resp['body'], true); }
  json_out([ 'success' => true, 'route_id' => $rid, 'pricing' => $rows[0] ?? null ]);
  exit;
}

if ($method === 'POST' || $method === 'PATCH') {
  $in = json_input();
  $origin = $in['origin'] ?? '';
  $destination = $in['destination'] ?? '';
  if ($origin === '' || $destination === '') {
    json_out([ 'success' => false, 'error' => 'origin and destination are required' ], 400);
    exit;
  }
  $rid = get_route_id($origin, $destination);
  if (!$rid) {
    // Create a minimal route if missing
    $route = [
      'origin' => $origin,
      'destination' => $destination,
      'distance_km' => 0,
      'duration_hours' => 0,
      'stops' => []
    ];
    $respRoute = supabase_request('POST', '/routes', [ $route ], [ 'Accept-Profile: public', 'Content-Profile: public' ]);
    if (!($respRoute['status'] >= 200 && $respRoute['status'] < 300)) {
      json_out([ 'success' => false, 'error' => 'Failed to create route', 'details' => $respRoute['body'] ], 502);
      exit;
    }
    $row = json_decode($respRoute['body'], true);
    $rid = $row[0]['id'] ?? null;
  }

  $record = [ 'route_id' => $rid ];
  if (isset($in['allowed_fares']) && is_array($in['allowed_fares'])) { $record['allowed_fares'] = array_values($in['allowed_fares']); }
  if (isset($in['active_fare'])) { $record['active_fare'] = (float)$in['active_fare']; }
  if (isset($in['is_enabled'])) { $record['is_enabled'] = (bool)$in['is_enabled']; }
  $record['updated_by'] = 'admin-api';

  // Upsert on route_id
  $resp = supabase_request('POST', '/route_admin_pricing', [ $record ], [ 'Prefer: resolution=merge-duplicates' ]);
  if (!($resp['status'] >= 200 && $resp['status'] < 300)) {
    json_out([ 'success' => false, 'error' => 'Failed to upsert pricing', 'details' => $resp['body'] ], 502);
    exit;
  }
  $rows = json_decode($resp['body'], true);
  json_out([ 'success' => true, 'route_id' => $rid, 'pricing' => $rows[0] ?? null ]);
  exit;
}

json_out([ 'success' => false, 'error' => 'Method not allowed' ], 405);