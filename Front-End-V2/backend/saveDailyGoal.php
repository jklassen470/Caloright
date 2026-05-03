<?php

// Saves the daily calorie goal to a CSV file.
// This is the CSV version of an UPDATE/INSERT query. Later, this file can be
// replaced with a MySQL update while React keeps calling the same endpoint.

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle the browser's CORS preflight before doing save work.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Saving a goal changes data, so this endpoint only accepts POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// React sends JSON like: { "dailyCalorieGoal": 2200 }.
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

$dataDirectory = __DIR__ . '/data';
$goalsPath = $dataDirectory . '/goals.csv';

// Make sure the CSV folder exists before writing the goal file.
if (!is_dir($dataDirectory)) {
    mkdir($dataDirectory, 0777, true);
}

$csvFile = fopen($goalsPath, 'w');

if ($csvFile === false) {
    http_response_code(500);
    echo json_encode(["error" => "Unable to open goals CSV file"]);
    exit;
}

// For now we only store the latest goal, so opening with "w" replaces
// the previous value. A future database version could update one user row.
fputcsv($csvFile, ['daily_calorie_goal', 'updated_at']);
fputcsv($csvFile, [$goal, date('c')]);
fclose($csvFile);

// Return the saved value so React can update the dashboard state.
echo json_encode([
    "dailyCalorieGoal" => $goal,
]);
