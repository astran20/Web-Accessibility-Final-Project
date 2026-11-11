<?php
/*
 POST /api/add-favorite
 Saves a piece for the visitor. Saving something that's already saved is not an error.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["POST"]);

$token = requireVisitor();
$body = readJSONBody();
$itemId = stringField($body, "item_id");
if ($itemId === null) {
    fail(400, "ITEM_ID_REQUIRED", "An item_id is required.", "item_id");
}

$db = getDB();
$item = fetchItem($db, $itemId);
if ($item === null) {
    fail(404, "ITEM_NOT_FOUND", "We couldn't find that piece. It may have been removed.", "item_id");
}
if ($item["status"] === "sold") {
    fail(409, "ITEM_SOLD", "This piece has already sold, so it can't be saved.", "item_id");
}

$stmt = $db->prepare("INSERT OR IGNORE INTO favorites (visitor_token, item_id, created_at) VALUES (?, ?, ?)");
$stmt->execute([$token, $itemId, time()]);

sendJSON(200, [
    "success"       => true,
    "item_id"       => $itemId,
    "is_favorite"   => true,
    "already_saved" => $stmt->rowCount() === 0,
    "message"       => $item["title"] . " saved to Favorites.",
]);
