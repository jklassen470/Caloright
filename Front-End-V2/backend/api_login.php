<?php

// Login endpoint for the React frontend.
// React sends the email and password as JSON, PHP checks them against the database,
// and if correct, starts a pending session and tells React to move to the 2FA step.

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

// Reading the JSON body sent from React.
$requestData = json_decode(file_get_contents("php://input"), true);

if (!is_array($requestData)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body"]);
    exit;
}

$email    = trim($requestData['email'] ?? '');
$password = $requestData['password'] ?? '';

if ($email === '' || $password === '') {
    http_response_code(422);
    echo json_encode(["error" => "Email and password are required"]);
    exit;
}

// Looking up the user in the database by their email address.
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    http_response_code(401);
    echo json_encode(["error" => "No account found with that email"]);
    exit;
}

// Checking that the submitted password matches the stored hash.
if (!password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(["error" => "Incorrect password"]);
    exit;
}

// Checking that 2FA is enabled for this account before proceeding.
$stmt2 = $pdo->prepare("SELECT secret FROM twofact WHERE user_id = ? AND is_enabled = 1");
$stmt2->execute([$user['user_id']]);
$twofact = $stmt2->fetch(PDO::FETCH_ASSOC);

if (!$twofact) {
    http_response_code(401);
    echo json_encode(["error" => "2FA is not set up for this account"]);
    exit;
}

// Storing the user's ID and name in a pending session instead of a full session.
// The full session is only created after the user passes the 2FA check.
$_SESSION['pending_user_id']   = $user['user_id'];
$_SESSION['pending_full_name'] = $user['full_name'];

echo json_encode(["requiresTwoFactor" => true]);
