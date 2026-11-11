<?php
/*
 POST /api/create-booking
 Books an in-store try-on. Returns a confirmation code that works like a password
 for viewing, rescheduling or cancelling this booking.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["POST"]);

$body = readJSONBody();
$input = is_array($body["booking"] ?? null) ? $body["booking"] : $body;
$db = getDB();

$itemId = stringField($input, "item_id");
if ($itemId === null) {
    fail(400, "ITEM_ID_REQUIRED", "Choose a piece to try on.", "item_id");
}
assertItemBookable(fetchItem($db, $itemId));

// Collect every field problem at once so the form can mark them all together
$errors = [];
$name = stringField($input, "name");
if ($name === null) $errors[] = new APIError("NAME_REQUIRED", "Please enter your name.", "name");
elseif (mb_strlen($name) > 100) $errors[] = new APIError("NAME_TOO_LONG", "Keep your name to 100 characters or fewer.", "name");

$email = stringField($input, "email");
if ($email === null || mb_strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors[] = new APIError($email === null ? "EMAIL_REQUIRED" : "EMAIL_INVALID", "Enter a valid email address, such as name@example.com.", "email");
}

$date = stringField($input, "date");
$dateError = checkBookableDate($date);
if ($dateError) $errors[] = $dateError;

$time = stringField($input, "time");
if ($time === null) $errors[] = new APIError("TIME_REQUIRED", "Choose one of the available times.", "time");
elseif (!isValidTime($time)) $errors[] = new APIError("TIME_INVALID", "Choose one of the available times.", "time");

$notes = stringField($input, "notes");
if ($notes !== null && mb_strlen($notes) > MAX_NOTES_LENGTH) {
    $errors[] = new APIError("NOTES_TOO_LONG", "Keep your note to " . MAX_NOTES_LENGTH . " characters or fewer.", "notes");
}

if (count($errors) > 0) {
    failMany(400, $errors);
}

$visitor = optionalVisitor();
$code = generateConfirmationCode();

$bookingId = withWriteLock(function (PDO $db) use ($itemId, $name, $email, $date, $time, $notes, $visitor, $code) {
    // Check again inside the lock: the item may have sold or the slot filled a moment ago
    $item = fetchItem($db, $itemId);
    assertItemBookable($item);
    assertSlotBookable($db, fetchStore($db, $item["store_id"]), $date, $time, $itemId);

    $now = time();
    $db->prepare(
        "INSERT INTO bookings (confirmation_hash, item_id, store_id, visitor_token, name, email, date, time, notes,
                               status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)"
    )->execute([password_hash($code, PASSWORD_DEFAULT), $itemId, $item["store_id"], $visitor, $name, $email, $date, $time, $notes, $now, $now]);
    return (int)$db->lastInsertId();
});

$booking = formatBooking(fetchBooking($db, $bookingId));
sendJSON(201, [
    "success"           => true,
    "message"           => "Your try-on is confirmed for " . $booking["date_label"] . " at " . $booking["time_label"] . ".",
    "booking_id"        => $bookingId,
    "confirmation_code" => $code,
    "booking"           => $booking,
]);
