<?php

// Registration endpoint for the React frontend.
// React sends the name, email, and password as JSON, PHP creates the account,
// generates a 2FA secret, and returns a QR code so React can display it for Google Authenticator.

require_once __DIR__ . '/db.php';
session_start();

require __DIR__ . '/vendor/autoload.php';

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\QRServerProvider;

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

$fullName = trim($requestData['name'] ?? '');
$email    = trim($requestData['email'] ?? '');
$password = $requestData['password'] ?? '';

if ($fullName === '' || $email === '' || $password === '') {
    http_response_code(422);
    echo json_encode(["error" => "Name, email and password are required"]);
    exit;
}

if (strlen($password) < 8) {
    http_response_code(422);
    echo json_encode(["error" => "Password must be at least 8 characters"]);
    exit;
}

// Generating a unique 2FA secret for this new account.
$tfa = new TwoFactorAuth(new QRServerProvider(), "CaloRight");
$secret = $tfa->createSecret();

try {
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Inserting the new user into the users table and storing the new user ID.
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$fullName, $email, $passwordHash]);
    $userId = $pdo->lastInsertId();

    // Saving the 2FA secret to the twofact table so the user can log in with Google Authenticator.
    $stmt2 = $pdo->prepare("INSERT INTO twofact (user_id, secret, is_enabled, verified_at) VALUES (?, ?, 1, NOW())");
    $stmt2->execute([$userId, $secret]);

    // Storing the new user in a pending session so the 2FA step can complete the login.
    $_SESSION['pending_user_id']   = $userId;
    $_SESSION['pending_full_name'] = $fullName;

    // Building the QR code as a data URI so React can display it as an image.
    $qrCodeUri = $tfa->getQRCodeImageAsDataUri($email, $secret);

    echo json_encode([
        "success"   => true,
        "qrCode"    => $qrCodeUri,
        "secret"    => $secret,
    ]);

} catch (PDOException $e) {
    http_response_code(409);
    echo json_encode(["error" => "An account with that email already exists"]);
}
