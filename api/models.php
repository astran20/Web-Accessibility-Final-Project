<?php
/*
 models.php
 Turns database rows into the JSON objects described in api.md, and holds the shared
 business logic: featured ordering, time slot availability, inventory status changes,
 listing validation, photo uploads and the impact stat.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/../config.php";

const ITEM_STATUS_LABELS = [
    "available" => "Available",
    "held"      => "On hold",
    "sold"      => "Sold",
    "removed"   => "Removed",
];

const BOOKING_STATUS_LABELS = [
    "confirmed" => "Confirmed",
    "completed" => "Completed",
    "no_show"   => "Missed",
    "cancelled" => "Cancelled",
];

const CANCEL_REASON_MESSAGES = [
    "CUSTOMER_CANCELLED" => "You cancelled this appointment.",
    "ITEM_SOLD"          => "This piece sold before your visit, so the appointment was cancelled.",
    "ITEM_REMOVED"       => "The shop removed this listing, so the appointment was cancelled.",
    "STORE_CANCELLED"    => "The shop cancelled this appointment.",
];

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_LABELS = ["mon" => "Mon", "tue" => "Tue", "wed" => "Wed", "thu" => "Thu", "fri" => "Fri", "sat" => "Sat", "sun" => "Sun"];

const ITEM_SELECT = "SELECT i.*, s.name AS store_name, s.neighborhood AS store_neighborhood
                     FROM items i JOIN stores s ON s.store_id = i.store_id";

const BOOKING_SELECT = "SELECT b.*, i.title AS item_title, i.image AS item_image, i.image_alt AS item_image_alt,
                               i.price_cents AS item_price_cents, i.size AS item_size, i.condition AS item_condition,
                               i.status AS item_status, s.name AS store_name, s.address AS store_address,
                               s.city AS store_city, s.hours_json AS store_hours_json
                        FROM bookings b
                        JOIN items i ON i.item_id = b.item_id
                        JOIN stores s ON s.store_id = b.store_id";

// ---------- Small formatters ----------

function todayDate(): string {
    return date("Y-m-d");
}

function isoTime(?int $timestamp): ?string {
    return $timestamp === null ? null : date(DATE_ATOM, $timestamp);
}

function formatPrice(int $cents): string {
    return $cents % 100 === 0 ? "$" . intdiv($cents, 100) : "$" . number_format($cents / 100, 2);
}

// "14:00" -> "2:00 pm"
function timeLabel(string $time): string {
    return date("g:i a", strtotime("2000-01-01 $time"));
}

// "2026-11-13" -> "Friday, November 13"
function dateLabel(string $date): string {
    return date("l, F j", strtotime($date));
}

function timeToMinutes(string $time): int {
    [$h, $m] = array_map("intval", explode(":", $time));
    return $h * 60 + $m;
}

function minutesToTime(int $minutes): string {
    return sprintf("%02d:%02d", intdiv($minutes, 60), $minutes % 60);
}

function weekdayKey(string $date): string {
    return strtolower(date("D", strtotime($date)));
}

// ---------- Stores ----------

// "11:00" -> "11 am", "12:30" -> "12:30 pm"
function shortTime(string $time): string {
    $ts = strtotime("2000-01-01 $time");
    return date("i", $ts) === "00" ? date("g a", $ts) : date("g:i a", $ts);
}

function hoursRangeLabel(array $range): string {
    $open = shortTime($range["open"]);
    $close = shortTime($range["close"]);
    // "12 pm–6 pm" reads better as "12–6 pm"
    if (substr($open, -2) === substr($close, -2)) {
        $open = substr($open, 0, -3);
    }
    return "{$open}–{$close}";
}

// DESC: Builds a readable summary like "Mon–Sat 11 am–7 pm · Sun 12–6 pm" or "Tue–Sun 10 am–6 pm · Closed Mon"
function hoursDisplay(array $hours): string {
    $groups = [];
    foreach (WEEKDAYS as $day) {
        $value = $hours[$day] ?? null;
        $last = count($groups) - 1;
        if ($last >= 0 && $groups[$last]["value"] == $value) {
            $groups[$last]["days"][] = $day;
        } else {
            $groups[] = ["value" => $value, "days" => [$day]];
        }
    }

    $open = [];
    $closed = [];
    foreach ($groups as $g) {
        $first = WEEKDAY_LABELS[$g["days"][0]];
        $lastDay = WEEKDAY_LABELS[end($g["days"])];
        $span = count($g["days"]) === 1 ? $first : "{$first}–{$lastDay}";
        if ($g["value"] === null) {
            $closed[] = $span;
        } else {
            $open[] = (count($g["days"]) === 7 ? "Daily" : $span) . " " . hoursRangeLabel($g["value"]);
        }
    }
    if (count($closed) > 0) {
        $open[] = "Closed " . implode(", ", $closed);
    }
    return implode(" · ", $open);
}

function fetchStore(PDO $db, string $storeId): ?array {
    $stmt = $db->prepare("SELECT * FROM stores WHERE store_id = ?");
    $stmt->execute([$storeId]);
    return $stmt->fetch() ?: null;
}

function formatStore(array $row, ?int $itemCount = null): array {
    $hours = json_decode($row["hours_json"], true);
    $store = [
        "store_id"      => $row["store_id"],
        "name"          => $row["name"],
        "neighborhood"  => $row["neighborhood"],
        "address"       => $row["address"],
        "city"          => $row["city"],
        "description"   => $row["description"],
        "image"         => $row["image"],
        "image_alt"     => $row["image_alt"],
        "hours"         => $hours,
        "hours_display" => hoursDisplay($hours),
        "slot_minutes"  => (int)$row["slot_minutes"],
        "slot_capacity" => (int)$row["slot_capacity"],
        "url"           => "stores.html#store-" . $row["store_id"],
    ];
    if ($itemCount !== null) {
        $store["item_count"] = $itemCount;
    }
    return $store;
}

function formatClosure(array $row): array {
    return [
        "closure_id" => (int)$row["closure_id"],
        "store_id"   => $row["store_id"],
        "date"       => $row["date"],
        "date_label" => dateLabel($row["date"]),
        "all_day"    => $row["start_time"] === null,
        "start_time" => $row["start_time"],
        "end_time"   => $row["end_time"],
        "reason"     => $row["reason"],
    ];
}

// ---------- Items ----------

function fetchItem(PDO $db, string $itemId, bool $includeRemoved = false): ?array {
    $stmt = $db->prepare(ITEM_SELECT . " WHERE i.item_id = ?" . ($includeRemoved ? "" : " AND i.status != 'removed'"));
    $stmt->execute([$itemId]);
    return $stmt->fetch() ?: null;
}

// DESC: Item row -> public Item Object
// REQ: $favoriteIds - item IDs the current visitor has saved (sets "is_favorite"), or null to leave it out
//      $score - featured score breakdown to attach when ?explain=1
function formatItem(array $row, ?array $favoriteIds = null, ?array $score = null): array {
    $item = [
        "item_id"          => $row["item_id"],
        "title"            => $row["title"],
        "store"            => [
            "store_id"     => $row["store_id"],
            "name"         => $row["store_name"],
            "neighborhood" => $row["store_neighborhood"],
        ],
        "category"         => $row["category"],
        "size"             => $row["size"],
        "price_cents"      => (int)$row["price_cents"],
        "price_display"    => formatPrice((int)$row["price_cents"]),
        "condition"        => $row["condition"],
        "material"         => $row["material"],
        "description"      => $row["description"],
        "image"            => $row["image"],
        "image_alt"        => $row["image_alt"],
        "try_on_supported" => (bool)$row["try_on_supported"],
        "status"           => $row["status"],
        "status_label"     => ITEM_STATUS_LABELS[$row["status"]],
        "is_bookable"      => $row["status"] === "available",
        "pinned"           => (bool)$row["pinned"],
        "listed_at"        => isoTime((int)$row["listed_at"]),
        "sold_at"          => isoTime($row["sold_at"] === null ? null : (int)$row["sold_at"]),
        "url"              => "item.html?item_id=" . rawurlencode($row["item_id"]),
    ];
    if ($favoriteIds !== null) {
        $item["is_favorite"] = in_array($row["item_id"], $favoriteIds, true);
    }
    if ($score !== null) {
        $item["featured_score"] = $score;
    }
    return $item;
}

function visitorFavoriteIds(PDO $db, ?string $visitorToken): ?array {
    if ($visitorToken === null) {
        return null;
    }
    $stmt = $db->prepare("SELECT item_id FROM favorites WHERE visitor_token = ?");
    $stmt->execute([$visitorToken]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

// ---------- Featured ordering ----------

// DESC: Scores every item for the "Featured" sort. See "Featured ordering" in api.md.
// RET: Map of item_id => score breakdown
function scoreItems(PDO $db, array $rows, ?string $visitorToken): array {
    $w = FEATURED_WEIGHTS;
    $now = time();

    $favoriteCounts = $db->query("SELECT item_id, COUNT(*) FROM favorites GROUP BY item_id")->fetchAll(PDO::FETCH_KEY_PAIR);
    $stmt = $db->prepare("SELECT item_id, COUNT(*) FROM bookings WHERE created_at >= ? AND status != 'cancelled' GROUP BY item_id");
    $stmt->execute([$now - $w["recent_booking_days"] * 86400]);
    $bookingCounts = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    // Light personalization: sizes and categories this visitor has already saved
    $likedSizes = [];
    $likedCategories = [];
    if ($visitorToken !== null) {
        $stmt = $db->prepare("SELECT i.size, i.category FROM favorites f JOIN items i ON i.item_id = f.item_id WHERE f.visitor_token = ?");
        $stmt->execute([$visitorToken]);
        foreach ($stmt->fetchAll() as $fav) {
            $likedSizes[$fav["size"]] = true;
            $likedCategories[$fav["category"]] = true;
        }
    }

    $scores = [];
    foreach ($rows as $row) {
        $id = $row["item_id"];
        $daysListed = max(0, ($now - (int)$row["listed_at"]) / 86400);
        $parts = [
            "pinned"    => $row["pinned"] ? $w["pinned"] : 0,
            "freshness" => max(0, $w["freshness_max"] - $w["freshness_decay_per_day"] * $daysListed),
            "interest"  => $w["favorites"] * log(1 + ($favoriteCounts[$id] ?? 0))
                         + $w["recent_bookings"] * log(1 + ($bookingCounts[$id] ?? 0)),
            "try_on"    => $row["try_on_supported"] ? $w["try_on"] : 0,
            "held"      => $row["status"] === "held" ? $w["held"] : 0,
            "personal"  => (isset($likedSizes[$row["size"]]) || isset($likedCategories[$row["category"]])) ? $w["personal_match"] : 0,
        ];
        $parts = array_map(fn($v) => round($v, 2), $parts);
        $scores[$id] = ["total" => round(array_sum($parts), 2)] + $parts + [
            "favorites"       => (int)($favoriteCounts[$id] ?? 0),
            "recent_bookings" => (int)($bookingCounts[$id] ?? 0),
        ];
    }
    return $scores;
}

// DESC: Orders rows by featured score. Pinned items lead; everything else is
//       interleaved round-robin by store so no single shop fills the first row.
function sortFeatured(array $rows, array $scores): array {
    $byScore = function ($a, $b) use ($scores) {
        return [$scores[$b["item_id"]]["total"], $a["item_id"]] <=> [$scores[$a["item_id"]]["total"], $b["item_id"]];
    };
    usort($rows, $byScore);

    $pinned = array_values(array_filter($rows, fn($r) => (bool)$r["pinned"]));
    $rest = array_values(array_filter($rows, fn($r) => !$r["pinned"]));

    $queues = [];
    foreach ($rest as $row) {
        $queues[$row["store_id"]][] = $row;
    }
    $ordered = $pinned;
    while (count($queues) > 0) {
        $round = [];
        foreach ($queues as $storeId => $queue) {
            $round[] = array_shift($queues[$storeId]);
            if (count($queues[$storeId]) === 0) {
                unset($queues[$storeId]);
            }
        }
        usort($round, $byScore);
        array_push($ordered, ...$round);
    }
    return $ordered;
}

// ---------- Availability ----------

// DESC: Works out the bookable time slots for a store on one date
// REQ: $itemId - also mark slots where this item is already booked
//      $excludeBookingId - ignore this booking (used when rescheduling it)
// RET: ["closed" => bool, "closed_reason" => ?string, "slots" => [Slot Object...]]
function computeSlots(PDO $db, array $store, string $date, ?string $itemId = null, ?int $excludeBookingId = null): array {
    $hours = json_decode($store["hours_json"], true);
    $dayHours = $hours[weekdayKey($date)] ?? null;
    if ($dayHours === null) {
        return ["closed" => true, "closed_reason" => "The shop is closed on " . date("l", strtotime($date)) . "s.", "slots" => []];
    }

    $stmt = $db->prepare("SELECT * FROM closures WHERE store_id = ? AND date = ?");
    $stmt->execute([$store["store_id"], $date]);
    $closures = $stmt->fetchAll();
    foreach ($closures as $c) {
        if ($c["start_time"] === null) {
            return ["closed" => true, "closed_reason" => $c["reason"] ?: "The shop is closed that day.", "slots" => []];
        }
    }

    $exclude = $excludeBookingId ?? 0;
    $stmt = $db->prepare("SELECT time, COUNT(*) FROM bookings WHERE store_id = ? AND date = ? AND status = 'confirmed' AND booking_id != ? GROUP BY time");
    $stmt->execute([$store["store_id"], $date, $exclude]);
    $bookedCounts = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $itemBookedTimes = [];
    if ($itemId !== null) {
        $stmt = $db->prepare("SELECT time FROM bookings WHERE item_id = ? AND date = ? AND status = 'confirmed' AND booking_id != ?");
        $stmt->execute([$itemId, $date, $exclude]);
        $itemBookedTimes = array_flip($stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    $slotMinutes = (int)$store["slot_minutes"];
    $capacity = (int)$store["slot_capacity"];
    $nowMinutes = $date === todayDate() ? timeToMinutes(date("H:i")) : -1;
    $slots = [];
    for ($start = timeToMinutes($dayHours["open"]); $start + $slotMinutes <= timeToMinutes($dayHours["close"]); $start += $slotMinutes) {
        $time = minutesToTime($start);
        $booked = (int)($bookedCounts[$time] ?? 0);
        $reason = null;
        if ($start <= $nowMinutes) {
            $reason = "PAST";
        } else {
            foreach ($closures as $c) {
                if (timeToMinutes($c["start_time"]) < $start + $slotMinutes && timeToMinutes($c["end_time"]) > $start) {
                    $reason = "CLOSED";
                }
            }
            if ($reason === null && $booked >= $capacity) {
                $reason = "FULLY_BOOKED";
            } elseif ($reason === null && isset($itemBookedTimes[$time])) {
                $reason = "ITEM_BOOKED";
            }
        }
        $suffix = ["PAST" => ", already passed", "CLOSED" => ", shop closed", "FULLY_BOOKED" => ", fully booked", "ITEM_BOOKED" => ", this piece is already booked"];
        $slots[] = [
            "time"            => $time,
            "label"           => timeLabel($time) . ($reason ? $suffix[$reason] : ""),
            "available"       => $reason === null,
            "reason"          => $reason,
            "spots_remaining" => max(0, $capacity - $booked),
        ];
    }
    return ["closed" => false, "closed_reason" => null, "slots" => $slots];
}

// ---------- Bookings ----------

function generateConfirmationCode(): string {
    $alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I/L, so it's easy to read aloud
    $code = "RT-";
    for ($i = 0; $i < 6; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $code;
}

function fetchBooking(PDO $db, int $bookingId): ?array {
    $stmt = $db->prepare(BOOKING_SELECT . " WHERE b.booking_id = ?");
    $stmt->execute([$bookingId]);
    return $stmt->fetch() ?: null;
}

function formatBooking(array $row): array {
    $reason = $row["cancel_reason"];
    $message = $reason ? CANCEL_REASON_MESSAGES[$reason] ?? null : null;
    return [
        "booking_id"     => (int)$row["booking_id"],
        "status"         => $row["status"],
        "status_label"   => BOOKING_STATUS_LABELS[$row["status"]],
        "is_upcoming"    => $row["status"] === "confirmed" && $row["date"] >= todayDate(),
        "can_cancel"     => $row["status"] === "confirmed" && $row["date"] >= todayDate(),
        "cancel_reason"  => $reason,
        "cancel_message" => $message,
        "store_message"  => $row["store_message"],
        "date"           => $row["date"],
        "date_label"     => dateLabel($row["date"]),
        "time"           => $row["time"],
        "time_label"     => timeLabel($row["time"]),
        "name"           => $row["name"],
        "email"          => $row["email"],
        "notes"          => $row["notes"],
        "item"           => [
            "item_id"       => $row["item_id"],
            "title"         => $row["item_title"],
            "image"         => $row["item_image"],
            "image_alt"     => $row["item_image_alt"],
            "price_display" => formatPrice((int)$row["item_price_cents"]),
            "size"          => $row["item_size"],
            "condition"     => $row["item_condition"],
            "status"        => $row["item_status"],
            "url"           => "item.html?item_id=" . rawurlencode($row["item_id"]),
        ],
        "store"          => [
            "store_id"      => $row["store_id"],
            "name"          => $row["store_name"],
            "address"       => $row["store_address"],
            "city"          => $row["store_city"],
            "hours_display" => hoursDisplay(json_decode($row["store_hours_json"], true)),
        ],
        "created_at"     => isoTime((int)$row["created_at"]),
    ];
}

// DESC: Cancels every upcoming confirmed booking for an item
// RET: IDs of the cancelled bookings
function cancelUpcomingBookingsForItem(PDO $db, string $itemId, string $reason): array {
    $stmt = $db->prepare("SELECT booking_id FROM bookings WHERE item_id = ? AND status = 'confirmed' AND date >= ?");
    $stmt->execute([$itemId, todayDate()]);
    $ids = array_map("intval", $stmt->fetchAll(PDO::FETCH_COLUMN));
    if (count($ids) > 0) {
        $placeholders = implode(",", array_fill(0, count($ids), "?"));
        $update = $db->prepare("UPDATE bookings SET status = 'cancelled', cancel_reason = ?, updated_at = ? WHERE booking_id IN ($placeholders)");
        $update->execute(array_merge([$reason, time()], $ids));
    }
    return $ids;
}

// ---------- Inventory ----------

// DESC: Changes an item's status and applies the side effects:
//       sold    -> records sold_at, unpins it, cancels its upcoming bookings (ITEM_SOLD)
//       removed -> unpins it, cancels its upcoming bookings (ITEM_REMOVED)
//       available/held -> clears sold_at
// RET: IDs of bookings that were cancelled
function changeItemStatus(PDO $db, array $item, string $status): array {
    $now = time();
    $cancelled = [];
    if ($status === "sold") {
        $soldAt = $item["status"] === "sold" ? (int)$item["sold_at"] : $now;
        $db->prepare("UPDATE items SET status = 'sold', sold_at = ?, pinned = 0, updated_at = ? WHERE item_id = ?")
           ->execute([$soldAt, $now, $item["item_id"]]);
        $cancelled = cancelUpcomingBookingsForItem($db, $item["item_id"], "ITEM_SOLD");
    } elseif ($status === "removed") {
        $db->prepare("UPDATE items SET status = 'removed', pinned = 0, updated_at = ? WHERE item_id = ?")
           ->execute([$now, $item["item_id"]]);
        $cancelled = cancelUpcomingBookingsForItem($db, $item["item_id"], "ITEM_REMOVED");
    } else {
        $db->prepare("UPDATE items SET status = ?, sold_at = NULL, updated_at = ? WHERE item_id = ?")
           ->execute([$status, $now, $item["item_id"]]);
    }
    return $cancelled;
}

function generateItemId(PDO $db): string {
    $max = 0;
    foreach ($db->query("SELECT item_id FROM items")->fetchAll(PDO::FETCH_COLUMN) as $id) {
        if (preg_match('/^item-(\d+)$/', $id, $m)) {
            $max = max($max, (int)$m[1]);
        }
    }
    return sprintf("item-%02d", $max + 1);
}

// DESC: Validates listing fields for create-item (all required) or modify-item (only the fields sent)
// RET: [cleaned fields, APIError[], decoded image or null]
function validateItemInput(array $input, bool $partial): array {
    $clean = [];
    $errors = [];
    $has = fn($key) => array_key_exists($key, $input);
    $need = fn($key) => !$partial || $has($key);

    if ($need("title")) {
        $title = stringField($input, "title");
        if ($title === null) $errors[] = new APIError("TITLE_REQUIRED", "Give the listing a title.", "title");
        elseif (mb_strlen($title) > 80) $errors[] = new APIError("TITLE_TOO_LONG", "Keep the title to 80 characters or fewer.", "title");
        else $clean["title"] = $title;
    }

    foreach (["category" => ITEM_CATEGORIES, "size" => ITEM_SIZES, "condition" => ITEM_CONDITIONS] as $field => $options) {
        if ($need($field)) {
            $value = stringField($input, $field);
            if ($value === null || !in_array($value, $options, true)) {
                $errors[] = new APIError(strtoupper($field) . "_INVALID", "Choose a $field: " . implode(", ", $options) . ".", $field);
            } else {
                $clean[$field] = $value;
            }
        }
    }

    if ($need("price_cents")) {
        $price = $input["price_cents"] ?? null;
        if (!is_int($price) || $price < 100 || $price > 1000000) {
            $errors[] = new APIError("PRICE_INVALID", "Enter a price between $1 and $10,000, in cents (for example 6800 for $68).", "price_cents");
        } else {
            $clean["price_cents"] = $price;
        }
    }

    if ($has("material")) {
        $material = stringField($input, "material");
        if ($material !== null && mb_strlen($material) > 80) $errors[] = new APIError("MATERIAL_TOO_LONG", "Keep the material to 80 characters or fewer.", "material");
        else $clean["material"] = $material;
    }

    if ($need("description")) {
        $description = stringField($input, "description");
        if ($description === null || mb_strlen($description) < 10) $errors[] = new APIError("DESCRIPTION_REQUIRED", "Add a description of at least 10 characters.", "description");
        elseif (mb_strlen($description) > 1000) $errors[] = new APIError("DESCRIPTION_TOO_LONG", "Keep the description to 1,000 characters or fewer.", "description");
        else $clean["description"] = $description;
    }

    if ($has("try_on_supported")) {
        $tryOn = boolValue($input["try_on_supported"]);
        if ($tryOn === null) $errors[] = new APIError("TRY_ON_INVALID", "try_on_supported must be true or false.", "try_on_supported");
        else $clean["try_on_supported"] = $tryOn ? 1 : 0;
    }

    // A new photo always needs new alt text, so the two travel together
    $image = null;
    $imageSent = $has("image_b64");
    if (!$partial || $imageSent) {
        $image = decodeImage($input["image_b64"] ?? null, $errors);
    }
    if (!$partial || $imageSent || $has("image_alt")) {
        $alt = stringField($input, "image_alt");
        $altError = checkAltText($alt);
        if ($altError) $errors[] = $altError;
        else $clean["image_alt"] = $alt;
    }

    return [$clean, $errors, $image];
}

// DESC: Alt text is required for every listing photo (WCAG 1.1.1)
function checkAltText(?string $alt): ?APIError {
    if ($alt === null) {
        return new APIError("IMAGE_ALT_REQUIRED", "Describe the photo for people using screen readers.", "image_alt");
    }
    if (mb_strlen($alt) < 5 || mb_strlen($alt) > 250) {
        return new APIError("IMAGE_ALT_LENGTH", "Photo descriptions should be between 5 and 250 characters.", "image_alt");
    }
    if (preg_match('/^(an? )?(image|photo|picture|graphic) (of|showing)\b/i', $alt)) {
        return new APIError("IMAGE_ALT_REDUNDANT", "Screen readers already announce that this is an image. Start with what the photo shows, for example \"Brown leather jacket on a hanger\".", "image_alt");
    }
    return null;
}

// DESC: Decodes and checks a base64 data URL. Adds to $errors when invalid.
// RET: ["bytes" => string, "extension" => string] or null
function decodeImage($dataUrl, array &$errors): ?array {
    if (!is_string($dataUrl) || trim($dataUrl) === "") {
        $errors[] = new APIError("IMAGE_REQUIRED", "Add a photo of the piece.", "image_b64");
        return null;
    }
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,(.+)$#s', trim($dataUrl), $m)) {
        $errors[] = new APIError("IMAGE_INVALID", "Upload a JPG, PNG or WEBP photo.", "image_b64");
        return null;
    }
    $bytes = base64_decode($m[2], true);
    if ($bytes === false) {
        $errors[] = new APIError("IMAGE_INVALID", "The photo couldn't be read. Try uploading it again.", "image_b64");
        return null;
    }
    if (strlen($bytes) > MAX_IMAGE_BYTES) {
        $errors[] = new APIError("IMAGE_TOO_LARGE", "Photos can be up to " . (MAX_IMAGE_BYTES / 1024 / 1024) . " MB.", "image_b64");
        return null;
    }
    // Trust the file's contents, not the label in the data URL
    $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
    $extensions = ["image/jpeg" => "jpg", "image/png" => "png", "image/webp" => "webp"];
    if (!isset($extensions[$mime]) || @getimagesizefromstring($bytes) === false) {
        $errors[] = new APIError("IMAGE_INVALID", "Upload a JPG, PNG or WEBP photo.", "image_b64");
        return null;
    }
    return ["bytes" => $bytes, "extension" => $extensions[$mime]];
}

// DESC: Writes an uploaded photo to UPLOAD_DIR
// RET: Public path to the image, for example "uploads/items/item-09-3fa2c1.jpg"
function saveItemImage(array $image, string $itemId): string {
    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0775, true);
    }
    // A fresh suffix on every upload, so browsers never show a cached old photo
    $filename = $itemId . "-" . bin2hex(random_bytes(3)) . "." . $image["extension"];
    if (file_put_contents(UPLOAD_DIR . "/" . $filename, $image["bytes"]) === false) {
        throw new RuntimeException("Could not write uploaded image to " . UPLOAD_DIR);
    }
    return UPLOAD_URL_PATH . "/" . $filename;
}

// DESC: Deletes a previously uploaded photo. Sample images in assets/ are never touched.
function deleteUploadedImage(?string $path): void {
    $prefix = UPLOAD_URL_PATH . "/";
    if ($path === null || !str_starts_with($path, $prefix)) {
        return;
    }
    $file = UPLOAD_DIR . "/" . basename($path);
    if (is_file($file)) {
        unlink($file);
    }
}

// ---------- Impact ----------

function computeImpact(PDO $db): array {
    $soldByCategory = $db->query("SELECT category, COUNT(*) FROM items WHERE status = 'sold' GROUP BY category")->fetchAll(PDO::FETCH_KEY_PAIR);
    $co2 = 0;
    $water = 0;
    foreach ($soldByCategory as $category => $count) {
        $estimate = IMPACT_ESTIMATES[$category] ?? ["co2_kg" => 0, "water_liters" => 0];
        $co2 += $estimate["co2_kg"] * $count;
        $water += $estimate["water_liters"] * $count;
    }
    return [
        "pieces_rehomed"                => (int)array_sum($soldByCategory),
        "try_ons_booked"                => (int)$db->query("SELECT COUNT(*) FROM bookings WHERE status != 'cancelled'")->fetchColumn(),
        "active_listings"               => (int)$db->query("SELECT COUNT(*) FROM items WHERE status IN ('available', 'held')")->fetchColumn(),
        "stores"                        => (int)$db->query("SELECT COUNT(*) FROM stores")->fetchColumn(),
        "estimated_co2_kg_saved"        => $co2,
        "estimated_water_liters_saved"  => $water,
        "is_estimate"                   => true,
        "methodology"                   => "Each sold piece counts as one garment kept in use. CO2 and water figures are rough per-garment averages by category for a classroom demo, not measured values.",
        "generated_at"                  => isoTime(time()),
    ];
}
