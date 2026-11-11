<?php
/*
 PUT /api/modify-booking
 Reschedules an upcoming booking (new date and/or time) or updates its note.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["PUT"]);

$body = readJSONBody();
$auth = is_array($body["auth"] ?? null) ? $body["auth"] : [];
$changes = is_array($body["booking"] ?? null) ? $body["booking"] : [];
$id = $auth["booking_id"] ?? null;
$row = authorizeBooking(idValue($id), stringField($auth, "confirmation_code"), optionalVisitor());

if ($row["status"] !== "confirmed" || $row["date"] < todayDate()) {
    fail(409, "BOOKING_NOT_MODIFIABLE", "Only upcoming confirmed appointments can be changed.");
}
if (count(array_intersect(array_keys($changes), ["date", "time", "notes"])) === 0) {
    fail(400, "NO_CHANGES", "Send a new date, time or notes inside \"booking\".");
}

$errors = [];
$date = array_key_exists("date", $changes) ? stringField($changes, "date") : $row["date"];
$time = array_key_exists("time", $changes) ? stringField($changes, "time") : $row["time"];
$notes = array_key_exists("notes", $changes) ? stringField($changes, "notes") : $row["notes"];

$dateError = checkBookableDate($date);
if ($dateError) $errors[] = $dateError;
if (!isValidTime($time)) $errors[] = new APIError("TIME_INVALID", "Choose one of the available times.", "time");
if ($notes !== null && mb_strlen($notes) > MAX_NOTES_LENGTH) {
    $errors[] = new APIError("NOTES_TOO_LONG", "Keep your note to " . MAX_NOTES_LENGTH . " characters or fewer.", "notes");
}
if (count($errors) > 0) {
    failMany(400, $errors);
}

withWriteLock(function (PDO $db) use ($row, $date, $time, $notes) {
    if ($date !== $row["date"] || $time !== $row["time"]) {
        assertItemBookable(fetchItem($db, $row["item_id"]));
        assertSlotBookable($db, fetchStore($db, $row["store_id"]), $date, $time, $row["item_id"], (int)$row["booking_id"]);
    }
    $db->prepare("UPDATE bookings SET date = ?, time = ?, notes = ?, updated_at = ? WHERE booking_id = ?")
       ->execute([$date, $time, $notes, time(), $row["booking_id"]]);
});

$booking = formatBooking(fetchBooking(getDB(), (int)$row["booking_id"]));
sendJSON(200, [
    "success"    => true,
    "booking_id" => (int)$row["booking_id"],
    "message"    => "Your appointment is now " . $booking["date_label"] . " at " . $booking["time_label"] . ".",
    "booking"    => $booking,
]);
