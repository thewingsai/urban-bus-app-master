<?php
// Admin Hero Banners CRUD with scheduling
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

$table = '/site_hero_banners';

if ($method === 'GET'){
  // Optional: active=true to filter active+in-window
  $active = ($_GET['active'] ?? '') === 'true';
  $q = [ 'select' => 'id,title,subtitle,cta_text,cta_href,background_url,is_active,start_at,end_at,updated_at' ];
  if ($active){
    // Note: Supabase filter syntax; basic time window check left to consumer if needed
    $q['is_active'] = 'eq.true';
  }
  $resp = supabase_request('GET', $table . '?' . http_build_query($q), null, []);
  $rows=[]; if($resp['status']>=200&&$resp['status']<300){ $rows = json_decode($resp['body'], true) ?: []; }
  json_out(['success'=>true,'items'=>$rows]); exit;
}

if ($method === 'POST'){
  $in = json_input();
  $rec = [
    'title' => $in['title'] ?? '',
    'subtitle' => $in['subtitle'] ?? null,
    'cta_text' => $in['cta_text'] ?? null,
    'cta_href' => $in['cta_href'] ?? null,
    'background_url' => $in['background_url'] ?? null,
    'is_active' => !!($in['is_active'] ?? false),
    'start_at' => $in['start_at'] ?? null,
    'end_at' => $in['end_at'] ?? null,
  ];
  if ($rec['title']===''){ json_out(['success'=>false,'error'=>'title required'],400); exit; }
  $resp = supabase_request('POST', $table, [ $rec ], []);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to create','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; json_out(['success'=>true,'item'=>$rows[0]??$rec]); exit;
}

if ($method === 'PATCH'){
  $in = json_input(); $id = $in['id'] ?? ($_GET['id'] ?? null); if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  unset($in['id']);
  $resp = supabase_request('PATCH', $table.'?id=eq.'.urlencode($id), $in, []);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to update','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; json_out(['success'=>true,'item'=>$rows[0]??$in]); exit;
}

if ($method === 'DELETE'){
  $id = $_GET['id'] ?? null; if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  $resp = supabase_request('DELETE', $table.'?id=eq.'.urlencode($id), null, []);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to delete','details'=>$resp['body']],502); exit; }
  json_out(['success'=>true]); exit;
}

json_out(['success'=>false,'error'=>'Method not allowed'],405);
