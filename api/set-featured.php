<?php
/*
 PUT /api/set-featured
 Pins or unpins a piece. Pinned pieces lead the "Featured" sort.
 Each store can pin up to MAX_PINNED_PER_STORE pieces (see config.php).

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["PUT"]);

$store = requireStore();
$body = readJSONBody();
$pinned = boolValue($body["pinned"] ?? null);
if ($pinned === null) {
    fail(400, "PINNED_REQUIRED", "pinned must be true or false.", "pinned");
}

withWriteLock(function (PDO $db) use ($store, $body, $pinned) {
    $item = requireStoreItem($db, $store, stringField($body, "item_id"));
    if ($pinned && !in_array($item["status"], ["available", "held"], true)) {
        fail(409, "ITEM_NOT_PINNABLE", "Only available or on-hold pieces can be pinned.", "item_id");
    }
    if ($pinned && !$item["pinned"]) {
        $stmt = $db->prepare("SELECT COUNT(*) FROM items WHERE store_id = ? AND pinned = 1");
        $stmt->execute([$store["store_id"]]);
        if ((int)$stmt->fetchColumn() >= MAX_PINNED_PER_STORE) {
            fail(409, "PIN_LIMIT_REACHED", "You can pin up to " . MAX_PINNED_PER_STORE . " pieces. Unpin one first.", "item_id");
        }
    }
    $db->prepare("UPDATE items SET pinned = ?, updated_at = ? WHERE item_id = ?")->execute([$pinned ? 1 : 0, time(), $item["item_id"]]);
});

$itemId = stringField($body, "item_id");
sendJSON(200, [
    "success" => true,
    "message" => $pinned ? "Pinned to the top of Featured." : "Unpinned.",
    "item_id" => $itemId,
    "pinned"  => $pinned,
]);
