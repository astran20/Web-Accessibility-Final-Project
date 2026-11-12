<?php
/*
 config.php
 Settings for the RETHREAD PHP API. Edit these for your server.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/

// ---------- Paths ----------

// SQLite database file. If it doesn't exist, the API creates and seeds it on the first request.
// The RETHREAD_DB environment variable overrides this (the test suite uses it to run on a throwaway copy).
define("DATABASE_FILE_PATH", getenv("RETHREAD_DB") ?: __DIR__ . "/data/rethread.db");

// Folder holding the sample-*.json seed files
define("SAMPLE_DATA_DIR", __DIR__ . "/data");

// Where uploaded listing photos are written, and the public URL path they are served from
define("UPLOAD_DIR", getenv("RETHREAD_UPLOAD_DIR") ?: __DIR__ . "/uploads/items");
define("UPLOAD_URL_PATH", "uploads/items");

// ---------- Database reset ----------

// Allows `php server-reset.php` to wipe and rebuild the database. Turn off on a shared server.
define("RESET_DATABASE", true);

// Load sample items, bookings and favorites when the database is created.
// Stores and their auth codes are always loaded, since nothing works without them.
define("LOAD_SAMPLE_DATA", true);

// ---------- Site ----------

define("APP_TIMEZONE", "America/Los_Angeles");

// Origins allowed to call the API from a different domain (CORS).
// Pages served by the same PHP server don't need to be listed.
define("ALLOWED_ORIGINS", [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://astran20.github.io",
]);

// ---------- Catalog ----------

define("ITEM_CATEGORIES", ["outerwear", "tops", "knitwear", "dresses", "denim", "bottoms", "accessories"]);
define("ITEM_SIZES", ["XS", "S", "M", "L", "XL"]);
define("ITEM_CONDITIONS", ["Excellent", "Very good", "Good", "Fair"]);

// Price filter presets offered to the Explore dropdown, in whole dollars. null max means "and up".
define("PRICE_RANGES", [
    ["value" => "0-25",   "label" => "Under $25",  "min" => 0,   "max" => 25],
    ["value" => "25-50",  "label" => "$25–$50",    "min" => 25,  "max" => 50],
    ["value" => "50-100", "label" => "$50–$100",   "min" => 50,  "max" => 100],
    ["value" => "100+",   "label" => "$100 and up", "min" => 100, "max" => null],
]);

define("MAX_IMAGE_BYTES", 5 * 1024 * 1024);
define("MAX_PINNED_PER_STORE", 2);

// ---------- Featured ordering ----------
// See "Featured ordering" in docs/api.md for how these combine.

define("FEATURED_WEIGHTS", [
    "pinned"                  => 100, // store pinned the item
    "freshness_max"           => 30,  // brand-new listing
    "freshness_decay_per_day" => 2,   // freshness lost per day listed
    "favorites"               => 10,  // multiplied by log(1 + favorites)
    "recent_bookings"         => 15,  // multiplied by log(1 + bookings in the window below)
    "recent_booking_days"     => 14,
    "try_on"                  => 5,   // item supports the try-on demo
    "held"                    => -20, // on hold, so it can't be booked right now
    "personal_match"          => 8,   // matches a size or category the visitor has saved
]);

// ---------- Booking ----------

define("BOOKING_WINDOW_DAYS", 30);
define("MAX_NOTES_LENGTH", 500);

// ---------- Sustainability impact ----------
// Rough per-garment estimates of what buying secondhand avoids, used for the impact stat.
// Classroom figures only: cite real sources on the Learn page before presenting them.
// The tops and denim water figures follow the widely cited WWF (cotton T-shirt, ~2,700 L)
// and UNEP (pair of jeans, ~7,500 L) numbers.
define("IMPACT_ESTIMATES", [
    "outerwear"   => ["co2_kg" => 20, "water_liters" => 5000],
    "tops"        => ["co2_kg" => 5,  "water_liters" => 2700],
    "knitwear"    => ["co2_kg" => 12, "water_liters" => 4000],
    "dresses"     => ["co2_kg" => 10, "water_liters" => 3500],
    "denim"       => ["co2_kg" => 33, "water_liters" => 7500],
    "bottoms"     => ["co2_kg" => 12, "water_liters" => 4000],
    "accessories" => ["co2_kg" => 3,  "water_liters" => 1000],
]);
