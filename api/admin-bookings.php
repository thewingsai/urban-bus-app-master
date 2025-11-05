<?php
// Admin Bookings list/update
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

$table = '/bookings';

if ($method === 'GET'){
  $q = [ 'select' => 'id,booking_reference,user_id,schedule_id,travel_date,seat_numbers,total_amount,passenger_name,passenger_email,passenger_phone,booking_status,payment_status,created_at,updated_at' ];
  if (($ref = $_GET['reference'] ?? '') !== '') $q['booking_reference'] = 'eq.' . $ref;
  if (($email = $_GET['email'] ?? '') !== '') $q['passenger_email'] = 'ilike.' . $email;
  if (($status = $_GET['status'] ?? '') !== '') $q['booking_status'] = 'eq.' . $status;
  $resp = supabase_request('GET', $table . '?' . http_build_query($q), null, ['Accept-Profile: public','Content-Profile: public']);
  $rows=[]; if($resp['status']>=200&&$resp['status']<300){ $rows = json_decode($resp['body'], true) ?: []; }
  json_out(['success'=>true,'items'=>$rows]); exit;
}

if ($method === 'PATCH'){
  $in = json_input(); $id = $in['id'] ?? ($_GET['id'] ?? null); if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  unset($in['id']);
  $allowed = ['booking_status','payment_status'];
  $update = [];
  foreach($allowed as $k){ if (array_key_exists($k,$in)) $update[$k]=$in[$k]; }
  if (!$update){ json_out(['success'=>false,'error'=>'no updatable fields provided'],400); exit; }
  $resp = supabase_request('PATCH', $table.'?id=eq.'.urlencode($id), $update, [ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to update','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; json_out(['success'=>true,'item'=>$rows[0]??$update]); exit;
}

json_out(['success'=>false,'error'=>'Method not allowed'],405);
