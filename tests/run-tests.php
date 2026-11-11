<?php
/*
 tests/run-tests.php
 End-to-end tests for every API endpoint. Starts its own PHP server on a throwaway database
 and upload folder, so your real data is never touched.

     php tests/run-tests.php

 Exit code is 0 when everything passes.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/

if (PHP_SAPI !== "cli") {
    exit("Run from the command line.\n");
}

require_once __DIR__ . "/../config.php";
date_default_timezone_set(APP_TIMEZONE);

$root = dirname(__DIR__);
$tmp = sys_get_temp_dir() . "/rethread-tests-" . bin2hex(random_bytes(4));
mkdir($tmp . "/uploads", 0775, true);
$port = 8790 + random_int(0, 200);
$base = "http://127.0.0.1:$port";

$env = array_merge(getenv(), ["RETHREAD_DB" => "$tmp/test.db", "RETHREAD_UPLOAD_DIR" => "$tmp/uploads"]);
$server = proc_open(
    [PHP_BINARY, "-S", "127.0.0.1:$port", "router.php"],
    [0 => ["pipe", "r"], 1 => ["file", "$tmp/server.log", "a"], 2 => ["file", "$tmp/server.log", "a"]],
    $pipes, $root, $env
);

function cleanup(): void {
    global $server, $tmp;
    if (is_resource($server)) {
        proc_terminate($server);
        proc_close($server);
    }
    foreach (glob("$tmp/uploads/*") as $f) unlink($f);
    @rmdir("$tmp/uploads");
    foreach (glob("$tmp/*") as $f) unlink($f);
    @rmdir($tmp);
}
register_shutdown_function("cleanup");

// Wait for the server to come up
for ($i = 0; $i < 50; $i++) {
    if (@fsockopen("127.0.0.1", $port)) break;
    usleep(100000);
}

// ---------- Tiny test framework ----------

$passed = 0;
$failed = [];
$section = "";

function section(string $name): void {
    global $section;
    $section = $name;
    echo "\n\033[1m$name\033[0m\n";
}

function check(string $label, bool $ok, $detail = null): void {
    global $passed, $failed, $section;
    if ($ok) {
        $passed++;
        echo "  \033[32m✓\033[0m $label\n";
    } else {
        $failed[] = "$section: $label";
        echo "  \033[31m✗ $label\033[0m\n";
        if ($detail !== null) {
            echo "      " . str_replace("\n", "\n      ", substr(is_string($detail) ? $detail : json_encode($detail, JSON_PRETTY_PRINT), 0, 1200)) . "\n";
        }
    }
}

// DESC: Sends a request. $headers is a map like ["X-Visitor-Token" => "..."].
// RET: ["status" => int, "body" => decoded JSON, "headers" => raw header string]
function api(string $method, string $path, ?array $body = null, array $headers = []): array {
    global $base;
    $ch = curl_init($base . $path);
    $headerLines = ["Content-Type: application/json"];
    foreach ($headers as $k => $v) $headerLines[] = "$k: $v";
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER         => true,
        CURLOPT_HTTPHEADER     => $headerLines,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    return [
        "status"  => $status,
        "headers" => substr($raw, 0, $headerSize),
        "body"    => json_decode(substr($raw, $headerSize), true),
    ];
}

function errorCodes(array $res): array {
    return array_column($res["body"]["errors"] ?? [], "error_code");
}

function errorFields(array $res): array {
    return array_column($res["body"]["errors"] ?? [], "field");
}

function ids(array $res, string $key = "items"): array {
    return array_column($res["body"][$key] ?? [], "item_id");
}

// Dates relative to today, in the API's timezone
$tomorrow = date("Y-m-d", strtotime("+1 day"));
$inThreeDays = date("Y-m-d", strtotime("+3 days"));
$inFourDays = date("Y-m-d", strtotime("+4 days"));
$yesterday = date("Y-m-d", strtotime("-1 day"));
$tooFar = date("Y-m-d", strtotime("+" . (BOOKING_WINDOW_DAYS + 5) . " days"));
$nextMonday = date("Y-m-d", strtotime("next monday", strtotime("+1 day")));

$secondStory = ["X-Store-Id" => "second-story", "X-Auth-Code" => "SecondStory-demo-2026"];
$northLoop = ["X-Store-Id" => "north-loop", "X-Auth-Code" => "NorthLoop-demo-2026"];
$juniper = ["X-Store-Id" => "juniper-thread", "X-Auth-Code" => "JuniperThread-demo-2026"];

// 1x1 PNG
$pngDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// ---------- Catalog ----------

section("Catalog: GET /api/items");
$res = api("GET", "/api/items");
check("returns 200", $res["status"] === 200, $res);
check("9 pieces by default (sold item-09 left out, held item-10 included)", $res["body"]["count"] === 9 && !in_array("item-09", ids($res)) && in_array("item-10", ids($res)), ids($res));
check("sends Cache-Control: no-store so a refresh is always current", stripos($res["headers"], "Cache-Control: no-store") !== false);
check("item objects carry price_display and url", ($res["body"]["items"][0]["price_display"] ?? null) !== null && str_starts_with($res["body"]["items"][0]["url"], "item.html?item_id="));

$res = api("GET", "/api/items?store_id=north-loop");
check("filters by store", ids($res) !== [] && count(array_unique(array_column(array_column($res["body"]["items"], "store"), "store_id"))) === 1);
$res = api("GET", "/api/items?category=outerwear&size=L");
check("filters by category and size", array_values(array_diff(ids($res), ["item-07", "item-08"])) === [] && count(ids($res)) === 2, ids($res));
$res = api("GET", "/api/items?price=0-25");
check("price preset 0-25 returns only the $24 shirt", ids($res) === ["item-04"], ids($res));
$res = api("GET", "/api/items?price=25-50");
check("price preset 25-50 returns $48 and $49 pieces", count(array_intersect(ids($res), ["item-02", "item-06"])) === 2 && count(ids($res)) === 2, ids($res));
$res = api("GET", "/api/items?q=denim");
check("search matches title, material and category", in_array("item-03", ids($res)) && in_array("item-06", ids($res)), ids($res));
$res = api("GET", "/api/items?q=" . urlencode("100%"));
check("search treats % literally", $res["status"] === 200 && $res["body"]["count"] === 0);

$res = api("GET", "/api/items?sort=price-low");
$prices = array_column($res["body"]["items"], "price_cents");
$sorted = $prices; sort($sorted);
check("sort=price-low is ascending", $prices === $sorted);
$res = api("GET", "/api/items?sort=price-high");
$prices = array_column($res["body"]["items"], "price_cents");
$sorted = $prices; rsort($sorted);
check("sort=price-high is descending", $prices === $sorted);
$res = api("GET", "/api/items?sort=recent");
check("sort=recent puts the newest listing (item-06) first", ids($res)[0] === "item-06", ids($res));

$res = api("GET", "/api/items?sort=featured&explain=1");
check("featured puts pinned item-01 first", ids($res)[0] === "item-01", ids($res));
check("explain=1 adds a featured_score breakdown", isset($res["body"]["items"][0]["featured_score"]["total"], $res["body"]["items"][0]["featured_score"]["freshness"]));
$firstThreeStores = array_map(fn($i) => $i["store"]["store_id"], array_slice($res["body"]["items"], 1, 3));
check("after pinned items, the first round mixes all three stores", count(array_unique($firstThreeStores)) === 3, $firstThreeStores);
$held = array_values(array_filter($res["body"]["items"], fn($i) => $i["item_id"] === "item-10"))[0];
check("held item gets the hold penalty", $held["featured_score"]["held"] < 0);
$res = api("GET", "/api/items");
check("no featured_score without explain", !isset($res["body"]["items"][0]["featured_score"]));

$res = api("GET", "/api/items?status=sold");
check("status=sold lists sold pieces", ids($res) === ["item-09"], ids($res));
$res = api("GET", "/api/items?sort=cheapest&category=hats&status=removed");
check("bad sort, category and status return 400 with all three errors", $res["status"] === 400 && count(array_intersect(errorCodes($res), ["INVALID_SORT", "INVALID_CATEGORY", "INVALID_STATUS"])) === 3, $res["body"]);
check("errors carry a field name", in_array("sort", errorFields($res)) && in_array("category", errorFields($res)));
$res = api("POST", "/api/items");
check("POST to a GET endpoint returns 405", $res["status"] === 405 && errorCodes($res) === ["METHOD_NOT_ALLOWED"]);

section("Catalog: item, filter options, stores");
$res = api("GET", "/api/item?item_id=item-01");
check("GET /api/item returns the item with full store details", $res["status"] === 200 && $res["body"]["item"]["store"]["hours_display"] === "Mon–Sat 11 am–7 pm · Sun 12–6 pm", $res["body"]["item"]["store"] ?? $res);
$res = api("GET", "/api/item?item_id=item-09");
check("sold items are still returned with status sold", $res["status"] === 200 && $res["body"]["item"]["status"] === "sold" && $res["body"]["item"]["is_bookable"] === false);
$res = api("GET", "/api/item?item_id=item-99");
check("unknown item returns 404 ITEM_NOT_FOUND", $res["status"] === 404 && errorCodes($res) === ["ITEM_NOT_FOUND"]);
$res = api("GET", "/api/item");
check("missing item_id returns 400", $res["status"] === 400 && errorCodes($res) === ["ITEM_ID_REQUIRED"]);

$res = api("GET", "/api/filter-options");
check("filter options list 3 stores and the sort choices", count($res["body"]["stores"]) === 3 && count($res["body"]["sorts"]) === 4);
$outerwear = array_values(array_filter($res["body"]["categories"], fn($c) => $c["value"] === "outerwear"))[0];
check("category counts skip sold pieces (5 outerwear listed)", $outerwear["item_count"] === 5, $outerwear);

$res = api("GET", "/api/stores");
$hours = array_column($res["body"]["stores"], "hours_display", "store_id");
check("GET /api/stores returns 3 stores", $res["body"]["count"] === 3);
check("hours_display matches the store pages", $hours["juniper-thread"] === "Daily 11 am–6 pm" && $hours["north-loop"] === "Tue–Sun 10 am–6 pm · Closed Mon", $hours);
$res = api("GET", "/api/store?store_id=north-loop");
check("GET /api/store includes the store's items", $res["status"] === 200 && count($res["body"]["store"]["items"]) === 3, $res["body"]["store"]["item_count"] ?? $res);
$res = api("GET", "/api/store?store_id=nope");
check("unknown store returns 404", $res["status"] === 404 && errorCodes($res) === ["STORE_NOT_FOUND"]);

// ---------- Favorites ----------

section("Favorites");
$res = api("POST", "/api/create-visitor");
$visitor = $res["body"]["visitor_token"] ?? "";
check("POST /api/create-visitor returns 201 and a token", $res["status"] === 201 && str_starts_with($visitor, "v_"));
$v = ["X-Visitor-Token" => $visitor];

$res = api("GET", "/api/favorites");
check("favorites without a token returns 401", $res["status"] === 401 && errorCodes($res) === ["VISITOR_TOKEN_REQUIRED"]);
$res = api("GET", "/api/favorites", null, ["X-Visitor-Token" => "v_fake"]);
check("favorites with an unknown token returns 401", $res["status"] === 401 && errorCodes($res) === ["VISITOR_TOKEN_INVALID"]);
$res = api("GET", "/api/favorites", null, $v);
check("new visitor starts with no favorites", $res["status"] === 200 && $res["body"]["count"] === 0);

$res = api("POST", "/api/add-favorite", ["item_id" => "item-03"], $v);
check("add-favorite saves a piece", $res["status"] === 200 && $res["body"]["is_favorite"] === true && $res["body"]["already_saved"] === false);
$res = api("POST", "/api/add-favorite", ["item_id" => "item-03"], $v);
check("saving twice is not an error", $res["status"] === 200 && $res["body"]["already_saved"] === true);
api("POST", "/api/add-favorite", ["item_id" => "item-06"], $v);
$res = api("POST", "/api/add-favorite", ["item_id" => "item-09"], $v);
check("sold pieces can't be saved", $res["status"] === 409 && errorCodes($res) === ["ITEM_SOLD"]);
$res = api("POST", "/api/add-favorite", ["item_id" => "item-99"], $v);
check("unknown piece returns 404", $res["status"] === 404);
$res = api("GET", "/api/favorites", null, $v);
check("favorites list has both saved pieces", $res["body"]["count"] === 2 && in_array("item-03", ids($res)));
$res = api("GET", "/api/items", null, $v);
$byId = array_column($res["body"]["items"], null, "item_id");
check("items include is_favorite when a token is sent", $byId["item-03"]["is_favorite"] === true && $byId["item-01"]["is_favorite"] === false);
$res = api("DELETE", "/api/remove-favorite", ["item_id" => "item-06"], $v);
check("remove-favorite removes it", $res["status"] === 200 && $res["body"]["removed"] === true);
$res = api("DELETE", "/api/remove-favorite", ["item_id" => "item-06"], $v);
check("removing again is not an error", $res["status"] === 200 && $res["body"]["removed"] === false);

// ---------- Availability and booking ----------

section("Availability");
$res = api("GET", "/api/availability?store_id=juniper-thread&date=$tomorrow");
$slots = array_column($res["body"]["slots"] ?? [], null, "time");
check("Juniper & Thread has hourly slots from 11:00 to 17:00", array_keys($slots) === ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], array_keys($slots));
check("the seeded 2:00 pm slot shows as fully booked", ($slots["14:00"]["reason"] ?? null) === "FULLY_BOOKED" && $slots["14:00"]["label"] === "2:00 pm, fully booked", $slots["14:00"] ?? null);
$res = api("GET", "/api/availability?store_id=north-loop&date=$nextMonday");
check("North Loop is closed on Mondays", $res["body"]["closed"] === true && $res["body"]["slots"] === []);
$res = api("GET", "/api/availability?item_id=item-02&date=$tomorrow");
check("item_id works instead of store_id", $res["status"] === 200 && $res["body"]["store_id"] === "juniper-thread");
$res = api("GET", "/api/availability?store_id=juniper-thread&date=$yesterday");
check("past dates are rejected", $res["status"] === 400 && errorCodes($res) === ["DATE_IN_PAST"]);
$res = api("GET", "/api/availability?store_id=juniper-thread&date=$tooFar");
check("dates past the booking window are rejected", $res["status"] === 400 && errorCodes($res) === ["DATE_OUT_OF_RANGE"]);
$res = api("GET", "/api/availability?store_id=juniper-thread&date=2026-02-30");
check("impossible dates are rejected", $res["status"] === 400 && errorCodes($res) === ["DATE_INVALID"]);

section("Booking");
$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-02"]]);
check("missing fields return every error at once", $res["status"] === 400 && errorFields($res) === ["name", "email", "date", "time"], $res["body"]);
check("error messages match the booking form copy", ($res["body"]["errors"][0]["message"] ?? "") === "Please enter your name.");
$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-02", "name" => "Test", "email" => "not-an-email", "date" => $tomorrow, "time" => "12:00"]]);
check("bad email is caught", $res["status"] === 400 && errorCodes($res) === ["EMAIL_INVALID"]);
$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-05", "name" => "Test", "email" => "t@example.com", "date" => $tomorrow, "time" => "14:00"]]);
check("a fully booked slot returns 409 SLOT_UNAVAILABLE on the time field", $res["status"] === 409 && errorCodes($res) === ["SLOT_UNAVAILABLE"] && errorFields($res) === ["time"], $res["body"]);
$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-02", "name" => "Test", "email" => "t@example.com", "date" => $tomorrow, "time" => "14:30"]]);
check("a time that isn't a slot returns TIME_INVALID", $res["status"] === 400 && errorCodes($res) === ["TIME_INVALID"]);
$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-10", "name" => "Test", "email" => "t@example.com", "date" => $tomorrow, "time" => "12:00"]]);
check("held pieces can't be booked", $res["status"] === 409 && errorCodes($res) === ["ITEM_UNAVAILABLE"]);
$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-09", "name" => "Test", "email" => "t@example.com", "date" => $tomorrow, "time" => "12:00"]]);
check("sold pieces can't be booked", $res["status"] === 409 && errorCodes($res) === ["ITEM_UNAVAILABLE"]);

$res = api("POST", "/api/create-booking", ["booking" => [
    "item_id" => "item-02", "name" => "Test Shopper", "email" => "test@example.com",
    "date" => $inThreeDays, "time" => "12:00", "notes" => "Checking the fit.",
]], $v);
$bookingId = $res["body"]["booking_id"] ?? 0;
$code = $res["body"]["confirmation_code"] ?? "";
check("a valid booking returns 201 with a confirmation code", $res["status"] === 201 && preg_match('/^RT-[A-Z2-9]{6}$/', $code) === 1, $res["body"]);
check("the booking echoes item, store and readable date/time", ($res["body"]["booking"]["store"]["name"] ?? "") === "Juniper & Thread" && $res["body"]["booking"]["time_label"] === "12:00 pm");

$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-02", "name" => "Someone Else", "email" => "else@example.com", "date" => $inThreeDays, "time" => "12:00"]]);
check("the same piece can't be booked twice at the same time", $res["status"] === 409 && ($res["body"]["errors"][0]["message"] ?? "") === "Someone already booked this piece for that time. Choose another time.", $res["body"]);
$res = api("GET", "/api/availability?item_id=item-02&date=$inThreeDays");
$slots = array_column($res["body"]["slots"], null, "time");
check("availability for that piece shows ITEM_BOOKED", $slots["12:00"]["reason"] === "ITEM_BOOKED");

$res = api("GET", "/api/booking?booking_id=$bookingId&confirmation_code=" . urlencode($code));
check("GET /api/booking works with the confirmation code", $res["status"] === 200 && $res["body"]["booking"]["booking_id"] === $bookingId);
$res = api("GET", "/api/booking?booking_id=$bookingId&confirmation_code=" . urlencode(strtolower($code)));
check("confirmation codes are not case-sensitive", $res["status"] === 200);
$res = api("GET", "/api/booking?booking_id=$bookingId&confirmation_code=RT-WRONG1");
check("a wrong code returns 401 AUTH_FAILURE", $res["status"] === 401 && errorCodes($res) === ["AUTH_FAILURE"]);
$res = api("GET", "/api/booking?booking_id=$bookingId", null, $v);
check("the visitor token that made it also works", $res["status"] === 200);

$res = api("GET", "/api/bookings", null, $v);
check("My Appointments lists the booking", $res["status"] === 200 && $res["body"]["count"] === 1 && $res["body"]["bookings"][0]["can_cancel"] === true);

$res = api("PUT", "/api/modify-booking", ["auth" => ["booking_id" => $bookingId, "confirmation_code" => $code], "booking" => ["date" => $inFourDays, "time" => "15:00"]]);
check("modify-booking reschedules", $res["status"] === 200 && $res["body"]["booking"]["date"] === $inFourDays && $res["body"]["booking"]["time"] === "15:00", $res["body"]);
$res = api("PUT", "/api/modify-booking", ["auth" => ["booking_id" => $bookingId, "confirmation_code" => $code], "booking" => ["notes" => "Updated note"]]);
check("modify-booking can change only the note", $res["status"] === 200 && $res["body"]["booking"]["notes"] === "Updated note");
$res = api("PUT", "/api/modify-booking", ["auth" => ["booking_id" => $bookingId, "confirmation_code" => $code], "booking" => []]);
check("modify-booking with nothing to change returns 400", $res["status"] === 400 && errorCodes($res) === ["NO_CHANGES"]);

$res = api("PUT", "/api/cancel-booking", ["booking_id" => $bookingId], $v);
check("cancel-booking with the visitor token works", $res["status"] === 200 && $res["body"]["booking"]["status"] === "cancelled" && $res["body"]["booking"]["cancel_reason"] === "CUSTOMER_CANCELLED", $res["body"]);
$res = api("PUT", "/api/cancel-booking", ["auth" => ["booking_id" => $bookingId, "confirmation_code" => $code]]);
check("cancelling twice returns 409", $res["status"] === 409 && errorCodes($res) === ["BOOKING_NOT_CANCELLABLE"]);
$res = api("GET", "/api/availability?item_id=item-02&date=$inFourDays");
$slots = array_column($res["body"]["slots"], null, "time");
check("the cancelled slot is free again", $slots["15:00"]["available"] === true);

// ---------- Try-on and impact ----------

section("Try-on and impact");
$res = api("GET", "/api/try-on-options");
check("try-on options list 2 models and the supported pieces", count($res["body"]["models"]) === 2 && in_array("item-01", ids($res)) && !in_array("item-04", ids($res)) && $res["body"]["is_demo"] === true);
$res = api("GET", "/api/try-on-result?model_id=model-01&item_id=item-01");
check("try-on result is a labeled styling reference", $res["status"] === 200 && $res["body"]["is_demo"] === true && $res["body"]["result_type"] === "styling_reference");
$res = api("GET", "/api/try-on-result?model_id=model-01&item_id=item-04");
check("unsupported pieces return 400 TRY_ON_UNSUPPORTED", $res["status"] === 400 && errorCodes($res) === ["TRY_ON_UNSUPPORTED"]);
$res = api("GET", "/api/try-on-result");
check("missing model and item return two errors", $res["status"] === 400 && count($res["body"]["errors"]) === 2);
$res = api("GET", "/api/impact");
$impactBefore = $res["body"];
check("impact counts the one seeded sale", $impactBefore["pieces_rehomed"] === 1 && $impactBefore["is_estimate"] === true && $impactBefore["estimated_co2_kg_saved"] === 20);

// ---------- Store side ----------

section("Store auth and dashboard");
$res = api("POST", "/api/store-login");
check("store-login without headers returns 401", $res["status"] === 401 && errorCodes($res) === ["STORE_AUTH_REQUIRED"]);
$res = api("POST", "/api/store-login", null, ["X-Store-Id" => "second-story", "X-Auth-Code" => "wrong"]);
check("a wrong auth code returns 401 AUTH_FAILURE", $res["status"] === 401 && errorCodes($res) === ["AUTH_FAILURE"]);
$res = api("POST", "/api/store-login", null, $secondStory);
check("correct credentials sign in", $res["status"] === 200 && $res["body"]["store"]["store_id"] === "second-story");
$res = api("GET", "/api/store-summary", null, $secondStory);
check("store-summary counts listings by status", $res["status"] === 200 && $res["body"]["listings"]["available"] === 3 && $res["body"]["listings"]["held"] === 1 && $res["body"]["pinned_count"] === 1, $res["body"]);
$res = api("GET", "/api/store-items", null, $juniper);
check("store-items includes the store's sold pieces", in_array("item-09", ids($res)) && isset($res["body"]["items"][0]["favorites_count"]));

section("Store listings: create, modify, pin");
$res = api("POST", "/api/create-item", ["item" => ["title" => "Test Coat"]], $secondStory);
check("an incomplete listing returns every missing field", $res["status"] === 400 && count(array_intersect(errorFields($res), ["category", "size", "condition", "price_cents", "description", "image_b64", "image_alt"])) === 7, errorFields($res));
$newItem = [
    "title" => "Camel Wool Coat", "category" => "outerwear", "size" => "M", "price_cents" => 8800,
    "condition" => "Very good", "material" => "Wool", "description" => "A camel wool coat with a long straight cut.",
    "image_b64" => $pngDataUrl, "image_alt" => "Image of a camel coat", "try_on_supported" => true,
];
$res = api("POST", "/api/create-item", ["item" => $newItem], $secondStory);
check("alt text starting with \"Image of\" is rejected", $res["status"] === 400 && errorCodes($res) === ["IMAGE_ALT_REDUNDANT"]);
$res = api("POST", "/api/create-item", ["item" => array_merge($newItem, ["image_b64" => "data:image/png;base64," . base64_encode("not an image"), "image_alt" => "Camel wool coat on a hanger"])], $secondStory);
check("a fake image is rejected by content, not by its label", $res["status"] === 400 && errorCodes($res) === ["IMAGE_INVALID"]);
$res = api("POST", "/api/create-item", ["item" => array_merge($newItem, ["image_alt" => "Camel wool coat on a hanger"])], $secondStory);
$newId = $res["body"]["item_id"] ?? "";
check("a valid listing returns 201 with the next item ID", $res["status"] === 201 && $newId === "item-11", $res["body"]);
$imagePath = $res["body"]["item"]["image"] ?? "";
check("the photo is saved to the uploads folder", str_starts_with($imagePath, "uploads/items/item-11-") && is_file("$tmp/uploads/" . basename($imagePath)));
$res = api("GET", "/api/items?sort=recent");
check("the new listing appears first under Recently added", ids($res)[0] === "item-11", ids($res));

$res = api("PUT", "/api/modify-item", ["item_id" => $newId, "item" => ["price_cents" => 7900]], $secondStory);
check("modify-item changes only what's sent", $res["status"] === 200 && $res["body"]["item"]["price_cents"] === 7900 && $res["body"]["item"]["title"] === "Camel Wool Coat");
$res = api("PUT", "/api/modify-item", ["item_id" => $newId, "item" => ["image_b64" => $pngDataUrl]], $secondStory);
check("a new photo without new alt text is rejected", $res["status"] === 400 && errorCodes($res) === ["IMAGE_ALT_REQUIRED"]);
$res = api("PUT", "/api/modify-item", ["item_id" => $newId, "item" => ["image_b64" => $pngDataUrl, "image_alt" => "Camel wool coat, back view"]], $secondStory);
$newPath = $res["body"]["item"]["image"] ?? "";
clearstatcache(); // the server deleted the file in another process; drop PHP's cached is_file() answer
check("replacing the photo deletes the old file", $res["status"] === 200 && $newPath !== $imagePath && !is_file("$tmp/uploads/" . basename($imagePath)) && is_file("$tmp/uploads/" . basename($newPath)));
$res = api("PUT", "/api/modify-item", ["item_id" => $newId, "item" => ["status" => "sold"]], $secondStory);
check("modify-item refuses status changes", $res["status"] === 400 && errorCodes($res) === ["USE_STATUS_ENDPOINT"]);
$res = api("PUT", "/api/modify-item", ["item_id" => "item-03", "item" => ["price_cents" => 100]], $secondStory);
check("a store can't edit another store's item", $res["status"] === 404 && errorCodes($res) === ["ITEM_NOT_FOUND"]);

$res = api("PUT", "/api/set-featured", ["item_id" => $newId, "pinned" => true], $secondStory);
check("pinning a second piece works", $res["status"] === 200 && $res["body"]["pinned"] === true);
$res = api("PUT", "/api/set-featured", ["item_id" => "item-04", "pinned" => true], $secondStory);
check("a third pin hits PIN_LIMIT_REACHED", $res["status"] === 409 && errorCodes($res) === ["PIN_LIMIT_REACHED"]);
$res = api("GET", "/api/items?sort=featured");
check("both pinned pieces lead Featured", count(array_intersect(array_slice(ids($res), 0, 2), ["item-01", "item-11"])) === 2, array_slice(ids($res), 0, 3));
api("PUT", "/api/set-featured", ["item_id" => $newId, "pinned" => false], $secondStory);

section("Inventory: selling a piece");
// A shopper saves and books item-03, then the store sells it
$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-03", "name" => "Fan", "email" => "fan@example.com", "date" => $inThreeDays, "time" => "12:00"]], $v);
$soldBookingId = $res["body"]["booking_id"] ?? 0;
$soldCode = $res["body"]["confirmation_code"] ?? "";
check("setup: a booking for item-03 exists", $res["status"] === 201 || date("D", strtotime($inThreeDays)) === "Mon", $res["body"]);

$res = api("PUT", "/api/update-item-status", ["item_id" => "item-03", "status" => "sold"], $secondStory);
check("another store can't mark it sold", $res["status"] === 404);
$res = api("PUT", "/api/update-item-status", ["item_id" => "item-03", "status" => "gone"], $northLoop);
check("an unknown status returns 400", $res["status"] === 400 && errorCodes($res) === ["INVALID_STATUS"]);
$res = api("PUT", "/api/update-item-status", ["item_id" => "item-03", "status" => "sold"], $northLoop);
check("marking it sold returns the cancelled bookings", $res["status"] === 200 && $res["body"]["cancelled_bookings"] === ($soldBookingId ? [$soldBookingId] : []) && $res["body"]["item"]["sold_at"] !== null, $res["body"]);

$res = api("GET", "/api/items");
check("after a refresh, Explore no longer lists the sold piece", !in_array("item-03", ids($res)) && $res["body"]["count"] === 9, ids($res));
$res = api("GET", "/api/item?item_id=item-03");
check("its detail page still loads with status sold", $res["status"] === 200 && $res["body"]["item"]["status_label"] === "Sold");
$res = api("GET", "/api/favorites", null, $v);
$fav = array_values(array_filter($res["body"]["items"], fn($i) => $i["item_id"] === "item-03"))[0] ?? null;
check("it stays in Favorites, flagged sold", $fav !== null && $fav["status"] === "sold");
if ($soldBookingId) {
    $res = api("GET", "/api/booking?booking_id=$soldBookingId&confirmation_code=" . urlencode($soldCode));
    check("the shopper's booking shows why it was cancelled", $res["body"]["booking"]["status"] === "cancelled" && $res["body"]["booking"]["cancel_reason"] === "ITEM_SOLD" && str_contains($res["body"]["booking"]["cancel_message"], "sold"));
}
$res = api("POST", "/api/create-booking", ["booking" => ["item_id" => "item-03", "name" => "Late", "email" => "late@example.com", "date" => $inThreeDays, "time" => "13:00"]]);
check("new bookings for it are refused", $res["status"] === 409 && errorCodes($res) === ["ITEM_UNAVAILABLE"]);
$res = api("GET", "/api/impact");
check("the impact stat goes up", $res["body"]["pieces_rehomed"] === $impactBefore["pieces_rehomed"] + 1 && $res["body"]["estimated_co2_kg_saved"] > $impactBefore["estimated_co2_kg_saved"]);

$res = api("PUT", "/api/update-item-status", ["item_id" => "item-04", "status" => "held"], $secondStory);
check("marking a piece held works", $res["status"] === 200 && $res["body"]["item"]["status"] === "held");
$res = api("PUT", "/api/update-item-status", ["item_id" => "item-04", "status" => "available"], $secondStory);
check("and it can be made available again", $res["status"] === 200 && $res["body"]["item"]["is_bookable"] === true);

$res = api("DELETE", "/api/delete-item", ["item_id" => $newId], $secondStory);
check("delete-item archives the listing", $res["status"] === 200 && $res["body"]["status"] === "removed");
$res = api("GET", "/api/item?item_id=$newId");
check("archived listings disappear from the public site", $res["status"] === 404);
$res = api("GET", "/api/store-items?status=removed", null, $secondStory);
check("but stay in the store's inventory", ids($res) === [$newId]);
$res = api("DELETE", "/api/delete-item", ["item_id" => $newId], $secondStory);
check("archiving twice returns 409", $res["status"] === 409 && errorCodes($res) === ["ALREADY_REMOVED"]);

section("Store bookings, hours and closures");
$res = api("GET", "/api/store-bookings", null, $juniper);
check("store-bookings lists the seeded appointments with contact details", $res["status"] === 200 && $res["body"]["count"] >= 2 && isset($res["body"]["bookings"][0]["email"]));
$seededBooking = $res["body"]["bookings"][0]["booking_id"] ?? 0;
$res = api("GET", "/api/store-bookings", null, $secondStory);
$juniperIds = array_column(api("GET", "/api/store-bookings", null, $juniper)["body"]["bookings"], "booking_id");
check("a store only sees its own bookings", count(array_intersect(array_column($res["body"]["bookings"], "booking_id"), $juniperIds)) === 0);
$res = api("PUT", "/api/update-booking-status", ["booking_id" => $seededBooking, "status" => "completed"], $secondStory);
check("a store can't update another store's booking", $res["status"] === 404);
$res = api("PUT", "/api/update-booking-status", ["booking_id" => $seededBooking, "status" => "no_show", "item_sold" => true], $juniper);
check("item_sold requires status completed", $res["status"] === 400 && errorCodes($res) === ["ITEM_SOLD_NEEDS_COMPLETED"]);
$res = api("PUT", "/api/update-booking-status", ["booking_id" => $seededBooking, "status" => "completed", "item_sold" => true, "store_message" => "Thanks for stopping by!"], $juniper);
check("completed + item_sold records the visit and the sale together", $res["status"] === 200 && $res["body"]["booking"]["status"] === "completed" && $res["body"]["booking"]["item"]["status"] === "sold", $res["body"]);

$res = api("PUT", "/api/modify-store", ["store" => ["hours" => ["mon" => ["open" => "18:00", "close" => "10:00"]]]], $northLoop);
check("invalid hours are rejected", $res["status"] === 400 && errorCodes($res) === ["HOURS_INVALID"]);
$res = api("PUT", "/api/modify-store", ["store" => ["auth_hash" => "x"]], $northLoop);
check("protected fields can't be changed", $res["status"] === 400 && errorCodes($res) === ["UNKNOWN_FIELD"]);
$newHours = ["mon" => ["open" => "12:00", "close" => "16:00"], "tue" => ["open" => "10:00", "close" => "18:00"], "wed" => ["open" => "10:00", "close" => "18:00"],
             "thu" => ["open" => "10:00", "close" => "18:00"], "fri" => ["open" => "10:00", "close" => "18:00"], "sat" => ["open" => "10:00", "close" => "18:00"], "sun" => ["open" => "10:00", "close" => "18:00"]];
$res = api("PUT", "/api/modify-store", ["store" => ["hours" => $newHours, "slot_minutes" => 30]], $northLoop);
check("valid hours update hours_display", $res["status"] === 200 && $res["body"]["store"]["hours_display"] === "Mon 12–4 pm · Tue–Sun 10 am–6 pm", $res["body"]["store"]["hours_display"] ?? $res);
$res = api("GET", "/api/availability?store_id=north-loop&date=$nextMonday");
check("North Loop now has 30-minute Monday slots", $res["body"]["closed"] === false && count($res["body"]["slots"]) === 8 && $res["body"]["slots"][1]["time"] === "12:30");

$res = api("POST", "/api/create-closure", ["closure" => ["date" => $nextMonday, "start_time" => "13:00", "end_time" => "14:00", "reason" => "Staff meeting"]], $northLoop);
$closureId = $res["body"]["closure"]["closure_id"] ?? 0;
check("a partial-day closure is created", $res["status"] === 201 && $res["body"]["closure"]["all_day"] === false);
$res = api("GET", "/api/availability?store_id=north-loop&date=$nextMonday");
$slots = array_column($res["body"]["slots"], null, "time");
check("slots inside the closure show CLOSED, others stay open", $slots["13:00"]["reason"] === "CLOSED" && $slots["13:30"]["reason"] === "CLOSED" && $slots["12:00"]["available"] === true);
$res = api("POST", "/api/create-closure", ["closure" => ["date" => $nextMonday, "start_time" => "13:00"]], $northLoop);
check("a closure with only a start time is rejected", $res["status"] === 400 && errorCodes($res) === ["TIME_RANGE_INCOMPLETE"]);
$res = api("GET", "/api/store-closures", null, $northLoop);
check("store-closures lists it", $res["body"]["count"] === 1);
$res = api("DELETE", "/api/delete-closure", ["closure_id" => $closureId], $juniper);
check("another store can't delete it", $res["status"] === 404);
$res = api("DELETE", "/api/delete-closure", ["closure_id" => $closureId], $northLoop);
check("the owning store can delete it", $res["status"] === 200);
$res = api("POST", "/api/create-closure", ["closure" => ["date" => $nextMonday, "reason" => "Holiday"]], $northLoop);
$res = api("GET", "/api/availability?store_id=north-loop&date=$nextMonday");
check("an all-day closure closes the whole day with its reason", $res["body"]["closed"] === true && $res["body"]["closed_reason"] === "Holiday");

// ---------- Routing and security ----------

section("Routing, CORS and file protection");
$res = api("GET", "/api/does-not-exist");
check("unknown endpoints return a JSON 404", $res["status"] === 404 && errorCodes($res) === ["ENDPOINT_NOT_FOUND"]);
$res = api("GET", "/api/items.php");
check("the .php suffix also works", $res["status"] === 200);
foreach (["/config.php", "/data/sample-store-auth.json", "/api/helpers", "/api/database.php", "/tests/run-tests.php", "/server-reset.php", "/.gitignore"] as $path) {
    $res = api("GET", $path);
    check("$path is blocked", $res["status"] === 403, $res["status"]);
}
$res = api("GET", "/index.html");
check("static pages are still served", $res["status"] === 200);
$res = api("GET", "/api-config.js");
check("api-config.js is served as a static file, not caught by the /api route", $res["status"] === 200);
$res = api("OPTIONS", "/api/create-booking", null, ["Origin" => "https://astran20.github.io", "Access-Control-Request-Method" => "POST"]);
check("CORS preflight from the GitHub Pages origin is allowed", $res["status"] === 204 && stripos($res["headers"], "Access-Control-Allow-Origin: https://astran20.github.io") !== false);
$res = api("GET", "/api/items", null, ["Origin" => "https://evil.example"]);
check("other origins get no CORS header", stripos($res["headers"], "Access-Control-Allow-Origin") === false);
$res = api("POST", "/api/add-favorite", null, $v);
check("an empty body gives a clear error, not a crash", $res["status"] === 400 && errorCodes($res) === ["ITEM_ID_REQUIRED"]);

$ch = curl_init("$base/api/create-booking");
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => "{not json", CURLOPT_RETURNTRANSFER => true]);
$body = json_decode(curl_exec($ch), true);
check("malformed JSON returns INVALID_JSON", ($body["errors"][0]["error_code"] ?? "") === "INVALID_JSON");

$log = @file_get_contents("$tmp/server.log") ?: "";
check("the server logged no PHP warnings or errors", !preg_match('/PHP (Warning|Notice|Fatal|Deprecated)/', $log), implode("\n", array_slice(preg_grep('/PHP (Warning|Notice|Fatal|Deprecated)/', explode("\n", $log)), 0, 5)));

// ---------- Summary ----------

$total = $passed + count($failed);
echo "\n" . ($failed ? "\033[31m" : "\033[32m") . "$passed of $total checks passed\033[0m\n";
foreach ($failed as $f) echo "  ✗ $f\n";
exit($failed ? 1 : 0);
