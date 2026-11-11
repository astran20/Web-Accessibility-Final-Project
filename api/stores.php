<?php
/*
 GET /api/stores
 All stores, with how many pieces each has listed.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$db = getDB();
$counts = $db->query("SELECT store_id, COUNT(*) FROM items WHERE status IN ('available', 'held') GROUP BY store_id")->fetchAll(PDO::FETCH_KEY_PAIR);
$rows = $db->query("SELECT * FROM stores ORDER BY name")->fetchAll();

sendJSON(200, [
    "count"  => count($rows),
    "stores" => array_map(fn($row) => formatStore($row, (int)($counts[$row["store_id"]] ?? 0)), $rows),
]);
