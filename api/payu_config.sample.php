<?php
// Copy this file to payu_config.php and fill in real credentials.
// NEVER commit payu_config.php to version control. It is ignored via .gitignore

if (!defined('PAYU_KEY')) define('PAYU_KEY', getenv('PAYU_KEY') ?: 'YOUR_KEY');
if (!defined('PAYU_SALT')) define('PAYU_SALT', getenv('PAYU_SALT') ?: 'YOUR_SALT');
if (!defined('PAYU_ENV')) define('PAYU_ENV', getenv('PAYU_ENV') ?: 'prod');

function payu_endpoint() {
  $env = defined('PAYU_ENV') ? PAYU_ENV : 'prod';
  return $env === 'test' ? 'https://test.payu.in/_payment' : 'https://secure.payu.in/_payment';
}
