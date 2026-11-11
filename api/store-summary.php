<?php
/*
 GET /api/store-summary
 Counts for the top of the store dashboard.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$store = requireStore();
$db = getDB();
$id = $store["store_id"];

$stmt = $db->prepare("SELECT status, COUNT(*) FROM items WHERE store_id = ? GROUP BY status");
$stmt->execute([$id]);
$byStatus = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$count = function (string $sql, array $params) use ($db) {
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return (int)$stmt->fetchColumn();
};

sendJSON(200, [
    "store_id"          => $id,
    "listings"          => [
        "available" => (int)($byStatus["available"] ?? 0),
        "held"      => (int)($byStatus["held"] ?? 0),
        "sold"      => (int)($byStatus["sold"] ?? 0),
        "removed"   => (int)($byStatus["removed"] ?? 0),
    ],
    "sold_last_7_days"  => $count("SELECT COUNT(*) FROM items WHERE store_id = ? AND status = 'sold' AND sold_at >= ?", [$id, time() - 7 * 86400]),
    "bookings_today"    => $count("SELECT COUNT(*) FROM bookings WHERE store_id = ? AND status = 'confirmed' AND date = ?", [$id, todayDate()]),
    "upcoming_bookings" => $count("SELECT COUNT(*) FROM bookings WHERE store_id = ? AND status = 'confirmed' AND date >= ?", [$id, todayDate()]),
    "pinned_count"      => $count("SELECT COUNT(*) FROM items WHERE store_id = ? AND pinned = 1", [$id]),
    "pinned_limit"      => MAX_PINNED_PER_STORE,
    "generated_at"      => isoTime(time()),
]);
