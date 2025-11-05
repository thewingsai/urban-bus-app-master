<?php
// Admin Routes CRUD
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

if ($method === 'GET') {
  // List routes (optionally filter by origin/destination)
  $q = [];
  if (($o=$_GET['origin']??'')!=='') $q['origin'] = 'ilike.' . $o;
  if (($d=$_GET['destination']??'')!=='') $q['destination'] = 'ilike.' . $d;
  if (($lim=$_GET['limit']??'')!=='') $q['limit'] = (int)$lim;
  if (($off=$_GET['offset']??'')!=='') $q['offset'] = (int)$off;
  $q['select'] = 'id,origin,destination,distance_km,duration_hours,stops';
  $path = '/routes?' . http_build_query($q);
  $resp = supabase_request('GET', $path, null, [ 'Accept-Profile: public', 'Content-Profile: public' ]);
  $rows = []; if ($resp['status']>=200 && $resp['status']<300) { $rows = json_decode($resp['body'], true) ?: []; }
  json_out(['success'=>true, 'items'=>$rows]); exit;
}

if ($method === 'POST') {
  $in = json_input();
  $rec = [
    'origin' => $in['origin'] ?? '',
    'destination' => $in['destination'] ?? '',
    'distance_km' => (float)($in['distance_km'] ?? 0),
    'duration_hours' => (float)($in['duration_hours'] ?? 0),
    'stops' => $in['stops'] ?? []
  ];
  if ($rec['origin']==='' || $rec['destination']==='') { json_out(['success'=>false,'error'=>'origin and destination required'],400); exit; }
  $resp = supabase_request('POST','/routes', [ $rec ], [ 'Accept-Profile: public', 'Content-Profile: public' ]);
  if (!($resp['status']>=200 && $resp['status']<300)) { json_out(['success'=>false,'error'=>'Failed to create','details'=>$resp['body']],502); exit; }
  $rows = json_decode($resp['body'], true) ?: [];
  json_out(['success'=>true,'item'=>$rows[0]??$rec]); exit;
}

if ($method === 'PATCH') {
  $in = json_input(); $id = $in['id'] ?? ($_GET['id'] ?? null); if (!$id) { json_out(['success'=>false,'error'=>'id required'],400); exit; }
  unset($in['id']);
  $resp = supabase_request('PATCH', '/routes?id=eq.' . urlencode($id), $in, [ 'Accept-Profile: public', 'Content-Profile: public' ]);
  if (!($resp['status']>=200 && $resp['status']<300)) { json_out(['success'=>false,'error'=>'Failed to update','details'=>$resp['body']],502); exit; }
  $rows = json_decode($resp['body'], true) ?: [];
  json_out(['success'=>true,'item'=>$rows[0]??$in]); exit;
}

if ($method === 'DELETE') {
  $id = $_GET['id'] ?? null; if (!$id) { json_out(['success'=>false,'error'=>'id required'],400); exit; }
  $resp = supabase_request('DELETE','/routes?id=eq.' . urlencode($id), null, [ 'Accept-Profile: public', 'Content-Profile: public' ]);
  if (!($resp['status']>=200 && $resp['status']<300)) { json_out(['success'=>false,'error'=>'Failed to delete','details'=>$resp['body']],502); exit; }
  json_out(['success'=>true]); exit;
}

json_out(['success'=>false,'error'=>'Method not allowed'],405);
