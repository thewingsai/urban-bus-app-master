<?php
// Admin login endpoint: checks credentials and sets HttpOnly session cookie
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST') { json_out(['success'=>false,'error'=>'Method not allowed'],405); exit; }

$in = json_input();
$user = (string)($in['username'] ?? '');
$pass = (string)($in['password'] ?? '');

$expectedUser = admin_env('ADMIN_USERNAME') ?: 'admin';
$expectedPass = admin_env('ADMIN_PASSWORD') ?: '';
if ($expectedPass === '') {
  // allow bootstrap via ADMIN_TOKEN if password not set: password == ADMIN_TOKEN
  $expectedPass = admin_env('ADMIN_TOKEN');
}

if ($user === '' || $pass === '' || !hash_equals((string)$expectedUser, $user) || !hash_equals((string)$expectedPass, $pass)) {
  json_out(['success'=>false,'error'=>'Invalid credentials'],401); exit;
}

$secret = admin_env('ADMIN_TOKEN');
if ($secret === '') { $secret = admin_env('ADMIN_PASSWORD'); }
if ($secret === '') { json_out(['success'=>false,'error'=>'Server missing ADMIN_TOKEN/ADMIN_PASSWORD'],500); exit; }

$token = create_admin_session_token($secret, 86400);
$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') == 443);
setcookie('admin_session', $token, [ 'expires' => time()+86400, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Lax' ]);
json_out(['success'=>true]);
