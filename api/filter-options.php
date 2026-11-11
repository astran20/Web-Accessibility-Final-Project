<?php
/*
 GET /api/filter-options
 Everything the Explore dropdowns need, with how many listed pieces match each option.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$db = getDB();
$active = "status IN ('available', 'held')";
$countBy = fn($column) => $db->query("SELECT $column, COUNT(*) FROM items WHERE $active GROUP BY $column")->fetchAll(PDO::FETCH_KEY_PAIR);

$storeCounts = $countBy("store_id");
$categoryCounts = $countBy("category");
$sizeCounts = $countBy("size");
$conditionCounts = $countBy("condition");
$sizeLabels = ["XS" => "Extra small", "S" => "Small", "M" => "Medium", "L" => "Large", "XL" => "Extra large"];

$stores = [];
foreach ($db->query("SELECT store_id, name FROM stores ORDER BY name")->fetchAll() as $s) {
    $stores[] = ["value" => $s["store_id"], "label" => $s["name"], "item_count" => (int)($storeCounts[$s["store_id"]] ?? 0)];
}

$priceRanges = [];
foreach (PRICE_RANGES as $range) {
    $sql = "SELECT COUNT(*) FROM items WHERE $active AND price_cents >= ?" . ($range["max"] !== null ? " AND price_cents < ?" : "");
    $stmt = $db->prepare($sql);
    $stmt->execute($range["max"] !== null ? [$range["min"] * 100, $range["max"] * 100] : [$range["min"] * 100]);
    $priceRanges[] = ["value" => $range["value"], "label" => $range["label"], "item_count" => (int)$stmt->fetchColumn()];
}

sendJSON(200, [
    "stores"       => $stores,
    "categories"   => array_map(fn($c) => ["value" => $c, "label" => ucfirst($c), "item_count" => (int)($categoryCounts[$c] ?? 0)], ITEM_CATEGORIES),
    "sizes"        => array_map(fn($s) => ["value" => $s, "label" => $sizeLabels[$s] ?? $s, "item_count" => (int)($sizeCounts[$s] ?? 0)], ITEM_SIZES),
    "conditions"   => array_map(fn($c) => ["value" => $c, "label" => $c, "item_count" => (int)($conditionCounts[$c] ?? 0)], ITEM_CONDITIONS),
    "price_ranges" => $priceRanges,
    "sorts"        => [
        ["value" => "featured",   "label" => "Featured"],
        ["value" => "price-low",  "label" => "Price: low to high"],
        ["value" => "price-high", "label" => "Price: high to low"],
        ["value" => "recent",     "label" => "Recently added"],
    ],
]);
