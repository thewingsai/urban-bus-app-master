<?php
// Public: list active hero banners (within schedule)
require_once __DIR__ . '/supabase_client.php';

$q = http_build_query([
  'is_active' => 'eq.true',
  'select' => 'id,title,subtitle,cta_text,cta_href,background_url,is_active,start_at,end_at,updated_at'
]);
$resp = supabase_request('GET', '/site_hero_banners?' . $q);
$rows = [];
if ($resp['status']>=200&&$resp['status']<300) { $rows = json_decode($resp['body'], true) ?: []; }

$now = time();
$items = array_values(array_filter($rows, function($r) use ($now){
  $startOk = empty($r['start_at']) || (strtotime($r['start_at']) ?: 0) <= $now;
  $endOk = empty($r['end_at']) || (strtotime($r['end_at']) ?: PHP_INT_MAX) >= $now;
  return $startOk && $endOk;
}));

json_out(['success'=>true,'items'=>$items]);
