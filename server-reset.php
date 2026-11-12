<?php
/*
 server-reset.php
 Wipes the database and uploaded photos, then rebuilds everything from data/sample-*.json.
 Command line only:

     php server-reset.php

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/api/database.php";

if (PHP_SAPI !== "cli") {
    http_response_code(403);
    exit("Run this from the command line: php server-reset.php\n");
}
if (!RESET_DATABASE) {
    fwrite(STDERR, "Database reset is disabled. Set RESET_DATABASE to true in config.php first.\n");
    exit(1);
}

date_default_timezone_set(APP_TIMEZONE);
resetDatabase();

$db = getDB();
echo "Database rebuilt at " . DATABASE_FILE_PATH . "\n";
foreach (["stores", "items", "bookings", "favorites", "try_on_models"] as $table) {
    printf("  %-14s %d rows\n", $table, $db->query("SELECT COUNT(*) FROM $table")->fetchColumn());
}
echo LOAD_SAMPLE_DATA ? "Sample data loaded.\n" : "Sample data skipped (LOAD_SAMPLE_DATA is false).\n";
