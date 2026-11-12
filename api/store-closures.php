<?php
/*
 GET /api/store-closures
 The store's upcoming closures (holidays, events, short breaks).

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$store = requireStore();
$stmt = getDB()->prepare("SELECT * FROM closures WHERE store_id = ? AND date >= ? ORDER BY date, start_time");
$stmt->execute([$store["store_id"], todayDate()]);
$closures = array_map("formatClosure", $stmt->fetchAll());

sendJSON(200, ["count" => count($closures), "closures" => $closures]);
