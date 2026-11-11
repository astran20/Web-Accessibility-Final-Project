<?php
/*
 GET /api/availability?store_id=juniper-thread&date=2026-11-12
 GET /api/availability?item_id=item-02&date=2026-11-12
 Bookable time slots for one day. With item_id, the store comes from the item and slots
 where that piece is already booked are marked unavailable.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$db = getDB();
$itemId = queryParam("item_id");
$storeId = queryParam("store_id");
$date = queryParam("date");

if ($itemId !== null) {
    $item = fetchItem($db, $itemId);
    if ($item === null) {
        fail(404, "ITEM_NOT_FOUND", "We couldn't find that piece. It may have been removed.", "item_id");
    }
    $storeId = $item["store_id"];
}
if ($storeId === null) {
    fail(400, "STORE_ID_REQUIRED", "Send a store_id or an item_id.", "store_id");
}
$store = fetchStore($db, $storeId);
if ($store === null) {
    fail(404, "STORE_NOT_FOUND", "There's no store with that ID.", "store_id");
}
$dateError = checkBookableDate($date);
if ($dateError) {
    failMany(400, [$dateError]);
}

$result = computeSlots($db, $store, $date, $itemId);
sendJSON(200, [
    "store_id"        => $storeId,
    "item_id"         => $itemId,
    "date"            => $date,
    "date_label"      => dateLabel($date),
    "closed"          => $result["closed"],
    "closed_reason"   => $result["closed_reason"],
    "available_count" => count(array_filter($result["slots"], fn($s) => $s["available"])),
    "slots"           => $result["slots"],
]);
