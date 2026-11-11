<?php
/*
 GET /api/favorites
 The visitor's saved pieces, newest first. Sold pieces stay in the list with status "sold".

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$token = requireVisitor();
$db = getDB();
$stmt = $db->prepare(
    "SELECT i.*, s.name AS store_name, s.neighborhood AS store_neighborhood, f.created_at AS saved_at
     FROM favorites f
     JOIN items i ON i.item_id = f.item_id
     JOIN stores s ON s.store_id = i.store_id
     WHERE f.visitor_token = ? AND i.status != 'removed'
     ORDER BY f.created_at DESC, i.item_id"
);
$stmt->execute([$token]);
$rows = $stmt->fetchAll();

$items = array_map(function ($row) {
    $item = formatItem($row);
    $item["is_favorite"] = true;
    $item["saved_at"] = isoTime((int)$row["saved_at"]);
    return $item;
}, $rows);

sendJSON(200, ["count" => count($items), "items" => $items]);
