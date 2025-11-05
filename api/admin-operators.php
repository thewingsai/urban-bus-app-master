<?php
// Admin Operators CRUD
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

$table = '/bus_operators';

if ($method === 'GET'){
  $q = [ 'select' => 'id,name,email,phone,rating,total_buses,logo_url,created_at' ];
  if (($name = $_GET['name'] ?? '') !== '') $q['name'] = 'ilike.' . $name;
  $resp = supabase_request('GET', $table . '?' . http_build_query($q), null, ['Accept-Profile: public','Content-Profile: public']);
  $rows=[]; if($resp['status']>=200&&$resp['status']<300){ $rows = json_decode($resp['body'], true) ?: []; }
  json_out(['success'=>true,'items'=>$rows]); exit;
}

if ($method === 'POST'){
  $in = json_input();
  $rec = [
    'name' => $in['name'] ?? '',
    'email' => $in['email'] ?? '',
    'phone' => $in['phone'] ?? '',
    'rating' => isset($in['rating']) ? (float)$in['rating'] : 0,
    'total_buses' => isset($in['total_buses']) ? (int)$in['total_buses'] : 0,
    'logo_url' => $in['logo_url'] ?? null,
  ];
  if ($rec['name'] === '' || $rec['email'] === '' || $rec['phone'] === '') { json_out(['success'=>false,'error'=>'name, email, phone required'],400); exit; }
  $resp = supabase_request('POST', $table, [ $rec ], [ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to create','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; json_out(['success'=>true,'item'=>$rows[0]??$rec]); exit;
}

if ($method === 'PATCH'){
  $in = json_input(); $id = $in['id'] ?? ($_GET['id'] ?? null); if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  unset($in['id']);
  $resp = supabase_request('PATCH', $table.'?id=eq.'.urlencode($id), $in, [ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to update','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; json_out(['success'=>true,'item'=>$rows[0]??$in]); exit;
}

if ($method === 'DELETE'){
  $id = $_GET['id'] ?? null; if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  $resp = supabase_request('DELETE', $table.'?id=eq.'.urlencode($id), null, [ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to delete','details'=>$resp['body']],502); exit; }
  json_out(['success'=>true]); exit;
}

json_out(['success'=>false,'error'=>'Method not allowed'],405);
