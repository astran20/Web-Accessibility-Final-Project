<?php
/*
 PUT /api/update-booking-status
 The store records what happened with an appointment: confirmed, completed, no_show or cancelled.
 "completed" with "item_sold": true also marks the piece sold, all in one step.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["PUT"]);

$store = requireStore();
$body = readJSONBody();
$bookingId = idValue($body["booking_id"] ?? null);
$status = stringField($body, "status");
$message = stringField($body, "store_message");
$itemSold = boolValue($body["item_sold"] ?? false) === true;

$errors = [];
if ($bookingId === null) $errors[] = new APIError("BOOKING_ID_REQUIRED", "A booking_id is required.", "booking_id");
if (!isset(BOOKING_STATUS_LABELS[$status ?? ""])) $errors[] = new APIError("INVALID_STATUS", "status must be confirmed, completed, no_show or cancelled.", "status");
if ($message !== null && mb_strlen($message) > 500) $errors[] = new APIError("MESSAGE_TOO_LONG", "Keep the message to 500 characters or fewer.", "store_message");
if ($itemSold && $status !== "completed") $errors[] = new APIError("ITEM_SOLD_NEEDS_COMPLETED", "item_sold can only be sent with status \"completed\".", "item_sold");
if (count($errors) > 0) {
    failMany(400, $errors);
}

$result = withWriteLock(function (PDO $db) use ($store, $bookingId, $status, $message, $itemSold) {
    $stmt = $db->prepare("SELECT * FROM bookings WHERE booking_id = ? AND store_id = ?");
    $stmt->execute([$bookingId, $store["store_id"]]);
    $booking = $stmt->fetch();
    if (!$booking) {
        fail(404, "BOOKING_NOT_FOUND", "Your store doesn't have a booking with that ID.", "booking_id");
    }
    if ($status === "confirmed" && $booking["status"] === "cancelled") {
        fail(409, "BOOKING_CANCELLED", "Cancelled bookings can't be reopened, since the slot may have been given away. Ask the shopper to book again.", "status");
    }

    $db->prepare("UPDATE bookings SET status = ?, cancel_reason = ?, store_message = COALESCE(?, store_message), updated_at = ? WHERE booking_id = ?")
       ->execute([$status, $status === "cancelled" ? "STORE_CANCELLED" : null, $message, time(), $bookingId]);

    $cancelledOthers = [];
    if ($itemSold) {
        $item = fetchItem($db, $booking["item_id"], true);
        $cancelledOthers = changeItemStatus($db, $item, "sold");
    }
    return $cancelledOthers;
});

$db = getDB();
sendJSON(200, [
    "success"            => true,
    "message"            => "Booking marked " . strtolower(BOOKING_STATUS_LABELS[$status]) . "." . ($itemSold ? " The piece is now marked sold." : ""),
    "booking"            => formatBooking(fetchBooking($db, $bookingId)),
    "cancelled_bookings" => $result,
]);
