<?php
/*
 POST /api/store-login
 Checks a store's credentials (X-Store-Id and X-Auth-Code headers) and returns its profile,
 so the store dashboard can open. Nothing is kept on the server: every store request sends
 the same two headers.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["POST"]);

$store = requireStore();
sendJSON(200, [
    "success" => true,
    "message" => "Signed in as " . $store["name"] . ".",
    "store"   => formatStore($store),
]);
