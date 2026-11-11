<?php
/*
 GET /api/store-items?status=available,held,sold
 The store's own inventory, including sold and removed pieces, newest first.
 Defaults to available, held and sold. Add "removed" to see archived listings.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$store = requireStore();
$statuses = array_map("trim", explode(",", queryParam("status", "available,held,sold")));
foreach ($statuses as $s) {
    if (!isset(ITEM_STATUS_LABELS[$s])) {
        fail(400, "INVALID_STATUS", "status can be available, held, sold or removed (comma-separated).", "status");
    }
}

$db = getDB();
$stmt = $db->prepare(ITEM_SELECT . " WHERE i.store_id = ? AND i.status IN (" . implode(",", array_fill(0, count($statuses), "?")) . ") ORDER BY i.listed_at DESC, i.item_id");
$stmt->execute(array_merge([$store["store_id"]], $statuses));
$items = array_map(fn($row) => formatStoreItem($db, $row), $stmt->fetchAll());

sendJSON(200, ["count" => count($items), "items" => $items]);
