<?php
/*
 GET /api/store?store_id=second-story
 One store with its listed pieces and upcoming closures.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$storeId = queryParam("store_id");
if ($storeId === null) {
    fail(400, "STORE_ID_REQUIRED", "A store_id is required.", "store_id");
}

$db = getDB();
$row = fetchStore($db, $storeId);
if ($row === null) {
    fail(404, "STORE_NOT_FOUND", "There's no store with that ID.", "store_id");
}

$stmt = $db->prepare(ITEM_SELECT . " WHERE i.store_id = ? AND i.status IN ('available', 'held') ORDER BY i.listed_at DESC");
$stmt->execute([$storeId]);
$items = $stmt->fetchAll();

$stmt = $db->prepare("SELECT * FROM closures WHERE store_id = ? AND date >= ? ORDER BY date, start_time");
$stmt->execute([$storeId, todayDate()]);

$favoriteIds = visitorFavoriteIds($db, optionalVisitor());
$store = formatStore($row, count($items));
$store["items"] = array_map(fn($item) => formatItem($item, $favoriteIds), $items);
$store["closures"] = array_map("formatClosure", $stmt->fetchAll());
sendJSON(200, ["store" => $store]);
