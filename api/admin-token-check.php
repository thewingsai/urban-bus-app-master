<?php
require_once __DIR__ . '/supabase_client.php';
header('Content-Type: application/json');

function get_header_ci(string $name): string {
  $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  if (!empty($_SERVER[$key])) return $_SERVER[$key];
  if (function_exists('getallheaders')) {
    foreach (getallheaders() as $k => $v) { if (strcasecmp($k, $name) === 0) return $v; }
  }
  if (function_exists('apache_request_headers')) {
    foreach (apache_request_headers() as $k => $v) { if (strcasecmp($k, $name) === 0) return $v; }
  }
  return '';
}

$root = realpath(__DIR__ . '/..');
$envFile = $root . DIRECTORY_SEPARATOR . '.env';
$exists = is_file($envFile);
$readable = is_readable($envFile);

$expected = getenv('ADMIN_TOKEN') ?: '';
if ($expected === '' && $readable) {
  $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
  foreach ($lines as $line) {
    $line = preg_replace('/^\xEF\xBB\xBF/', '', (string)$line);
    if ($line === '' || $line[0] === '#') continue;
    $pos = strpos($line, '='); if ($pos === false) continue;
    $k = trim(preg_replace('/^\xEF\xBB\xBF/', '', substr($line, 0, $pos))); $v = trim(substr($line, $pos + 1));
    if ((str_starts_with($v, '"') && str_ends_with($v, '"')) || (str_starts_with($v, "'") && str_ends_with($v, "'"))) { $v = substr($v, 1, -1); }
    if (strcasecmp($k, 'ADMIN_TOKEN') === 0) { $expected = $v; break; }
  }
}

$provided = get_header_ci('X-Admin-Token');
if ($provided === '' && isset($_COOKIE['x_admin_token'])) { $provided = $_COOKIE['x_admin_token']; }
if ($provided === '' && isset($_GET['admin_token'])) { $provided = $_GET['admin_token']; }

$resp = [
  'env_exists' => $exists,
  'env_readable' => $readable,
  'expected_present' => ($expected !== ''),
  'provided_present' => ($provided !== ''),
  'provided_len' => strlen($provided),
];

echo json_encode($resp);
