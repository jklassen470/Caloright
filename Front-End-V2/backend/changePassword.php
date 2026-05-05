<?php

// Password change endpoint for the React frontend.
// React sends the current password and the new password as JSON.
// Verifying the current password before saving the new one.
// Checking for a valid session before allowing any changes.

require_once __DIR__ . '/db.php';
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");


// Handling the browser's CORS preflight request before doing any work.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Returning an error if anything other than a POST request is sent.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

// Reading the JSON body sent from React.
$rawBody = file_get_contents("php://input");
$requestData = json_decode($rawBody, true);

if (!is_array($requestData)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body"]);
    exit;
}

$currentPassword = $requestData['current_password'] ?? '';
$newPassword     = $requestData['new_password'] ?? '';

if ($currentPassword === '' || $newPassword === '') {
    http_response_code(422);
    echo json_encode(["error" => "Current and new password are required"]);
    exit;
}

// Enforcing a minimum length before touching the database.
if (strlen($newPassword) < 8) {
    http_response_code(422);
    echo json_encode(["error" => "New password must be at least 8 characters"]);
    exit;
}

// Fetching the stored hash so we can verify the current password is correct.
$stmt = $pdo->prepare("SELECT password_hash FROM users WHERE user_id = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Checking that the current password matches before allowing the change.
if (!password_verify($currentPassword, $user['password_hash'])) {
    http_response_code(403);
    echo json_encode(["error" => "Current password is incorrect"]);
    exit;
}

// Hashing the new password and saving it to the database.
$newHash = password_hash($newPassword, PASSWORD_DEFAULT);

$stmt2 = $pdo->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
$stmt2->execute([$newHash, $_SESSION['user_id']]);

echo json_encode(["success" => true]);
