<?php
/*
 PUT /api/update-item-status
 Marks a piece available, held or sold. Marking it sold records the sale, unpins it,
 and cancels its upcoming try-on bookings (shoppers see "This piece sold before your visit").
 Explore drops sold pieces on the next refresh.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["PUT"]);

$store = requireStore();
$body = readJSONBody();
$status = stringField($body, "status");
if (!in_array($status, ["available", "held", "sold"], true)) {
    fail(400, "INVALID_STATUS", "status must be available, held or sold. To archive a listing, use DELETE /api/delete-item.", "status");
}

$result = withWriteLock(function (PDO $db) use ($store, $body, $status) {
    $item = requireStoreItem($db, $store, stringField($body, "item_id"));
    return ["item_id" => $item["item_id"], "previous" => $item["status"], "cancelled" => changeItemStatus($db, $item, $status)];
});

$db = getDB();
$messages = [
    "available" => "Marked available. It's bookable again.",
    "held"      => "Marked on hold. Existing bookings are kept, but no new ones can be made.",
    "sold"      => "Marked sold. It will drop off Explore on the next refresh.",
];
sendJSON(200, [
    "success"             => true,
    "message"             => $messages[$status] . (count($result["cancelled"]) > 0 ? " " . count($result["cancelled"]) . " upcoming booking(s) were cancelled." : ""),
    "item_id"             => $result["item_id"],
    "previous_status"     => $result["previous"],
    "status"              => $status,
    "cancelled_bookings"  => $result["cancelled"],
    "item"                => formatStoreItem($db, fetchItem($db, $result["item_id"], true)),
]);
