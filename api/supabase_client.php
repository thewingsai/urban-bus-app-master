<?php
// Lightweight Supabase REST client for PHP (server-side only)
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE

function supabase_env(string $key): string {
  $val = getenv($key);
  if ($val === false || $val === '') {
    http_response_code(500);
    echo json_encode([ 'success' => false, 'error' => "Missing env var: $key" ]);
    exit;
  }
  return $val;
}

function supabase_request(string $method, string $path, $body = null, array $extraHeaders = []) {
  $baseUrl = rtrim(supabase_env('SUPABASE_URL'), '/');
  $serviceKey = supabase_env('SUPABASE_SERVICE_ROLE');

  $url = $baseUrl . '/rest/v1' . $path;
  $ch = curl_init($url);

  $headers = [
    'Content-Type: application/json',
    'apikey: ' . $serviceKey,
    'Authorization: Bearer ' . $serviceKey,
    'Prefer: return=representation',
  ];
  foreach ($extraHeaders as $h) { $headers[] = $h; }

  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
  curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

  if ($body !== null) {
    $payload = is_string($body) ? $body : json_encode($body);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
  }

  $response = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err = curl_error($ch);
  curl_close($ch);

  return [ 'status' => $status, 'error' => $err, 'body' => $response ];
}

function supabase_insert(string $table, array $record) {
  return supabase_request('POST', '/' . urlencode($table), [ $record ]);
}

function json_input(): array {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  if (!is_array($data)) { $data = []; }
  return $data;
}

function json_out($payload, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json');
  echo json_encode($payload);
}
