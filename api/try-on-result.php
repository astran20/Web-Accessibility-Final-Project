<?php
/*
 GET /api/try-on-result?model_id=model-01&item_id=item-01
 The pre-made result for a model and piece. If no composite image has been made for the
 pair yet, the piece's own photo is returned as a styling reference. Always a demo.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$modelId = queryParam("model_id");
$itemId = queryParam("item_id");
$errors = [];
if ($modelId === null) $errors[] = new APIError("MODEL_ID_REQUIRED", "Choose a sample model.", "model_id");
if ($itemId === null) $errors[] = new APIError("ITEM_ID_REQUIRED", "Choose a piece to try on.", "item_id");
if (count($errors) > 0) {
    failMany(400, $errors);
}

$db = getDB();
$stmt = $db->prepare("SELECT * FROM try_on_models WHERE model_id = ?");
$stmt->execute([$modelId]);
$model = $stmt->fetch();
if (!$model) {
    fail(404, "MODEL_NOT_FOUND", "There's no sample model with that ID.", "model_id");
}
$item = fetchItem($db, $itemId);
if ($item === null) {
    fail(404, "ITEM_NOT_FOUND", "We couldn't find that piece. It may have been removed.", "item_id");
}
if (!$item["try_on_supported"]) {
    fail(400, "TRY_ON_UNSUPPORTED", "This piece isn't part of the try-on demo yet.", "item_id");
}

$stmt = $db->prepare("SELECT * FROM try_on_results WHERE model_id = ? AND item_id = ?");
$stmt->execute([$modelId, $itemId]);
$result = $stmt->fetch();

sendJSON(200, [
    "is_demo"     => true,
    "result_type" => $result ? "composite" : "styling_reference",
    "image"       => $result ? $result["image"] : $item["image"],
    "image_alt"   => $result ? $result["image_alt"] : "Styling reference: " . $item["image_alt"] . ". Not a generated try-on.",
    "notice"      => "Simulated result for a class demo. It does not show how the piece would fit you.",
    "model"       => $model,
    "item"        => formatItem($item),
]);
