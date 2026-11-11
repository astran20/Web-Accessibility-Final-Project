<?php
/*
 DELETE /api/delete-closure
 Removes a closure so those times can be booked again.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["DELETE"]);

$store = requireStore();
$body = readJSONBody();
$closureId = idValue($body["closure_id"] ?? queryParam("closure_id"));
if ($closureId === null) {
    fail(400, "CLOSURE_ID_REQUIRED", "A closure_id is required.", "closure_id");
}

$stmt = getDB()->prepare("DELETE FROM closures WHERE closure_id = ? AND store_id = ?");
$stmt->execute([$closureId, $store["store_id"]]);
if ($stmt->rowCount() === 0) {
    fail(404, "CLOSURE_NOT_FOUND", "Your store doesn't have a closure with that ID.", "closure_id");
}

sendJSON(200, ["success" => true, "message" => "Closure removed.", "closure_id" => $closureId]);
