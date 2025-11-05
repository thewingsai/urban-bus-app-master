<?php
// Admin Pages CRUD with scheduling
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

$table = '/site_pages';

if ($method === 'GET'){
  $q = [ 'select' => 'id,slug,title,meta_title,meta_description,content_html,is_published,published_at,updated_at' ];
  if (($slug = $_GET['slug'] ?? '') !== '') $q['slug'] = 'eq.' . $slug;
  $resp = supabase_request('GET', $table . '?' . http_build_query($q), null, []);
  $rows=[]; if($resp['status']>=200&&$resp['status']<300){ $rows = json_decode($resp['body'], true) ?: []; }
  json_out(['success'=>true,'items'=>$rows]); exit;
}

if ($method === 'POST'){
  $in = json_input();
  $rec = [
    'slug' => $in['slug'] ?? '',
    'title' => $in['title'] ?? '',
    'meta_title' => $in['meta_title'] ?? null,
    'meta_description' => $in['meta_description'] ?? null,
    'content_html' => $in['content_html'] ?? null,
    'is_published' => !!($in['is_published'] ?? false),
    'published_at' => $in['published_at'] ?? null,
  ];
  if ($rec['slug']==='' || $rec['title']===''){ json_out(['success'=>false,'error'=>'slug and title required'],400); exit; }
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
