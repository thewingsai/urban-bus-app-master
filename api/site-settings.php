<?php
// Public: get global site settings
require_once __DIR__ . '/supabase_client.php';

$resp = supabase_request('GET', '/site_settings?id=eq.global&select=id,seo_title,seo_description,og_image,twitter_image,phone,email,support_whatsapp,footer_html,updated_at');
$rows=[]; if($resp['status']>=200&&$resp['status']<300){ $rows = json_decode($resp['body'], true) ?: []; }
json_out(['success'=>true,'item'=>$rows[0]??null], $resp['status']>=200&&$resp['status']<300 ? 200 : 502);
