<?php
// Admin Payments list
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

$table = '/payments';

if ($method === 'GET'){
  $q = [ 'select' => 'id,booking_id,amount,payment_method,transaction_id,payment_status,created_at' ];
  if (($status = $_GET['status'] ?? '') !== '') $q['payment_status'] = 'eq.' . $status;
  if (($tx = $_GET['transaction_id'] ?? '') !== '') $q['transaction_id'] = 'eq.' . $tx;
  $resp = supabase_request('GET', $table . '?' . http_build_query($q), null, ['Accept-Profile: public','Content-Profile: public']);
  $rows=[]; if($resp['status']>=200&&$resp['status']<300){ $rows = json_decode($resp['body'], true) ?: []; }
  json_out(['success'=>true,'items'=>$rows]); exit;
}

json_out(['success'=>false,'error'=>'Method not allowed'],405);
