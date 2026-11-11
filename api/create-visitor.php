<?php
/*
 POST /api/create-visitor
 Issues a guest visitor token. The front end keeps it in localStorage and sends it as the
 X-Visitor-Token header for favorites and My Appointments. No account or personal data needed.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["POST"]);

$token = "v_" . bin2hex(random_bytes(16));
getDB()->prepare("INSERT INTO visitors (visitor_token, created_at) VALUES (?, ?)")->execute([$token, time()]);

sendJSON(201, [
    "success"       => true,
    "visitor_token" => $token,
    "message"       => "Visitor created. Send this token as the X-Visitor-Token header.",
]);
