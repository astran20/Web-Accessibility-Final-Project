<?php
/*
 database.php
 SQLite connection, schema and seeding.
 The database builds itself: if the tables don't exist yet, the first request creates and seeds them.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/../config.php";

// DESC: Shared PDO connection. Creates and seeds the database the first time it is needed.
// RET: PDO
function getDB(): PDO {
    static $db = null;
    if ($db !== null) {
        return $db;
    }

    $dir = dirname(DATABASE_FILE_PATH);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $db = new PDO("sqlite:" . DATABASE_FILE_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec("PRAGMA foreign_keys = ON");
    $db->exec("PRAGMA busy_timeout = 5000");

    if (!tableExists($db, "stores")) {
        $db->exec("BEGIN IMMEDIATE");
        try {
            // Re-check inside the lock in case another request built it first
            if (!tableExists($db, "stores")) {
                createSchema($db);
                seedDatabase($db, LOAD_SAMPLE_DATA);
            }
            $db->exec("COMMIT");
        } catch (Throwable $e) {
            $db->exec("ROLLBACK");
            throw $e;
        }
    }
    return $db;
}

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
    $stmt->execute([$table]);
    return (bool)$stmt->fetchColumn();
}

function createSchema(PDO $db): void {
    $db->exec(<<<SQL
        CREATE TABLE stores (
            store_id      TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            neighborhood  TEXT NOT NULL,
            address       TEXT NOT NULL,
            city          TEXT NOT NULL,
            description   TEXT NOT NULL,
            image         TEXT NOT NULL,
            image_alt     TEXT NOT NULL,
            hours_json    TEXT NOT NULL,
            slot_minutes  INTEGER NOT NULL DEFAULT 60,
            slot_capacity INTEGER NOT NULL DEFAULT 2,
            auth_hash     TEXT NOT NULL,
            updated_at    INTEGER NOT NULL
        );

        CREATE TABLE items (
            item_id          TEXT PRIMARY KEY,
            store_id         TEXT NOT NULL REFERENCES stores(store_id),
            title            TEXT NOT NULL,
            category         TEXT NOT NULL,
            size             TEXT NOT NULL,
            price_cents      INTEGER NOT NULL,
            condition        TEXT NOT NULL,
            material         TEXT,
            description      TEXT NOT NULL,
            image            TEXT NOT NULL,
            image_alt        TEXT NOT NULL,
            try_on_supported INTEGER NOT NULL DEFAULT 0,
            status           TEXT NOT NULL DEFAULT 'available'
                             CHECK (status IN ('available', 'held', 'sold', 'removed')),
            pinned           INTEGER NOT NULL DEFAULT 0,
            listed_at        INTEGER NOT NULL,
            updated_at       INTEGER NOT NULL,
            sold_at          INTEGER
        );
        CREATE INDEX idx_items_store ON items(store_id);
        CREATE INDEX idx_items_status ON items(status);

        CREATE TABLE visitors (
            visitor_token TEXT PRIMARY KEY,
            created_at    INTEGER NOT NULL
        );

        CREATE TABLE favorites (
            visitor_token TEXT NOT NULL REFERENCES visitors(visitor_token) ON DELETE CASCADE,
            item_id       TEXT NOT NULL REFERENCES items(item_id),
            created_at    INTEGER NOT NULL,
            PRIMARY KEY (visitor_token, item_id)
        );

        CREATE TABLE bookings (
            booking_id        INTEGER PRIMARY KEY AUTOINCREMENT,
            confirmation_hash TEXT NOT NULL,
            item_id           TEXT NOT NULL REFERENCES items(item_id),
            store_id          TEXT NOT NULL REFERENCES stores(store_id),
            visitor_token     TEXT REFERENCES visitors(visitor_token),
            name              TEXT NOT NULL,
            email             TEXT NOT NULL,
            date              TEXT NOT NULL,
            time              TEXT NOT NULL,
            notes             TEXT,
            status            TEXT NOT NULL DEFAULT 'confirmed'
                              CHECK (status IN ('confirmed', 'completed', 'no_show', 'cancelled')),
            cancel_reason     TEXT,
            store_message     TEXT,
            created_at        INTEGER NOT NULL,
            updated_at        INTEGER NOT NULL
        );
        CREATE INDEX idx_bookings_slot ON bookings(store_id, date, time);
        CREATE INDEX idx_bookings_item ON bookings(item_id);
        CREATE INDEX idx_bookings_visitor ON bookings(visitor_token);

        CREATE TABLE closures (
            closure_id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id   TEXT NOT NULL REFERENCES stores(store_id),
            date       TEXT NOT NULL,
            start_time TEXT,
            end_time   TEXT,
            reason     TEXT,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_closures_store_date ON closures(store_id, date);

        CREATE TABLE try_on_models (
            model_id    TEXT PRIMARY KEY,
            label       TEXT NOT NULL,
            description TEXT NOT NULL,
            image       TEXT NOT NULL,
            image_alt   TEXT NOT NULL
        );

        CREATE TABLE try_on_results (
            model_id  TEXT NOT NULL REFERENCES try_on_models(model_id),
            item_id   TEXT NOT NULL REFERENCES items(item_id),
            image     TEXT NOT NULL,
            image_alt TEXT NOT NULL,
            PRIMARY KEY (model_id, item_id)
        );
    SQL);
}

function loadSampleJSON(string $file): array {
    $path = SAMPLE_DATA_DIR . "/" . $file;
    if (!is_file($path)) {
        throw new RuntimeException("Missing sample data file: $path");
    }
    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data)) {
        throw new RuntimeException("Sample data file is not valid JSON: $path");
    }
    return $data;
}

// DESC: Loads the sample-*.json files. Dates in the samples are relative ("listed_days_ago",
//       "days_from_now") so the demo always looks current no matter when it is reset.
// REQ: $includeSamples - also load items, try-on data, favorites and bookings
function seedDatabase(PDO $db, bool $includeSamples): void {
    $now = time();

    $stores = loadSampleJSON("sample-stores.json");
    $authCodes = loadSampleJSON("sample-store-auth.json");
    $insertStore = $db->prepare(
        "INSERT INTO stores (store_id, name, neighborhood, address, city, description, image, image_alt,
                             hours_json, slot_minutes, slot_capacity, auth_hash, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    foreach ($stores as $s) {
        if (!isset($authCodes[$s["store_id"]])) {
            throw new RuntimeException("No auth code in sample-store-auth.json for store " . $s["store_id"]);
        }
        $insertStore->execute([
            $s["store_id"], $s["name"], $s["neighborhood"], $s["address"], $s["city"], $s["description"],
            $s["image"], $s["image_alt"], json_encode($s["hours"]), $s["slot_minutes"] ?? 60,
            $s["slot_capacity"] ?? 2, password_hash($authCodes[$s["store_id"]], PASSWORD_DEFAULT), $now,
        ]);
    }

    if (!$includeSamples) {
        return;
    }

    $insertItem = $db->prepare(
        "INSERT INTO items (item_id, store_id, title, category, size, price_cents, condition, material, description,
                            image, image_alt, try_on_supported, status, pinned, listed_at, updated_at, sold_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    foreach (loadSampleJSON("sample-items.json") as $i) {
        $listedAt = $now - (int)round(($i["listed_days_ago"] ?? 0) * 86400);
        $status = $i["status"] ?? "available";
        $insertItem->execute([
            $i["item_id"], $i["store_id"], $i["title"], $i["category"], $i["size"], $i["price_cents"],
            $i["condition"], $i["material"] ?? null, $i["description"], $i["image"], $i["image_alt"],
            !empty($i["try_on_supported"]) ? 1 : 0, $status, !empty($i["pinned"]) ? 1 : 0,
            $listedAt, $listedAt, $status === "sold" ? $now - 86400 : null,
        ]);
    }

    $tryOn = loadSampleJSON("sample-try-on.json");
    $insertModel = $db->prepare("INSERT INTO try_on_models (model_id, label, description, image, image_alt) VALUES (?, ?, ?, ?, ?)");
    foreach ($tryOn["models"] as $m) {
        $insertModel->execute([$m["model_id"], $m["label"], $m["description"], $m["image"], $m["image_alt"]]);
    }
    $insertResult = $db->prepare("INSERT INTO try_on_results (model_id, item_id, image, image_alt) VALUES (?, ?, ?, ?)");
    foreach ($tryOn["results"] ?? [] as $r) {
        $insertResult->execute([$r["model_id"], $r["item_id"], $r["image"], $r["image_alt"]]);
    }

    $activity = loadSampleJSON("sample-activity.json");
    $insertVisitor = $db->prepare("INSERT INTO visitors (visitor_token, created_at) VALUES (?, ?)");
    foreach ($activity["visitors"] as $token) {
        $insertVisitor->execute([$token, $now]);
    }
    $insertFavorite = $db->prepare("INSERT INTO favorites (visitor_token, item_id, created_at) VALUES (?, ?, ?)");
    foreach ($activity["favorites"] as $f) {
        $insertFavorite->execute([$f["visitor_token"], $f["item_id"], $now]);
    }
    $insertBooking = $db->prepare(
        "INSERT INTO bookings (confirmation_hash, item_id, store_id, visitor_token, name, email, date, time, notes,
                               status, created_at, updated_at)
         SELECT ?, item_id, store_id, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ? FROM items WHERE item_id = ?"
    );
    foreach ($activity["bookings"] as $b) {
        $date = date("Y-m-d", strtotime("+" . (int)$b["days_from_now"] . " days", $now));
        $insertBooking->execute([
            password_hash(strtoupper($b["confirmation_code"]), PASSWORD_DEFAULT), $b["visitor_token"] ?? null,
            $b["name"], $b["email"], $date, $b["time"], $b["notes"] ?? null, $now, $now, $b["item_id"],
        ]);
    }
}

// DESC: Deletes the database and uploaded images, then rebuilds and reseeds. Used by server-reset.php.
function resetDatabase(): void {
    foreach ([DATABASE_FILE_PATH, DATABASE_FILE_PATH . "-journal", DATABASE_FILE_PATH . "-wal", DATABASE_FILE_PATH . "-shm"] as $file) {
        if (is_file($file)) {
            unlink($file);
        }
    }
    if (is_dir(UPLOAD_DIR)) {
        foreach (glob(UPLOAD_DIR . "/*") as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }
    getDB();
}
