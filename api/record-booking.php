<?php
// POST /api/record-booking.php
// Records a booking and payment in Supabase after a successful checkout
// Body (JSON): {
//   booking_reference, schedule_id, travel_date (YYYY-MM-DD), seat_numbers [..], total_amount,
//   passenger_name, passenger_email, passenger_phone, passenger_age?, passenger_gender?,
//   user_id?, payment_method, transaction_id?, payment_status? (default success)
// }

require_once __DIR__ . '/supabase_client.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out([ 'success' => false, 'error' => 'Method not allowed' ], 405);
  exit;
}

$in = json_input();

// Basic validation
$required = ['schedule_id','travel_date','seat_numbers','total_amount','passenger_name','passenger_email','passenger_phone','payment_method'];
$missing = [];
foreach ($required as $k) { if (!array_key_exists($k, $in) || $in[$k] === '' || $in[$k] === null) $missing[] = $k; }
if (count($missing) > 0) {
  json_out([ 'success' => false, 'error' => 'Missing required fields', 'fields' => $missing ], 400);
  exit;
}

// Generate booking_reference if not provided
$bookingRef = $in['booking_reference'] ?? ('BK' . time() . random_int(100, 999));

// Normalize types
$seatNumbers = is_array($in['seat_numbers']) ? $in['seat_numbers'] : [];
$paymentStatus = $in['payment_status'] ?? 'success';

$booking = [
  'user_id' => $in['user_id'] ?? null,
  'schedule_id' => $in['schedule_id'],
  'travel_date' => $in['travel_date'],
  'seat_numbers' => $seatNumbers,
  'total_amount' => (float)$in['total_amount'],
  'passenger_name' => $in['passenger_name'],
  'passenger_email' => $in['passenger_email'],
  'passenger_phone' => $in['passenger_phone'],
  'passenger_age' => $in['passenger_age'] ?? null,
  'passenger_gender' => $in['passenger_gender'] ?? null,
  'booking_status' => 'confirmed',
  'payment_status' => ($paymentStatus === 'success' ? 'completed' : $paymentStatus),
  'booking_reference' => $bookingRef,
];

$respBooking = supabase_insert('bookings', $booking);
if ($respBooking['status'] < 200 || $respBooking['status'] >= 300) {
  json_out([
    'success' => false,
    'error' => 'Failed to insert booking',
    'status' => $respBooking['status'],
    'details' => $respBooking['body']
  ], 502);
  exit;
}

$bookingRow = json_decode($respBooking['body'], true);
$bookingId = $bookingRow[0]['id'] ?? null;

// Optional payment row
$payment = [
  'booking_id' => $bookingId,
  'amount' => (float)$in['total_amount'],
  'payment_method' => $in['payment_method'],
  'transaction_id' => $in['transaction_id'] ?? null,
  'payment_status' => ($paymentStatus === 'success' ? 'success' : $paymentStatus),
];

$respPayment = supabase_insert('payments', $payment);
if ($respPayment['status'] < 200 || $respPayment['status'] >= 300) {
  // Booking created but payment insert failed -> still return booking success
  json_out([
    'success' => true,
    'booking' => $bookingRow[0] ?? null,
    'payment' => null,
    'warning' => 'Payment record not created',
    'payment_error' => $respPayment['body']
  ], 207);
  exit;
}

$paymentRow = json_decode($respPayment['body'], true);
json_out([
  'success' => true,
  'booking' => $bookingRow[0] ?? null,
  'payment' => $paymentRow[0] ?? null,
]);
