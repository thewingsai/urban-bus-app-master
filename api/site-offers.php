<?php
// Public: list active offers for display
require_once __DIR__ . '/supabase_client.php';

$q = http_build_query([
  'is_active' => 'eq.true',
  'select' => 'id,code,discount_type,discount_value,valid_from,valid_until,title,description'
]);
$resp = supabase_request('GET', '/offers?' . $q);
$rows = [];
if ($resp['status']>=200&&$resp['status']<300) { $rows = json_decode($resp['body'], true) ?: []; }

$now = time();
$items = array_values(array_filter($rows, function($r) use ($now){
  $startOk = empty($r['valid_from']) || (strtotime($r['valid_from']) ?: 0) <= $now;
  $endOk = empty($r['valid_until']) || (strtotime($r['valid_until']) ?: PHP_INT_MAX) >= $now;
  return $startOk && $endOk;
}));

json_out(['success'=>true,'items'=>$items]);
