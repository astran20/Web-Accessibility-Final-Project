<?php
/*
 tools/export-static-api.php
 Writes a read-only snapshot of the API to static-api/ so the site works on GitHub Pages,
 which can't run PHP. api-config.js reads these files when it detects github.io.

     php tools/export-static-api.php

 It seeds a throwaway database from data/sample-*.json, starts PHP's built-in server on it,
 saves the responses the front end reads (items, item, filter-options, stores), then shuts down.
 Rerun it whenever the sample data or the response format changes, and commit static-api/.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/

$root = dirname(__DIR__);
$out = "$root/static-api";
$port = 8765;
$base = "http://127.0.0.1:$port/api/";

$tmpDb = tempnam(sys_get_temp_dir(), "rethread-static-");
unlink($tmpDb); // the API seeds the file itself when it doesn't exist

$env = array_merge(getenv(), ["RETHREAD_DB" => $tmpDb]);
$server = proc_open(
    [PHP_BINARY, "-S", "127.0.0.1:$port", "router.php"],
    [["pipe", "r"], ["file", "/dev/null", "w"], ["file", "/dev/null", "w"]],
    $pipes,
    $root,
    $env
);
if (!is_resource($server)) {
    fwrite(STDERR, "Couldn't start the PHP server.\n");
    exit(1);
}

function fetchJSON(string $url): array {
    for ($try = 0; $try < 40; $try++) {
        $body = @file_get_contents($url);
        if ($body !== false) {
            return json_decode($body, true, flags: JSON_THROW_ON_ERROR);
        }
        usleep(100_000); // server still starting
    }
    throw new RuntimeException("No response from $url");
}

function save(string $path, array $data): void {
    @mkdir(dirname($path), 0777, true);
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n");
}

try {
    // Every listed piece, sold ones included, so the fallback can filter by status like the real API
    $items = fetchJSON($base . "items?status=available,held,sold&sort=recent");
    // Featured order depends on favorites and bookings, so keep the server's ranking as a list of IDs
    $featured = fetchJSON($base . "items?status=available,held,sold&sort=featured");
    $items["featured_order"] = array_column($featured["items"], "item_id");
    save("$out/items.json", $items);

    foreach ($items["items"] as $item) {
        $id = $item["item_id"];
        save("$out/item/$id.json", fetchJSON($base . "item?item_id=" . rawurlencode($id)));
    }
    save("$out/filter-options.json", fetchJSON($base . "filter-options"));
    save("$out/stores.json", fetchJSON($base . "stores"));

    echo "Wrote " . count($items["items"]) . " items to static-api/\n";
} finally {
    proc_terminate($server);
    proc_close($server);
    @unlink($tmpDb);
}
