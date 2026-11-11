<?php
/*
 POST /api/create-closure
 Blocks off a whole day, or part of one, so those times can't be booked.
 Existing bookings in that window are not cancelled automatically; they are listed in
 "conflicting_bookings" so the store can contact those shoppers.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["POST"]);

$store = requireStore();
$body = readJSONBody();
$input = is_array($body["closure"] ?? null) ? $body["closure"] : [];

$errors = [];
$date = stringField($input, "date");
if (!isValidDate($date)) $errors[] = new APIError("DATE_INVALID", "Enter the date as YYYY-MM-DD.", "date");
elseif ($date < todayDate()) $errors[] = new APIError("DATE_IN_PAST", "Closures must be today or later.", "date");

$start = stringField($input, "start_time");
$end = stringField($input, "end_time");
if (($start === null) !== ($end === null)) {
    $errors[] = new APIError("TIME_RANGE_INCOMPLETE", "Send both start_time and end_time, or neither for an all-day closure.", $start === null ? "start_time" : "end_time");
} elseif ($start !== null && (!isValidTime($start) || !isValidTime($end) || $start >= $end)) {
    $errors[] = new APIError("TIME_RANGE_INVALID", "Times must be HH:MM with start_time before end_time.", "start_time");
}
$reason = stringField($input, "reason");
if ($reason !== null && mb_strlen($reason) > 200) $errors[] = new APIError("REASON_TOO_LONG", "Keep the reason to 200 characters or fewer.", "reason");
if (count($errors) > 0) {
    failMany(400, $errors);
}

$db = getDB();
$db->prepare("INSERT INTO closures (store_id, date, start_time, end_time, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)")
   ->execute([$store["store_id"], $date, $start, $end, $reason, time()]);
$closureId = (int)$db->lastInsertId();

// Bookings that overlap the closure
$stmt = $db->prepare("SELECT booking_id, time FROM bookings WHERE store_id = ? AND date = ? AND status = 'confirmed'");
$stmt->execute([$store["store_id"], $date]);
$conflicts = [];
foreach ($stmt->fetchAll() as $b) {
    $slotStart = timeToMinutes($b["time"]);
    if ($start === null || (timeToMinutes($start) < $slotStart + (int)$store["slot_minutes"] && timeToMinutes($end) > $slotStart)) {
        $conflicts[] = (int)$b["booking_id"];
    }
}

$stmt = $db->prepare("SELECT * FROM closures WHERE closure_id = ?");
$stmt->execute([$closureId]);
sendJSON(201, [
    "success"              => true,
    "message"              => "Closure added." . (count($conflicts) > 0 ? " " . count($conflicts) . " existing booking(s) fall in this window." : ""),
    "closure"              => formatClosure($stmt->fetch()),
    "conflicting_bookings" => $conflicts,
]);
