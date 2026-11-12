<?php
/*
 GET /api/try-on-options
 Sample models and the pieces that work with the simulated try-on demo.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$db = getDB();
$models = $db->query("SELECT * FROM try_on_models ORDER BY model_id")->fetchAll();
$items = $db->query(ITEM_SELECT . " WHERE i.try_on_supported = 1 AND i.status IN ('available', 'held') ORDER BY i.item_id")->fetchAll();

sendJSON(200, [
    "is_demo" => true,
    "notice"  => "Simulated try-on for a class demo. No camera, photo upload or AI processing is used.",
    "models"  => $models,
    "items"   => array_map("formatItem", $items),
]);
