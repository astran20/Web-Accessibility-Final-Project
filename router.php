<?php
/*
 router.php
 Local development router for PHP's built-in server:

     php -S localhost:8000 router.php

 Does the same job as .htaccess does on Apache: maps /api/items to api/items.php,
 blocks internal files, and lets everything else (HTML, CSS, images) be served as-is.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/

$path = rawurldecode(parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH) ?? "/");

function routerError(int $status, string $code, string $message): bool {
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode(["errors" => [["error_code" => $code, "field" => null, "message" => $message]]], JSON_PRETTY_PRINT);
    return true;
}

// Internal files, the database, tests and dotfiles are never served
$blocked = '#^/(config\.php|server-reset\.php|router\.php|data(/|$)|tests(/|$)|api/(helpers|database|models)(\.php)?/?$)#';
if (preg_match($blocked, $path) || preg_match('#(^|/)\.#', $path)) {
    return routerError(403, "FORBIDDEN", "This file isn't public.");
}

if (preg_match('#^/api/([a-z0-9-]+)(\.php)?/?$#', $path, $m)) {
    $file = __DIR__ . "/api/" . $m[1] . ".php";
    if (is_file($file)) {
        require $file;
        return true;
    }
}
if (preg_match('#^/api(/|$)#', $path)) {
    return routerError(404, "ENDPOINT_NOT_FOUND", "There's no API endpoint at $path.");
}

return false; // static file
