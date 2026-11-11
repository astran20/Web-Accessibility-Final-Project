<?php
/*
 GET /api/item?item_id=item-01
 One item with its full store details. Sold items are still returned (with status "sold")
 so old links and favorites show "This piece has sold" instead of breaking.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$itemId = queryParam("item_id");
if ($itemId === null) {
    fail(400, "ITEM_ID_REQUIRED", "An item_id is required.", "item_id");
}

$db = getDB();
$row = fetchItem($db, $itemId);
if ($row === null) {
    fail(404, "ITEM_NOT_FOUND", "We couldn't find that piece. It may have been removed.", "item_id");
}

$item = formatItem($row, visitorFavoriteIds($db, optionalVisitor()));
$item["store"] = formatStore(fetchStore($db, $row["store_id"]));
sendJSON(200, ["item" => $item]);
