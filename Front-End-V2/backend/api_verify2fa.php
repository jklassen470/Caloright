<?php

// 2FA verification endpoint for the React frontend.
// React sends the 6-digit code as JSON, PHP checks it against the stored secret,
// and if correct, promotes the pending session to a full session so the user is logged in.

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

// Checking that a pending session exists before verifying the code.
// This prevents someone from hitting this endpoint directly without going through login first.
if (!isset($_SESSION['pending_user_id'])) {
    http_response_code(401);
    echo json_encode(["error" => "No login in progress"]);
    exit;
}

// Reading the JSON body sent from React.
$requestData = json_decode(file_get_contents("php://input"), true);

if (!is_array($requestData)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body"]);
    exit;
}

$code = trim($requestData['code'] ?? '');

if ($code === '') {
    http_response_code(422);
    echo json_encode(["error" => "2FA code is required"]);
    exit;
}

require __DIR__ . '/vendor/autoload.php';

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\QRServerProvider;

$tfa = new TwoFactorAuth(new QRServerProvider(), "CaloRight");

// Fetching the 2FA secret for the pending user so we can verify their code.
$stmt = $pdo->prepare("SELECT secret FROM twofact WHERE user_id = ? AND is_enabled = 1");
$stmt->execute([$_SESSION['pending_user_id']]);
$twofact = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$twofact || !$tfa->verifyCode($twofact['secret'], $code)) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid 2FA code"]);
    exit;
}

// Promoting the pending session to a full session now that 2FA has passed.
$_SESSION['user_id']   = $_SESSION['pending_user_id'];
$_SESSION['full_name'] = $_SESSION['pending_full_name'];
unset($_SESSION['pending_user_id']);
unset($_SESSION['pending_full_name']);

echo json_encode([
    "verified"   => true,
    "full_name"  => $_SESSION['full_name'],
]);
