<?php
/*
 GET /api/items
 Lists the catalog with filters, search and sorting. Sold and removed items are left out unless asked for.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

$db = getDB();
$errors = [];
$where = [];
$params = [];

// Status: available and held by default, so a refresh after a sale drops the sold piece
$statuses = array_map("trim", explode(",", queryParam("status", "available,held")));
foreach ($statuses as $s) {
    if (!in_array($s, ["available", "held", "sold"], true)) {
        $errors[] = new APIError("INVALID_STATUS", "status can be available, held or sold (comma-separated).", "status");
        break;
    }
}
$where[] = "i.status IN (" . implode(",", array_fill(0, count($statuses), "?")) . ")";
array_push($params, ...$statuses);

$storeId = queryParam("store_id");
if ($storeId !== null) {
    if (fetchStore($db, $storeId) === null) {
        $errors[] = new APIError("STORE_NOT_FOUND", "There's no store with that ID.", "store_id");
    }
    $where[] = "i.store_id = ?";
    $params[] = $storeId;
}

$category = queryParam("category");
if ($category !== null) {
    if (!in_array($category, ITEM_CATEGORIES, true)) {
        $errors[] = new APIError("INVALID_CATEGORY", "category must be one of: " . implode(", ", ITEM_CATEGORIES) . ".", "category");
    }
    $where[] = "i.category = ?";
    $params[] = $category;
}

$size = queryParam("size");
if ($size !== null) {
    if (!in_array($size, ITEM_SIZES, true)) {
        $errors[] = new APIError("INVALID_SIZE", "size must be one of: " . implode(", ", ITEM_SIZES) . ".", "size");
    }
    $where[] = "i.size = ?";
    $params[] = $size;
}

// Price: either a preset like "25-50" / "100+" (matching the Explore dropdown) or price_min / price_max in dollars
$priceMin = queryParam("price_min");
$priceMax = queryParam("price_max");
$price = queryParam("price");
if ($price !== null) {
    if (preg_match('/^(\d+)-(\d+)$/', $price, $m)) {
        [$priceMin, $priceMax] = [$m[1], $m[2]];
    } elseif (preg_match('/^(\d+)\+$/', $price, $m)) {
        $priceMin = $m[1];
    } else {
        $errors[] = new APIError("INVALID_PRICE_RANGE", "price must look like 25-50 or 100+.", "price");
    }
}
foreach (["price_min" => $priceMin, "price_max" => $priceMax] as $name => $value) {
    if ($value !== null && !is_numeric($value)) {
        $errors[] = new APIError("INVALID_PRICE_RANGE", "$name must be a number of dollars.", $name);
    }
}
if ($priceMin !== null && is_numeric($priceMin)) {
    $where[] = "i.price_cents >= ?";
    $params[] = (int)round($priceMin * 100);
}
if ($priceMax !== null && is_numeric($priceMax)) {
    // Ranges are inclusive at the bottom and exclusive at the top, so $25 lands in "25-50" only
    $where[] = "i.price_cents < ?";
    $params[] = (int)round($priceMax * 100);
}

$q = queryParam("q");
if ($q !== null) {
    $like = "%" . addcslashes(mb_substr($q, 0, 100), "%_\\") . "%";
    $where[] = "(i.title LIKE ? ESCAPE '\\' OR i.description LIKE ? ESCAPE '\\' OR i.category LIKE ? ESCAPE '\\'
                 OR IFNULL(i.material, '') LIKE ? ESCAPE '\\' OR s.name LIKE ? ESCAPE '\\')";
    array_push($params, $like, $like, $like, $like, $like);
}

$sort = queryParam("sort", "featured");
$sorts = ["featured", "price-low", "price-high", "recent"];
if (!in_array($sort, $sorts, true)) {
    $errors[] = new APIError("INVALID_SORT", "sort must be one of: " . implode(", ", $sorts) . ".", "sort");
}

if (count($errors) > 0) {
    failMany(400, $errors);
}

$order = [
    "featured"   => "i.item_id",
    "price-low"  => "i.price_cents ASC, i.item_id",
    "price-high" => "i.price_cents DESC, i.item_id",
    "recent"     => "i.listed_at DESC, i.item_id",
][$sort];

$stmt = $db->prepare(ITEM_SELECT . " WHERE " . implode(" AND ", $where) . " ORDER BY $order");
$stmt->execute($params);
$rows = $stmt->fetchAll();

$visitor = optionalVisitor();
$scores = null;
if ($sort === "featured") {
    $scores = scoreItems($db, $rows, $visitor);
    $rows = sortFeatured($rows, $scores);
}
$explain = boolValue(queryParam("explain", "0")) === true;
$favoriteIds = visitorFavoriteIds($db, $visitor);

sendJSON(200, [
    "count"        => count($rows),
    "sort"         => $sort,
    "generated_at" => isoTime(time()),
    "items"        => array_map(
        fn($row) => formatItem($row, $favoriteIds, ($explain && $scores) ? $scores[$row["item_id"]] : null),
        $rows
    ),
]);
