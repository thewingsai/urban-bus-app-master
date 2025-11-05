<?php
// Admin Offers/Coupons CRUD (mapped to schema: discount_value, valid_until)
require_once __DIR__ . '/admin_auth.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
require_admin();

$table = '/offers';

if($method==='GET'){
  $q=['select'=>'id,code,discount_type,discount_value,valid_from,valid_until,is_active,title,description'];
  if(($code=$_GET['code']??'')!=='') $q['code']='eq.'.$code;
  if(($lim=$_GET['limit']??'')!=='') $q['limit']=(int)$lim;
  if(($off=$_GET['offset']??'')!=='') $q['offset']=(int)$off;
  $resp=supabase_request('GET',$table.'?'.http_build_query($q),null,['Accept-Profile: public','Content-Profile: public']);
  $rows=[]; if($resp['status']>=200&&$resp['status']<300){$rows=json_decode($resp['body'],true)?:[];}
  // Map discount_value -> amount for admin UI compatibility
  foreach($rows as &$r){ if(isset($r['discount_value']) && !isset($r['amount'])) $r['amount']=$r['discount_value']; }
  json_out(['success'=>true,'items'=>$rows]); exit;
}
if($method==='POST'){
  $in=json_input();
  $rec=[ 
    'code'=>$in['code']??'', 
    'discount_type'=>$in['discount_type']??'percent', 
    'discount_value'=>(float)($in['amount']??$in['discount_value']??0), 
    'valid_from'=>$in['valid_from']??null, 
    'valid_until'=>$in['valid_to']??($in['valid_until']??null), 
    'is_active'=>!!($in['is_active']??true),
    'title'=>$in['title']??($in['code']??''),
    'description'=>$in['description']??''
  ];
  if($rec['code']===''){ json_out(['success'=>false,'error'=>'code required'],400); exit; }
  $resp=supabase_request('POST',$table,[$rec],[ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to create','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; $out=$rows[0]??$rec; $out['amount']=$out['discount_value']??null; json_out(['success'=>true,'item'=>$out]); exit;
}
if($method==='PATCH'){
  $in=json_input(); $id=$in['id']??($_GET['id']??null); if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  unset($in['id']);
  if(isset($in['amount']) && !isset($in['discount_value'])){ $in['discount_value'] = $in['amount']; unset($in['amount']); }
  if(isset($in['valid_to']) && !isset($in['valid_until'])){ $in['valid_until']=$in['valid_to']; unset($in['valid_to']); }
  $resp=supabase_request('PATCH',$table.'?id=eq.'.urlencode($id),$in,[ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to update','details'=>$resp['body']],502); exit; }
  $rows=json_decode($resp['body'],true)?:[]; $out=$rows[0]??$in; if(isset($out['discount_value'])) $out['amount']=$out['discount_value']; json_out(['success'=>true,'item'=>$out]); exit;
}
if($method==='DELETE'){
  $id=$_GET['id']??null; if(!$id){ json_out(['success'=>false,'error'=>'id required'],400); exit; }
  $resp=supabase_request('DELETE',$table.'?id=eq.'.urlencode($id),null,[ 'Accept-Profile: public','Content-Profile: public' ]);
  if(!($resp['status']>=200&&$resp['status']<300)){ json_out(['success'=>false,'error'=>'Failed to delete','details'=>$resp['body']],502); exit; }
  json_out(['success'=>true]); exit;
}

json_out(['success'=>false,'error'=>'Method not allowed'],405);
