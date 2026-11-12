<?php
/*
 DELETE /api/remove-favorite
 Removes a saved piece. Removing something that isn't saved is not an error.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["DELETE"]);

$token = requireVisitor();
$body = readJSONBody();
$itemId = stringField($body, "item_id") ?? queryParam("item_id");
if ($itemId === null) {
    fail(400, "ITEM_ID_REQUIRED", "An item_id is required.", "item_id");
}

$stmt = getDB()->prepare("DELETE FROM favorites WHERE visitor_token = ? AND item_id = ?");
$stmt->execute([$token, $itemId]);

sendJSON(200, [
    "success"     => true,
    "item_id"     => $itemId,
    "is_favorite" => false,
    "removed"     => $stmt->rowCount() > 0,
    "message"     => "Removed from Favorites.",
]);
