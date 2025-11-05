<?php
// Admin Site Settings (singleton row id='global')
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

$table = '/site_settings';
$id = 'global';

if ($method === 'GET'){
  $q = [ 'id' => 'eq.' . $id, 'select' => 'id,seo_title,seo_description,og_image,twitter_image,phone,email,support_whatsapp,footer_html,updated_at' ];
  $resp = supabase_request('GET', $table . '?' . http_build_query($q), null, []);
  $rows=[]; if($resp['status']>=200&&$resp['status']<300){ $rows = json_decode($resp['body'], true) ?: []; }
  json_out(['success'=>true,'item'=>$rows[0]??null]); exit;
}

if ($method === 'POST' || $method === 'PATCH'){
  $in = json_input();
  $rec = [ 'id' => $id ];
  foreach(['seo_title','seo_description','og_image','twitter_image','phone','email','support_whatsapp','footer_html'] as $k){ if(array_key_exists($k,$in)) $rec[$k]=$in[$k]; }
  $resp = supabase_request('POST', $table, [ $rec ], [ 'Prefer: resolution=merge-duplicates' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to upsert settings','details'=>$resp['body']],502); exit; }
  $rows = json_decode($resp['body'], true) ?: [];
  json_out(['success'=>true,'item'=>$rows[0]??$rec]); exit;
}

json_out(['success'=>false,'error'=>'Method not allowed'],405);
