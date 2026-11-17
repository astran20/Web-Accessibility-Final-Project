<?php
/*
 helpers.php
 Shared objects and functions so every endpoint answers the same way.
 Every endpoint starts with:

     require_once __DIR__ . "/helpers.php";
     startEndpoint(["GET"]);

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/../config.php";
require_once __DIR__ . "/database.php";
require_once __DIR__ . "/models.php";

date_default_timezone_set(APP_TIMEZONE);

// ---------- Objects ----------

// DESC: Standardized error object
// REQ: error_code - no-spaces textual error code
//      message - user-readable message, safe to show on the page
//      field - name of the form field the error belongs to, or null
class APIError implements JsonSerializable {
    public function __construct(
        public string $error_code,
        public string $message,
        public ?string $field = null
    ) {}

    public function jsonSerialize(): array {
        return ["error_code" => $this->error_code, "field" => $this->field, "message" => $this->message];
    }
}

// DESC: Thrown anywhere in an endpoint to stop and answer with errors
class APIException extends Exception {
    public function __construct(public int $status, public array $errors) {
        parent::__construct($errors[0]->message ?? "API error");
    }
}

// fail(), failMany() and sendJSON() never return: they throw or exit. They're typed void rather
// than never because never needs PHP 8.1, and the SCU engineering server runs 8.0.

// DESC: Stops the endpoint with a single error
function fail(int $status, string $code, string $message, ?string $field = null): void {
    throw new APIException($status, [new APIError($code, $message, $field)]);
}

// DESC: Stops the endpoint with several errors (for example, every invalid form field at once)
function failMany(int $status, array $errors): void {
    throw new APIException($status, $errors);
}

// ---------- Responses ----------

function sendJSON(int $status, $data): void {
    http_response_code($status);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

// DESC: Sets headers, answers CORS preflight, checks the HTTP method and installs the error handler
// REQ: $methods - HTTP methods this endpoint accepts
function startEndpoint(array $methods): void {
    header("Content-Type: application/json; charset=utf-8");
    // The catalog changes when items sell, so nothing is cached: a refresh always shows the current state
    header("Cache-Control: no-store");

    $origin = $_SERVER["HTTP_ORIGIN"] ?? "";
    if ($origin !== "" && in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Vary: Origin");
        header("Access-Control-Allow-Methods: " . implode(", ", array_merge($methods, ["OPTIONS"])));
        header("Access-Control-Allow-Headers: Content-Type, X-Visitor-Token, X-Store-Id, X-Auth-Code");
    }

    set_exception_handler(function (Throwable $e) {
        if ($e instanceof APIException) {
            sendJSON($e->status, ["errors" => $e->errors]);
        }
        error_log("[RETHREAD API] " . $e);
        sendJSON(500, ["errors" => [new APIError("SERVER_ERROR", "Something went wrong on our end. Please try again.")]]);
    });

    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";
    if ($method === "OPTIONS") {
        http_response_code(204);
        exit;
    }
    if (!in_array($method, $methods, true)) {
        header("Allow: " . implode(", ", $methods));
        fail(405, "METHOD_NOT_ALLOWED", "Only " . implode(" or ", $methods) . " is allowed on this endpoint.");
    }
}

// ---------- Reading input ----------

// DESC: Decodes the JSON request body
// RET: Associative array (empty if there is no body)
function readJSONBody(): array {
    $raw = file_get_contents("php://input");
    if ($raw === false || trim($raw) === "") {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail(400, "INVALID_JSON", "The request body must be a JSON object.");
    }
    return $data;
}

// DESC: Reads a trimmed query string parameter. Empty strings count as missing.
function queryParam(string $name, ?string $default = null): ?string {
    $value = $_GET[$name] ?? null;
    if (!is_string($value)) {
        return $default;
    }
    $value = trim($value);
    return $value === "" ? $default : $value;
}

function headerValue(string $name): ?string {
    $key = "HTTP_" . strtoupper(str_replace("-", "_", $name));
    $value = isset($_SERVER[$key]) ? trim($_SERVER[$key]) : "";
    return $value === "" ? null : $value;
}

// DESC: Reads a string field from a decoded body, trimmed. Non-strings count as missing.
function stringField(array $source, string $name): ?string {
    if (!isset($source[$name]) || !(is_string($source[$name]) || is_int($source[$name]))) {
        return null;
    }
    $value = trim((string)$source[$name]);
    return $value === "" ? null : $value;
}

function boolValue($value): ?bool {
    if (is_bool($value)) return $value;
    if ($value === 1 || $value === "1" || $value === "true") return true;
    if ($value === 0 || $value === "0" || $value === "false") return false;
    return null;
}

// ---------- Validation ----------

function isValidDate(?string $date): bool {
    if ($date === null || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) return false;
    $parsed = DateTime::createFromFormat("!Y-m-d", $date);
    return $parsed !== false && $parsed->format("Y-m-d") === $date;
}

function isValidTime(?string $time): bool {
    return $time !== null && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time) === 1;
}

// DESC: Checks a booking or availability date: real, not in the past, inside the booking window
// RET: APIError or null when the date is fine
function checkBookableDate(?string $date, string $field = "date"): ?APIError {
    if ($date === null) {
        return new APIError("DATE_REQUIRED", "Choose a date for your visit.", $field);
    }
    if (!isValidDate($date)) {
        return new APIError("DATE_INVALID", "Enter the date as YYYY-MM-DD.", $field);
    }
    if ($date < todayDate()) {
        return new APIError("DATE_IN_PAST", "Choose today or a later date.", $field);
    }
    $last = date("Y-m-d", strtotime("+" . BOOKING_WINDOW_DAYS . " days"));
    if ($date > $last) {
        return new APIError("DATE_OUT_OF_RANGE", "Bookings open " . BOOKING_WINDOW_DAYS . " days ahead. Choose a date on or before " . dateLabel($last) . ".", $field);
    }
    return null;
}

// ---------- Auth ----------

// DESC: Requires a valid guest visitor token in the X-Visitor-Token header
// RET: The token
function requireVisitor(): string {
    $token = headerValue("X-Visitor-Token");
    if ($token === null) {
        fail(401, "VISITOR_TOKEN_REQUIRED", "This request needs a visitor token. Call POST /api/create-visitor first.");
    }
    if (!visitorExists($token)) {
        fail(401, "VISITOR_TOKEN_INVALID", "This visitor token isn't recognized. Create a new one with POST /api/create-visitor.");
    }
    return $token;
}

// DESC: Returns the visitor token if a valid one was sent, otherwise null (never fails)
function optionalVisitor(): ?string {
    $token = headerValue("X-Visitor-Token");
    return ($token !== null && visitorExists($token)) ? $token : null;
}

function visitorExists(string $token): bool {
    $stmt = getDB()->prepare("SELECT 1 FROM visitors WHERE visitor_token = ?");
    $stmt->execute([$token]);
    return (bool)$stmt->fetchColumn();
}

// DESC: Requires store credentials in the X-Store-Id and X-Auth-Code headers
// RET: The store's database row
function requireStore(): array {
    $storeId = headerValue("X-Store-Id");
    $code = headerValue("X-Auth-Code");
    if ($storeId === null || $code === null) {
        fail(401, "STORE_AUTH_REQUIRED", "Store requests need the X-Store-Id and X-Auth-Code headers.");
    }
    $stmt = getDB()->prepare("SELECT * FROM stores WHERE store_id = ?");
    $stmt->execute([$storeId]);
    $store = $stmt->fetch();
    if (!$store || !password_verify($code, $store["auth_hash"])) {
        fail(401, "AUTH_FAILURE", "Authentication failed for that store ID and auth code. Please try again.");
    }
    return $store;
}

// DESC: Finds a booking the caller is allowed to see or change.
//       Either the booking's confirmation code or the visitor token that made it works.
// RET: The booking's database row
function authorizeBooking(?int $bookingId, ?string $confirmationCode, ?string $visitorToken): array {
    if ($bookingId === null) {
        fail(400, "BOOKING_ID_REQUIRED", "A booking_id is required.", "booking_id");
    }
    if ($confirmationCode === null && $visitorToken === null) {
        fail(401, "BOOKING_AUTH_REQUIRED", "Send the booking's confirmation code or the visitor token that made it.");
    }
    $stmt = getDB()->prepare("SELECT * FROM bookings WHERE booking_id = ?");
    $stmt->execute([$bookingId]);
    $booking = $stmt->fetch();

    $allowed = false;
    if ($booking) {
        if ($confirmationCode !== null && password_verify(strtoupper($confirmationCode), $booking["confirmation_hash"])) {
            $allowed = true;
        } elseif ($visitorToken !== null && $booking["visitor_token"] !== null && hash_equals($booking["visitor_token"], $visitorToken)) {
            $allowed = true;
        }
    }
    if (!$allowed) {
        // Same answer whether the booking is missing or the code is wrong, so IDs can't be probed
        fail(401, "AUTH_FAILURE", "We couldn't find a booking with that ID and confirmation code.");
    }
    return $booking;
}

// ---------- Transactions ----------

// DESC: Runs $work inside a write-locked transaction so two requests can't book the same slot at once
function withWriteLock(callable $work) {
    $db = getDB();
    $db->exec("BEGIN IMMEDIATE");
    try {
        $result = $work($db);
        $db->exec("COMMIT");
        return $result;
    } catch (Throwable $e) {
        $db->exec("ROLLBACK");
        throw $e;
    }
}

// ---------- Booking checks ----------

// DESC: Stops with a helpful error unless the slot can be booked for this item.
//       Call inside withWriteLock so the check and the insert happen together.
function assertSlotBookable(PDO $db, array $store, string $date, string $time, string $itemId, ?int $excludeBookingId = null): void {
    $result = computeSlots($db, $store, $date, $itemId, $excludeBookingId);
    if ($result["closed"]) {
        fail(409, "STORE_CLOSED", $result["closed_reason"] . " Choose another date.", "date");
    }
    foreach ($result["slots"] as $slot) {
        if ($slot["time"] !== $time) {
            continue;
        }
        if ($slot["available"]) {
            return;
        }
        $messages = [
            "PAST"         => "That time has already passed. Choose a later time.",
            "CLOSED"       => "The shop is closed at that time. Choose another time.",
            "FULLY_BOOKED" => "That time just filled up. Choose one of the other available times.",
            "ITEM_BOOKED"  => "Someone already booked this piece for that time. Choose another time.",
        ];
        fail(409, "SLOT_UNAVAILABLE", $messages[$slot["reason"]], "time");
    }
    fail(400, "TIME_INVALID", "Choose one of the shop's available times.", "time");
}

// DESC: Stops unless the item can take new bookings
function assertItemBookable(?array $item): void {
    if ($item === null) {
        fail(404, "ITEM_NOT_FOUND", "We couldn't find that piece. It may have been removed.", "item_id");
    }
    if ($item["status"] === "sold") {
        fail(409, "ITEM_UNAVAILABLE", "This piece has already sold.", "item_id");
    }
    if ($item["status"] === "held") {
        fail(409, "ITEM_UNAVAILABLE", "The shop has this piece on hold right now, so it can't be booked.", "item_id");
    }
}

// DESC: Reads an ID that may arrive as a JSON number or a numeric string
function idValue($value): ?int {
    if (is_int($value) && $value > 0) return $value;
    if (is_string($value) && ctype_digit($value) && (int)$value > 0) return (int)$value;
    return null;
}

// DESC: Finds one of this store's items (removed ones included). Other stores' items look missing.
function requireStoreItem(PDO $db, array $store, ?string $itemId): array {
    if ($itemId === null) {
        fail(400, "ITEM_ID_REQUIRED", "An item_id is required.", "item_id");
    }
    $item = fetchItem($db, $itemId, true);
    if ($item === null || $item["store_id"] !== $store["store_id"]) {
        fail(404, "ITEM_NOT_FOUND", "Your store doesn't have an item with that ID.", "item_id");
    }
    return $item;
}

// DESC: Store inventory view of an item: the public object plus favorites and upcoming bookings
function formatStoreItem(PDO $db, array $row): array {
    $item = formatItem($row);
    $stmt = $db->prepare("SELECT COUNT(*) FROM favorites WHERE item_id = ?");
    $stmt->execute([$row["item_id"]]);
    $item["favorites_count"] = (int)$stmt->fetchColumn();
    $stmt = $db->prepare("SELECT COUNT(*) FROM bookings WHERE item_id = ? AND status = 'confirmed' AND date >= ?");
    $stmt->execute([$row["item_id"], todayDate()]);
    $item["upcoming_bookings"] = (int)$stmt->fetchColumn();
    return $item;
}
