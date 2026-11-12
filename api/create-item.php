<?php
/*
 POST /api/create-item
 Adds a new listing for the signed-in store. It shows up on Explore right away.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["POST"]);

$store = requireStore();
$body = readJSONBody();
$input = is_array($body["item"] ?? null) ? $body["item"] : [];
[$fields, $errors, $image] = validateItemInput($input, false);
if (count($errors) > 0) {
    failMany(400, $errors);
}

$itemId = withWriteLock(function (PDO $db) use ($store, $fields, $image) {
    $itemId = generateItemId($db);
    $path = saveItemImage($image, $itemId);
    $now = time();
    try {
        $db->prepare(
            "INSERT INTO items (item_id, store_id, title, category, size, price_cents, condition, material, description,
                                image, image_alt, try_on_supported, status, pinned, listed_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', 0, ?, ?)"
        )->execute([
            $itemId, $store["store_id"], $fields["title"], $fields["category"], $fields["size"], $fields["price_cents"],
            $fields["condition"], $fields["material"] ?? null, $fields["description"], $path, $fields["image_alt"],
            $fields["try_on_supported"] ?? 0, $now, $now,
        ]);
    } catch (Throwable $e) {
        deleteUploadedImage($path); // don't leave an orphaned photo behind
        throw $e;
    }
    return $itemId;
});

$db = getDB();
sendJSON(201, [
    "success" => true,
    "message" => $fields["title"] . " is now listed.",
    "item_id" => $itemId,
    "item"    => formatStoreItem($db, fetchItem($db, $itemId, true)),
]);
