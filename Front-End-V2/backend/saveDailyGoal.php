<?php

// Calorie goal save endpoint for the React frontend.
// React sends the new goal as JSON and PHP saves it to the user_goals table.
// Marking all previous goals as inactive before inserting the new one.

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

$userId = $_SESSION['user_id'];

// Reading the JSON body sent from React.
$requestData = json_decode(file_get_contents("php://input"), true);

if (!is_array($requestData)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body"]);
    exit;
}

$goal = (int) ($requestData['dailyCalorieGoal'] ?? 0);

if ($goal <= 0) {
    http_response_code(422);
    echo json_encode(["error" => "Daily calorie goal must be greater than 0"]);
    exit;
}

// Marking all previous goals for this user as inactive.
// The schema keeps old goals for history but only one can be active at a time.
$stmt = $pdo->prepare("UPDATE user_goals SET is_active = 0 WHERE user_id = ?");
$stmt->execute([$userId]);

// Inserting the new goal with a one week period starting today.
$periodStart = date('Y-m-d');
$periodEnd   = date('Y-m-d', strtotime('+7 days'));

$stmt = $pdo->prepare("
    INSERT INTO user_goals (user_id, daily_calorie_target, period_start, period_end, is_active)
    VALUES (?, ?, ?, ?, 1)
");
$stmt->execute([$userId, $goal, $periodStart, $periodEnd]);

// Returning the saved value so React can update the dashboard state.
echo json_encode([
    "dailyCalorieGoal" => $goal,
]);
