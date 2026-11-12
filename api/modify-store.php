<?php
/*
 PUT /api/modify-store
 Edits the store's public details, opening hours and booking slots. Send only what changes.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["PUT"]);

$store = requireStore();
$body = readJSONBody();
$input = is_array($body["store"] ?? null) ? $body["store"] : [];
if (count($input) === 0) {
    fail(400, "NO_CHANGES", "Send the fields to change inside \"store\".");
}

$fields = [];
$errors = [];
$limits = ["name" => 80, "neighborhood" => 80, "address" => 120, "city" => 80, "description" => 500];
foreach ($limits as $field => $max) {
    if (!array_key_exists($field, $input)) continue;
    $value = stringField($input, $field);
    if ($value === null || mb_strlen($value) > $max) {
        $errors[] = new APIError(strtoupper($field) . "_INVALID", ucfirst($field) . " is required and can be up to $max characters.", $field);
    } else {
        $fields[$field] = $value;
    }
}
if (array_key_exists("image_alt", $input)) {
    $alt = stringField($input, "image_alt");
    $altError = checkAltText($alt);
    if ($altError) $errors[] = $altError;
    else $fields["image_alt"] = $alt;
}
if (array_key_exists("hours", $input)) {
    $hours = $input["hours"];
    $valid = is_array($hours);
    $clean = [];
    foreach (WEEKDAYS as $day) {
        if (!$valid) break;
        $range = $hours[$day] ?? null;
        if ($range === null) {
            $clean[$day] = null;
        } elseif (is_array($range) && isValidTime($range["open"] ?? null) && isValidTime($range["close"] ?? null) && $range["open"] < $range["close"]) {
            $clean[$day] = ["open" => $range["open"], "close" => $range["close"]];
        } else {
            $valid = false;
        }
    }
    if (!$valid) {
        $errors[] = new APIError("HOURS_INVALID", "Hours need mon through sun, each either null (closed) or {\"open\": \"HH:MM\", \"close\": \"HH:MM\"} with open before close.", "hours");
    } else {
        $fields["hours_json"] = json_encode($clean);
    }
}
if (array_key_exists("slot_minutes", $input)) {
    if (!in_array($input["slot_minutes"], [15, 20, 30, 45, 60, 90, 120], true)) {
        $errors[] = new APIError("SLOT_MINUTES_INVALID", "slot_minutes must be 15, 20, 30, 45, 60, 90 or 120.", "slot_minutes");
    } else {
        $fields["slot_minutes"] = $input["slot_minutes"];
    }
}
if (array_key_exists("slot_capacity", $input)) {
    if (!is_int($input["slot_capacity"]) || $input["slot_capacity"] < 1 || $input["slot_capacity"] > 20) {
        $errors[] = new APIError("SLOT_CAPACITY_INVALID", "slot_capacity must be a whole number from 1 to 20.", "slot_capacity");
    } else {
        $fields["slot_capacity"] = $input["slot_capacity"];
    }
}
$unknown = array_diff(array_keys($input), array_merge(array_keys($limits), ["image_alt", "hours", "slot_minutes", "slot_capacity"]));
if (count($unknown) > 0) {
    $errors[] = new APIError("UNKNOWN_FIELD", "These fields can't be changed here: " . implode(", ", $unknown) . ".", reset($unknown));
}
if (count($errors) > 0) {
    failMany(400, $errors);
}

$db = getDB();
$sets = implode(", ", array_map(fn($col) => "$col = ?", array_keys($fields)));
$db->prepare("UPDATE stores SET $sets, updated_at = ? WHERE store_id = ?")
   ->execute(array_merge(array_values($fields), [time(), $store["store_id"]]));

sendJSON(200, [
    "success" => true,
    "message" => "Store details updated. Existing bookings are kept even if they now fall outside your hours.",
    "store"   => formatStore(fetchStore($db, $store["store_id"])),
]);
