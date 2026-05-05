<?php

// Profile data endpoint for the React frontend.
// React calls this when the profile page loads so it can show the real values instead of hardcoded defaults.
// Checking for a valid session before returning any data.

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

// Returning an error if anything other than a GET request is sent.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// Returning an error if the user is not logged in.
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "Not logged in"]);
    exit;
}

// Fetching the user's name and email from the database.
$stmt = $pdo->prepare("SELECT full_name, email FROM users WHERE user_id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(404);
    echo json_encode(["error" => "User not found"]);
    exit;
}

echo json_encode([
    "full_name" => $user['full_name'],
    "email"     => $user['email'],
]);
