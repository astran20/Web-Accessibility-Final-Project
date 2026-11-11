<?php
/*
 DELETE /api/delete-item
 Archives a listing (status "removed"). It disappears from the public site and its upcoming
 bookings are cancelled, but the row is kept so booking history still makes sense.
 Restore it with update-item-status.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["DELETE"]);

$store = requireStore();
$body = readJSONBody();
$itemId = stringField($body, "item_id") ?? queryParam("item_id");

$cancelled = withWriteLock(function (PDO $db) use ($store, $itemId) {
    $item = requireStoreItem($db, $store, $itemId);
    if ($item["status"] === "removed") {
        fail(409, "ALREADY_REMOVED", "This listing is already archived.", "item_id");
    }
    return changeItemStatus($db, $item, "removed");
});

sendJSON(200, [
    "success"            => true,
    "message"            => "Listing archived." . (count($cancelled) > 0 ? " " . count($cancelled) . " upcoming booking(s) were cancelled." : ""),
    "item_id"            => $itemId,
    "status"             => "removed",
    "cancelled_bookings" => $cancelled,
]);
