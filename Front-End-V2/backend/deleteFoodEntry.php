<?php

// Food entry delete endpoint for the React frontend.
// React sends the item ID as JSON and PHP removes it from m_Items,
// then subtracts its nutrition from the daily summary to keep the totals correct.

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

$itemId = (int) ($requestData['id'] ?? 0);

if ($itemId <= 0) {
    http_response_code(422);
    echo json_encode(["error" => "Food entry id is required"]);
    exit;
}

// Fetching the item's nutrition before deleting so we can update the daily summary.
// Also verifying the item belongs to this user by joining through the meals table.
$stmt = $pdo->prepare("
    SELECT i.calories, i.protein_g, i.carbs_g, i.fat_g, m.log_date
    FROM m_Items i
    JOIN meals m ON i.log_id = m.log_id
    WHERE i.item_id = ? AND m.user_id = ?
");
$stmt->execute([$itemId, $userId]);
$item = $stmt->fetch(PDO::FETCH_ASSOC);

// Returning 404 if the item doesn't exist or belongs to a different user.
if (!$item) {
    http_response_code(404);
    echo json_encode(["error" => "Food entry not found"]);
    exit;
}

// Deleting the item from m_Items.
$stmt = $pdo->prepare("DELETE FROM m_Items WHERE item_id = ?");
$stmt->execute([$itemId]);

// Subtracting the deleted item's nutrition from the daily summary.
// Using GREATEST(0, ...) to prevent the totals from going below zero.
$stmt = $pdo->prepare("
    UPDATE daily
    SET
        total_calories  = GREATEST(0, total_calories  - ?),
        total_protein_g = GREATEST(0, total_protein_g - ?),
        total_carbs_g   = GREATEST(0, total_carbs_g   - ?),
        total_fat_g     = GREATEST(0, total_fat_g     - ?),
        foods_logged    = GREATEST(0, foods_logged    - 1)
    WHERE user_id = ? AND summary_date = ?
");
$stmt->execute([
    $item['calories'],
    $item['protein_g'],
    $item['carbs_g'],
    $item['fat_g'],
    $userId,
    $item['log_date'],
]);

// Sending the deleted item ID back to React so it can remove it from the dashboard state.
echo json_encode(["deletedId" => (string) $itemId]);
