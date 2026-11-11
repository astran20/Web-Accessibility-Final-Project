<?php
/*
 GET /api/store-bookings?scope=upcoming&date=2026-11-12&status=confirmed
 The store's try-on appointments, including customer contact details.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$store = requireStore();
$where = ["b.store_id = ?"];
$params = [$store["store_id"]];

$date = queryParam("date");
$scope = queryParam("scope", $date === null ? "upcoming" : "all");
$scopes = ["upcoming" => ["b.date >= ?", "ASC"], "past" => ["b.date < ?", "DESC"], "all" => [null, "ASC"]];
if (!isset($scopes[$scope])) {
    fail(400, "INVALID_SCOPE", "scope must be upcoming, past or all.", "scope");
}
if ($scopes[$scope][0] !== null) {
    $where[] = $scopes[$scope][0];
    $params[] = todayDate();
}
if ($date !== null) {
    if (!isValidDate($date)) {
        fail(400, "DATE_INVALID", "Enter the date as YYYY-MM-DD.", "date");
    }
    $where[] = "b.date = ?";
    $params[] = $date;
}
$status = queryParam("status");
if ($status !== null) {
    if (!isset(BOOKING_STATUS_LABELS[$status])) {
        fail(400, "INVALID_STATUS", "status must be confirmed, completed, no_show or cancelled.", "status");
    }
    $where[] = "b.status = ?";
    $params[] = $status;
}

$dir = $scopes[$scope][1];
$stmt = getDB()->prepare(BOOKING_SELECT . " WHERE " . implode(" AND ", $where) . " ORDER BY b.date $dir, b.time $dir, b.booking_id");
$stmt->execute($params);
$bookings = array_map("formatBooking", $stmt->fetchAll());

sendJSON(200, ["count" => count($bookings), "scope" => $scope, "bookings" => $bookings]);
