<?php

// Session check endpoint for the React frontend.
// React calls this when the app first loads to find out who is logged in.
// Returning the user's name if a valid session exists, or null if nobody is logged in.

require_once __DIR__ . '/db.php';
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handling the browser's CORS preflight request before doing any work.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// Returning null if no session exists so React knows nobody is logged in.
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["user" => null]);
    exit;
}

echo json_encode([
    "user" => [
        "user_id"   => $_SESSION['user_id'],
        "full_name" => $_SESSION['full_name'],
    ]
]);
