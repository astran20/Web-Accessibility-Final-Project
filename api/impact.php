<?php
/*
 GET /api/impact
 Live sustainability numbers for the Home and Learn pages, calculated from sold pieces.

 By Charlie Gray - RETHREAD, SCU CSEN 163
*/
require_once __DIR__ . "/helpers.php";
startEndpoint(["GET"]);

sendJSON(200, computeImpact(getDB()));
