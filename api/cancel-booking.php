<?php
/*
 PUT /api/cancel-booking
 Cancels an upcoming booking and frees its time slot. The booking is kept with status "cancelled".

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["PUT"]);

$body = readJSONBody();
$auth = is_array($body["auth"] ?? null) ? $body["auth"] : $body;
$id = $auth["booking_id"] ?? null;
$row = authorizeBooking(idValue($id), stringField($auth, "confirmation_code"), optionalVisitor());

if ($row["status"] !== "confirmed" || $row["date"] < todayDate()) {
    fail(409, "BOOKING_NOT_CANCELLABLE", "Only upcoming confirmed appointments can be cancelled. This one is " . strtolower(BOOKING_STATUS_LABELS[$row["status"]]) . ".");
}

$db = getDB();
$db->prepare("UPDATE bookings SET status = 'cancelled', cancel_reason = 'CUSTOMER_CANCELLED', updated_at = ? WHERE booking_id = ?")
   ->execute([time(), $row["booking_id"]]);

sendJSON(200, [
    "success"    => true,
    "booking_id" => (int)$row["booking_id"],
    "message"    => "Your appointment has been cancelled.",
    "booking"    => formatBooking(fetchBooking($db, (int)$row["booking_id"])),
]);
