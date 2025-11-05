<?php
// Public: get published page by slug
require_once __DIR__ . '/supabase_client.php';

$slug = $_GET['slug'] ?? '';
if ($slug === '') { json_out(['success'=>false,'error'=>'slug required'],400); exit; }
// Fetch published pages (policy already restricts to is_published = true)
$q = http_build_query([
  'slug' => 'eq.' . $slug,
  'select' => 'id,slug,title,meta_title,meta_description,content_html,is_published,published_at,updated_at',
  'limit' => 1
]);
$resp = supabase_request('GET', '/site_pages?' . $q);
$rows = [];
if ($resp['status']>=200&&$resp['status']<300) { $rows = json_decode($resp['body'], true) ?: []; }
$item = $rows[0] ?? null;
// Optionally enforce publish time <= now
if ($item && !empty($item['published_at'])){
  $now = time(); $ts = strtotime($item['published_at']);
  if ($ts !== false && $ts > $now) { $item = null; }
}
json_out(['success'=>true,'item'=>$item]);
