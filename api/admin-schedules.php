<?php
// Admin Schedules CRUD
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

if($method==='GET'){
  $q=['select'=>'id,route_id,bus_id,departure_time,arrival_time,base_price,is_active'];
  if(($rid=$_GET['route_id']??'')!=='') $q['route_id']='eq.'.$rid;
  if(($bid=$_GET['bus_id']??'')!=='') $q['bus_id']='eq.'.$bid;
  if(($lim=$_GET['limit']??'')!=='') $q['limit']=(int)$lim;
  if(($off=$_GET['offset']??'')!=='') $q['offset']=(int)$off;
  $path='/bus_schedules?'.http_build_query($q);
  $resp=supabase_request('GET',$path,null,['Accept-Profile: public','Content-Profile: public']);
  $rows=[]; if($resp['status']>=200&&$resp['status']<300){$rows=json_decode($resp['body'],true)?:[];}
  json_out(['success'=>true,'items'=>$rows]); exit;
}
if($method==='POST'){
  $in=json_input();
  $rec=[ 'route_id'=>$in['route_id']??null,'bus_id'=>$in['bus_id']??null,'departure_time'=>$in['departure_time']??null,'arrival_time'=>$in['arrival_time']??null,'base_price'=>(float)($in['base_price']??0),'is_active'=>!!($in['is_active']??true) ];
  if(!$rec['route_id']||!$rec['bus_id']||!$rec['departure_time']||!$rec['arrival_time']){ json_out(['success'=>false,'error'=>'route_id, bus_id, departure_time, arrival_time required'],400); exit; }
  $resp=supabase_request('POST','/bus_schedules',[$rec],[ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to create','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; json_out(['success'=>true,'item'=>$rows[0]??$rec]); exit;
}
if($method==='PATCH'){
  $in=json_input(); $id=$in['id']??($_GET['id']??null); if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  unset($in['id']);
  $resp=supabase_request('PATCH','/bus_schedules?id=eq.'.urlencode($id),$in,[ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to update','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; json_out(['success'=>true,'item'=>$rows[0]??$in]); exit;
}
if($method==='DELETE'){
  $id=$_GET['id']??null; if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  $resp=supabase_request('DELETE','/bus_schedules?id=eq.'.urlencode($id),null,[ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to delete','details'=>$resp['body']],502); exit; }
  json_out(['success'=>true]); exit;
}

json_out(['success'=>false,'error'=>'Method not allowed'],405);
