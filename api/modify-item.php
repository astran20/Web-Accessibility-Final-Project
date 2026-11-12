<?php
/*
 PUT /api/modify-item
 Edits a listing. Send only the fields that change. A new photo needs new alt text.
 Use update-item-status (not this) to mark a piece held or sold.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["PUT"]);

$store = requireStore();
$body = readJSONBody();
$db = getDB();
$item = requireStoreItem($db, $store, stringField($body, "item_id"));
$input = is_array($body["item"] ?? null) ? $body["item"] : [];
if (count($input) === 0) {
    fail(400, "NO_CHANGES", "Send the fields to change inside \"item\".");
}
if (array_key_exists("status", $input)) {
    fail(400, "USE_STATUS_ENDPOINT", "Change status with PUT /api/update-item-status so bookings are updated too.", "status");
}

[$fields, $errors, $image] = validateItemInput($input, true);
if (count($errors) > 0) {
    failMany(400, $errors);
}

$oldImage = $item["image"];
if ($image !== null) {
    $fields["image"] = saveItemImage($image, $item["item_id"]);
}
if (count($fields) > 0) {
    $sets = implode(", ", array_map(fn($col) => "$col = ?", array_keys($fields)));
    $db->prepare("UPDATE items SET $sets, updated_at = ? WHERE item_id = ?")
       ->execute(array_merge(array_values($fields), [time(), $item["item_id"]]));
}
if ($image !== null) {
    deleteUploadedImage($oldImage);
}

sendJSON(200, [
    "success" => true,
    "message" => "Listing updated.",
    "item_id" => $item["item_id"],
    "item"    => formatStoreItem($db, fetchItem($db, $item["item_id"], true)),
]);
