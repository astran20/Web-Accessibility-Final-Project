<?php
/*
 GET /api/booking?booking_id=12&confirmation_code=RT-7K2Q9M
 One booking, for the confirmation page. Instead of the code, the X-Visitor-Token header
 of the visitor who made the booking also works.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$id = queryParam("booking_id");
$row = authorizeBooking(
    idValue($id),
    queryParam("confirmation_code"),
    optionalVisitor()
);
sendJSON(200, ["booking" => formatBooking(fetchBooking(getDB(), (int)$row["booking_id"]))]);
