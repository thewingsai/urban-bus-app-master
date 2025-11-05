<?php
// Lightweight Supabase REST client for PHP (server-side only)
// Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE

// Basic .env loader (KEY=VALUE per line) from project root if present
(function(){
  static $loaded = false; if ($loaded) return; $loaded = true;
  $root = realpath(__DIR__ . '/..');
  $envFile = $root . DIRECTORY_SEPARATOR . '.env';
  if (is_readable($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
      // Strip UTF-8 BOM if present and trim line
      $line = preg_replace('/^\xEF\xBB\xBF/', '', (string)$line);
      if ($line === '' || $line[0] === '#') continue;
      $pos = strpos($line, '=');
      if ($pos === false) continue;
      $k = trim(preg_replace('/^\xEF\xBB\xBF/', '', substr($line, 0, $pos)));
      $v = trim(substr($line, $pos + 1));
      // Strip optional surrounding quotes
      if ((str_starts_with($v, '"') && str_ends_with($v, '"')) || (str_starts_with($v, "'") && str_ends_with($v, "'"))) {
        $v = substr($v, 1, -1);
      }
      if ($k !== '') { putenv($k . '=' . $v); $_ENV[$k] = $v; $_SERVER[$k] = $v; }
    }
  }
})();

function supabase_env(string $key): string {
  $val = getenv($key);
  if ($val === false || $val === '') { $val = $_ENV[$key] ?? $_SERVER[$key] ?? ''; }
  if ($val === '') {
    // Fallback: read from .env directly (handles hosts that don't propagate putenv)
    $root = realpath(__DIR__ . '/..');
    $envFile = $root . DIRECTORY_SEPARATOR . '.env';
    if (is_readable($envFile)) {
      $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
      foreach ($lines as $line) {
        $line = preg_replace('/^\xEF\xBB\xBF/', '', (string)$line);
        if ($line === '' || $line[0] === '#') continue;
        $pos = strpos($line, '='); if ($pos === false) continue;
        $k = trim(preg_replace('/^\xEF\xBB\xBF/', '', substr($line, 0, $pos)));
        $v = trim(substr($line, $pos + 1));
        if ((str_starts_with($v, '"') && str_ends_with($v, '"')) || (str_starts_with($v, "'") && str_ends_with($v, "'"))) { $v = substr($v, 1, -1); }
        if ($k !== '') { if (strcasecmp($k, $key) === 0) { $val = $v; break; } }
      }
    }
  }
  if ($val === '' || $val === false) {
    http_response_code(500);
    header('Content-Type: application/json');
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
