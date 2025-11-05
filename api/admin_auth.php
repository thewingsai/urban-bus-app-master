<?php
// Shared admin authentication helpers
require_once __DIR__ . '/supabase_client.php';

function admin_env(string $key): string {
  // Try getenv, then $_ENV/$_SERVER, then .env direct
  $val = getenv($key); if ($val === false || $val === '') { $val = $_ENV[$key] ?? $_SERVER[$key] ?? ''; }
  if ($val === '') {
    $root = realpath(__DIR__ . '/..'); $envFile = $root . DIRECTORY_SEPARATOR . '.env';
    if (is_readable($envFile)) {
      $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
      foreach ($lines as $line) {
        $line = preg_replace('/^\xEF\xBB\xBF/', '', (string)$line);
        if ($line === '' || $line[0] === '#') continue;
        $pos = strpos($line, '='); if ($pos === false) continue;
        $k = trim(preg_replace('/^\xEF\xBB\xBF/', '', substr($line, 0, $pos)));
        $v = trim(substr($line, $pos + 1));
        if ((str_starts_with($v, '"') && str_ends_with($v, '"')) || (str_starts_with($v, "'") && str_ends_with($v, "'"))) { $v = substr($v, 1, -1); }
        if (strcasecmp($k, $key) === 0) { $val = $v; break; }
      }
    }
  }
  return $val === false ? '' : (string)$val;
}

function base64url_encode(string $data): string { return rtrim(strtr(base64_encode($data), '+/', '-_'), '='); }
function base64url_decode(string $data): string { return base64_decode(strtr($data, '-_', '+/')); }

function create_admin_session_token(string $secret, int $ttl = 86400): string {
  $payload = [ 'sub' => 'admin', 'exp' => time() + $ttl, 'iat' => time() ];
  $b64 = base64url_encode(json_encode($payload));
  $sig = hash_hmac('sha256', $b64, $secret, true);
  return $b64 . '.' . base64url_encode($sig);
}

function verify_admin_session_token(string $token, string $secret): bool {
  $parts = explode('.', $token); if (count($parts) !== 2) return false;
  [$b64, $sigB64] = $parts; $expected = base64url_encode(hash_hmac('sha256', $b64, $secret, true));
  if (!hash_equals($expected, $sigB64)) return false;
  $json = base64url_decode($b64); $payload = json_decode($json, true);
  if (!is_array($payload)) return false; if (!isset($payload['exp']) || $payload['exp'] < time()) return false;
  return true;
}

function get_header_ci(string $name): string {
  $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
  if (!empty($_SERVER[$key])) return $_SERVER[$key];
  if (function_exists('getallheaders')) { foreach (getallheaders() as $k=>$v) { if (strcasecmp($k, $name)===0) return $v; } }
  if (function_exists('apache_request_headers')) { foreach (apache_request_headers() as $k=>$v) { if (strcasecmp($k, $name)===0) return $v; } }
  foreach ($_SERVER as $k=>$v) { if (strpos($k, 'HTTP_')===0) { $pretty = str_replace('_','-', substr($k,5)); if (strcasecmp($pretty,$name)===0) return $v; } }
  return '';
}

function require_admin(): void {
  $secret = admin_env('ADMIN_TOKEN');
  if ($secret === '') { $secret = admin_env('ADMIN_PASSWORD'); }
  // 1) Cookie-based session
  $cookie = $_COOKIE['admin_session'] ?? '';
  if ($secret !== '' && $cookie !== '' && verify_admin_session_token($cookie, $secret)) return;
  // 2) Header/cookie/query token fallback
  $provided = get_header_ci('X-Admin-Token');
  if ($provided === '' && isset($_COOKIE['x_admin_token'])) $provided = $_COOKIE['x_admin_token'];
  if ($provided === '' && isset($_GET['admin_token'])) $provided = $_GET['admin_token'];
  if ($secret !== '' && $provided !== '' && hash_equals($secret, $provided)) return;
  // 3) Bootstrap mode: if no server secret is configured, accept provided token or an existing admin_session cookie.
  if ($secret === '' && ($provided !== '' || $cookie !== '')) return;
  json_out([ 'success' => false, 'error' => 'Unauthorized' ], 401); exit;
}
