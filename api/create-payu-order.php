<?php
// Creates a PayU order and auto-posts to PayU Checkout with the exact amount.
// Accepts POST (JSON or form) or GET params: amount, name, email, phone, productinfo, bookingId

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer-when-downgrade');

require_once __DIR__ . '/payu_config.php';

// Helper to read input
function read_input($key, $default = '') {
  $v = $default;
  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
      static $json = null; if ($json === null) $json = json_decode(file_get_contents('php://input'), true) ?: [];
      $v = $json[$key] ?? $default;
    } else {
      $v = $_POST[$key] ?? $default;
    }
  } else {
    $v = $_GET[$key] ?? $default;
  }
  return is_string($v) ? trim($v) : $v;
}

$amount = (float) read_input('amount', 0);
$name = read_input('name', 'Guest');
$email = read_input('email', 'guest@example.com');
$phone = read_input('phone', '9999999999');
$productinfo = read_input('productinfo', 'UrbanBus Ticket');
$bookingId = read_input('bookingId', '');

if ($amount <= 0) {
  http_response_code(400);
  header('Content-Type: application/json');
  echo json_encode(['success' => false, 'error' => 'Invalid amount']);
  exit;
}

$key = PAYU_KEY; $salt = PAYU_SALT; $action = payu_endpoint();
$txnid = $bookingId ?: ('UB' . time() . rand(1000,9999));
$surl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . '/api/payu-return.php?result=success';
$furl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . '/api/payu-return.php?result=failure';

// Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt
$firstname = preg_replace('/\s+/', ' ', $name);
$udfs = array_fill(0, 10, '');
$hashString = implode('|', array_merge([
  $key,
  $txnid,
  number_format($amount, 2, '.', ''),
  $productinfo,
  $firstname,
  $email
], $udfs, [
  $salt
]));
$hash = strtolower(hash('sha512', $hashString));

// Auto-submit HTML form to PayU
header('Content-Type: text/html; charset=UTF-8');
?>
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting to Payment...</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;margin:24px;color:#0f172a}</style>
</head>
<body>
  <p>Redirecting you to the secure payment page… Please wait.</p>
  <form id="payuForm" method="post" action="<?= htmlspecialchars($action, ENT_QUOTES) ?>">
    <input type="hidden" name="key" value="<?= htmlspecialchars($key, ENT_QUOTES) ?>">
    <input type="hidden" name="txnid" value="<?= htmlspecialchars($txnid, ENT_QUOTES) ?>">
    <input type="hidden" name="amount" value="<?= htmlspecialchars(number_format($amount, 2, '.', ''), ENT_QUOTES) ?>">
    <input type="hidden" name="productinfo" value='<?= htmlspecialchars($productinfo, ENT_QUOTES) ?>'>
    <input type="hidden" name="firstname" value='<?= htmlspecialchars($firstname, ENT_QUOTES) ?>'>
    <input type="hidden" name="email" value='<?= htmlspecialchars($email, ENT_QUOTES) ?>'>
    <input type="hidden" name="phone" value='<?= htmlspecialchars($phone, ENT_QUOTES) ?>'>
    <input type="hidden" name="surl" value='<?= htmlspecialchars($surl, ENT_QUOTES) ?>'>
    <input type="hidden" name="furl" value='<?= htmlspecialchars($furl, ENT_QUOTES) ?>'>
    <input type="hidden" name="hash" value='<?= htmlspecialchars($hash, ENT_QUOTES) ?>'>
    <input type="hidden" name="udf1" value='<?= htmlspecialchars($bookingId, ENT_QUOTES) ?>'>
  </form>
  <script>document.getElementById('payuForm').submit()</script>
</body>
</html>
