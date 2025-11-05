<?php
// Handles PayU return (success/failure) and redirects to homepage with status params.

$result = isset($_GET['result']) ? $_GET['result'] : 'unknown';
$status = isset($_POST['status']) ? $_POST['status'] : $result;
$txnid = isset($_POST['txnid']) ? $_POST['txnid'] : '';
$error = isset($_POST['error']) ? $_POST['error'] : '';

$qs = http_build_query([
  'payment' => $status,
  'txnid' => $txnid,
  'error' => $error,
]);

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$base = $scheme . $_SERVER['HTTP_HOST'] . '/';
header('Location: ' . $base . '?' . $qs, true, 302);
exit;
