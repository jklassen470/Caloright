<?php

// Profile update endpoint for the React frontend.
// React sends the new name and email as JSON and PHP saves them to the users table.
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

$fullName = trim($requestData['full_name'] ?? '');
$email    = trim($requestData['email'] ?? '');

// Both fields are required since full_name and email are NOT NULL in the schema.
if ($fullName === '' || $email === '') {
    http_response_code(422);
    echo json_encode(["error" => "Name and email are required"]);
    exit;
}

try {
    // Updating the user's name and email in the database.
    $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ? WHERE user_id = ?");
    $stmt->execute([$fullName, $email, $_SESSION['user_id']]);

    // Updating the session name so the UI reflects the change right away.
    $_SESSION['full_name'] = $fullName;

    echo json_encode([
        "success"   => true,
        "full_name" => $fullName,
        "email"     => $email,
    ]);
} catch (PDOException $e) {
    // A duplicate email triggers a unique constraint violation.
    http_response_code(409);
    echo json_encode(["error" => "Email already in use"]);
}
