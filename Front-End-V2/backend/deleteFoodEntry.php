<?php

// Deletes one food entry from food_log.csv by app row ID.
// This keeps the temporary CSV database in sync with the React UI.

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Let the browser's CORS preflight pass before reading the request body.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Deleting changes data, so this endpoint only accepts POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// React sends JSON like: { "id": "food_123" }.
$requestData = json_decode(file_get_contents("php://input"), true);

if (!is_array($requestData)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body"]);
    exit;
}

$foodEntryId = trim($requestData['id'] ?? '');

if ($foodEntryId === '') {
    http_response_code(422);
    echo json_encode(["error" => "Food entry id is required"]);
    exit;
}

$csvPath = __DIR__ . '/data/food_log.csv';

// If the CSV does not exist, there is nothing to delete.
// Returning success keeps the frontend simple.
if (!file_exists($csvPath)) {
    echo json_encode(["deletedId" => $foodEntryId]);
    exit;
}

$csvFile = fopen($csvPath, 'r');

if ($csvFile === false) {
    http_response_code(500);
    echo json_encode(["error" => "Unable to read food log CSV"]);
    exit;
}

$headers = fgetcsv($csvFile);
$keptRows = [];

// Read every row and keep only the rows that do NOT match the deleted ID.
// CSV files cannot delete one row in place, so we rebuild the file afterward.
while (($row = fgetcsv($csvFile)) !== false) {
    $rowData = array_combine(
        $headers,
        array_pad($row, count($headers), '')
    );

    if (($rowData['id'] ?? '') !== $foodEntryId) {
        $keptRows[] = $rowData;
    }
}

fclose($csvFile);

$csvFile = fopen($csvPath, 'w');

if ($csvFile === false) {
    http_response_code(500);
    echo json_encode(["error" => "Unable to write food log CSV"]);
    exit;
}

fputcsv($csvFile, $headers);

// Write the kept rows back using the original header order.
foreach ($keptRows as $rowData) {
    $row = [];

    foreach ($headers as $header) {
        $row[] = $rowData[$header] ?? '';
    }

    fputcsv($csvFile, $row);
}

fclose($csvFile);

// React uses deletedId to remove the item from the dashboard state.
echo json_encode(["deletedId" => $foodEntryId]);
