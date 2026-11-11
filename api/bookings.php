<?php
/*
 GET /api/bookings?scope=upcoming
 My Appointments: every booking made with this visitor token.
 scope = upcoming (default, today onward, soonest first), past (most recent first) or all.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$token = requireVisitor();
$scope = queryParam("scope", "upcoming");
$filters = [
    "upcoming" => ["b.date >= ?", "b.date ASC, b.time ASC"],
    "past"     => ["b.date < ?",  "b.date DESC, b.time DESC"],
    "all"      => ["? IS NOT NULL", "b.date DESC, b.time DESC"],
];
if (!isset($filters[$scope])) {
    fail(400, "INVALID_SCOPE", "scope must be upcoming, past or all.", "scope");
}
[$condition, $order] = $filters[$scope];

$stmt = getDB()->prepare(BOOKING_SELECT . " WHERE b.visitor_token = ? AND $condition ORDER BY $order");
$stmt->execute([$token, todayDate()]);
$bookings = array_map("formatBooking", $stmt->fetchAll());

sendJSON(200, ["count" => count($bookings), "scope" => $scope, "bookings" => $bookings]);
