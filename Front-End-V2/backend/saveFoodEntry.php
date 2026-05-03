<?php

// This file acts like a tiny temporary database.
// React sends one food entry as JSON, and PHP appends it as one row in food_log.csv.
// Later, this CSV file can be replaced by a real MySQL table with similar columns.

// Current CSV column layout.
// Every new food entry should be written in exactly this order.
// Keeping this list in one place makes it easier to change the "fake database" schema.
$expectedHeaders = [
    'id',
    'food_id',
    'source',
    'name',
    'calories',
    'protein',
    'carbs',
    'fat',
    'ingredient_food_ids',
    'ingredients_json',
    'time',
    'created_at',
];

// Older CSV layout from before recipes stored source and ingredient data.
// Some existing rows may still use this shape if the CSV was created before
// we added recipe support. We keep this list so PHP can migrate old rows.
$legacyHeaders = [
    'id',
    'food_id',
    'name',
    'calories',
    'protein',
    'carbs',
    'fat',
    'time',
    'created_at',
];

// Upgrade an existing CSV file if it was created with an older header layout.
// This prevents a common CSV problem: old rows and new rows having different
// numbers of columns, which makes the file look like it has "extra" columns.
function rewrite_csv_with_expected_headers($csvPath, $expectedHeaders, $legacyHeaders)
{
    // No file means there is nothing to upgrade yet.
    // The save flow below will create the file with the latest headers.
    if (!file_exists($csvPath)) {
        return;
    }

    // Open the existing CSV so we can inspect its first row.
    // The first row should always be the header row.
    $csvFile = fopen($csvPath, 'r');

    if ($csvFile === false) {
        return;
    }

    $currentHeaders = fgetcsv($csvFile);

    // If the file is empty or already current, leave it alone.
    // Rewriting is only needed when headers are different.
    if ($currentHeaders === false || $currentHeaders === $expectedHeaders) {
        fclose($csvFile);
        return;
    }

    // Store migrated rows in memory before rewriting the file.
    // This is fine for our temporary CSV database because the file is small.
    $rows = [];

    while (($row = fgetcsv($csvFile)) !== false) {
        // Skip completely empty rows so they do not become blank food entries.
        if (count(array_filter($row, fn($value) => $value !== null && $value !== '')) === 0) {
            continue;
        }

        // Pair each cell with the header it belonged to in the old file.
        // Example: ["name", "calories"] + ["Egg", "78"] becomes
        // ["name" => "Egg", "calories" => "78"].
        $rowData = array_combine(
            $currentHeaders,
            array_pad($row, count($currentHeaders), '')
        );

        // Map every existing row into the current CSV shape.
        // Missing columns become empty strings so every row has the same length.
        $rows[] = [
            'id' => $rowData['id'] ?? '',
            'food_id' => $rowData['food_id'] ?? '',
            'source' => $rowData['source'] ?? '',
            'name' => $rowData['name'] ?? '',
            'calories' => $rowData['calories'] ?? '',
            'protein' => $rowData['protein'] ?? '',
            'carbs' => $rowData['carbs'] ?? '',
            'fat' => $rowData['fat'] ?? '',
            'ingredient_food_ids' => $rowData['ingredient_food_ids'] ?? '',
            'ingredients_json' => $rowData['ingredients_json'] ?? '',
            'time' => $rowData['time'] ?? '',
            'created_at' => $rowData['created_at'] ?? '',
        ];

        // Legacy rows did not have recipe metadata, so keep those fields empty.
        // This preserves old data without pretending we know ingredients
        // that were never saved.
        if ($currentHeaders === $legacyHeaders) {
            $rows[count($rows) - 1]['source'] = '';
            $rows[count($rows) - 1]['ingredient_food_ids'] = '';
            $rows[count($rows) - 1]['ingredients_json'] = '';
        }
    }

    fclose($csvFile);

    // Rewrite the file with the current header row and migrated rows.
    // Opening with "w" clears the existing file first, so we only do this
    // after all old rows have already been read into $rows.
    $csvFile = fopen($csvPath, 'w');

    if ($csvFile === false) {
        return;
    }

    fputcsv($csvFile, $expectedHeaders);

    // Write each migrated row in the same order as the expected headers.
    // The order matters because CSV cells do not know their own column names.
    foreach ($rows as $row) {
        fputcsv($csvFile, [
            $row['id'],
            $row['food_id'],
            $row['source'],
            $row['name'],
            $row['calories'],
            $row['protein'],
            $row['carbs'],
            $row['fat'],
            $row['ingredient_food_ids'],
            $row['ingredients_json'],
            $row['time'],
            $row['created_at'],
        ]);
    }

    fclose($csvFile);
}

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// ---------- Request setup ----------

// Let the browser preflight request finish early.
// Browsers send OPTIONS before some cross-origin POST requests to ask:
// "Is this request allowed?" We answer yes and stop before doing save logic.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// This endpoint only saves food entries.
// Anything other than POST is rejected so the API behavior stays predictable.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// ---------- Read and validate JSON ----------

// Read the JSON body sent from React.
// React sends data like: {"name":"Egg","calories":78,...}
// php://input is how PHP reads raw JSON request bodies.
$rawBody = file_get_contents("php://input");
$requestData = json_decode($rawBody, true);

// json_decode returns an array when the body is valid JSON.
// If not, the frontend sent something this endpoint cannot understand.
if (!is_array($requestData)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body"]);
    exit;
}

// Pull out only the fields this endpoint knows how to save.
// Default values keep missing optional fields from breaking the CSV row.
$name = trim($requestData['name'] ?? '');
$calories = (float) ($requestData['calories'] ?? 0);
$protein = (float) ($requestData['protein'] ?? 0);
$carbs = (float) ($requestData['carbs'] ?? 0);
$fat = (float) ($requestData['fat'] ?? 0);
$foodId = trim((string) ($requestData['foodId'] ?? ''));
$source = trim((string) ($requestData['source'] ?? 'manual'));
$ingredientFoodIds = is_array($requestData['ingredientFoodIds'] ?? null)
    ? $requestData['ingredientFoodIds']
    : [];
$ingredients = is_array($requestData['ingredients'] ?? null)
    ? $requestData['ingredients']
    : [];

// Keep validation simple for the CSV phase.
// A food log row needs at least a name and calorie value to be useful.
if ($name === '' || $calories <= 0) {
    http_response_code(422);
    echo json_encode(["error" => "Food name and calories are required"]);
    exit;
}

// Build the saved entry shape once so both CSV and JSON use the same data.
// The "id" is our app's row ID. "foodId" is the external FatSecret food ID.
// They are different because a user can save the same FatSecret food many times.
$time = date('g:i A');
$createdAt = date('c');
$entryId = uniqid('food_', true);

// This is the app-facing object shape.
// It uses camelCase because the React frontend is JavaScript.
$savedEntry = [
    "id" => $entryId,
    "foodId" => $foodId,
    "source" => $source,
    "name" => $name,
    "calories" => $calories,
    "protein" => $protein,
    "carbs" => $carbs,
    "fat" => $fat,
    "ingredientFoodIds" => array_values($ingredientFoodIds),
    "ingredients" => array_values($ingredients),
    "time" => $time,
    "createdAt" => $createdAt,
];

$dataDirectory = __DIR__ . '/data';
$csvPath = $dataDirectory . '/food_log.csv';

// ---------- Write to CSV ----------

// Create the local data folder the first time this runs.
// __DIR__ means "the folder this PHP file is in", so the CSV stays inside CaloServer.
if (!is_dir($dataDirectory)) {
    mkdir($dataDirectory, 0777, true);
}

// If an older CSV layout exists, rewrite it into the current format first.
// This keeps future appends aligned with the latest header row.
rewrite_csv_with_expected_headers($csvPath, $expectedHeaders, $legacyHeaders);

$isNewFile = !file_exists($csvPath);
$csvFile = fopen($csvPath, 'a');

// If fopen fails, PHP probably does not have permission to write in /data.
if ($csvFile === false) {
    http_response_code(500);
    echo json_encode(["error" => "Unable to open CSV file"]);
    exit;
}

// Add headers once so the CSV stays easy to inspect by hand.
// This only runs when the file is brand new.
if ($isNewFile) {
    fputcsv($csvFile, $expectedHeaders);
}

// Save one row for the current food entry.
// fputcsv handles quotes and commas for us, which is important for JSON fields.
fputcsv($csvFile, [
    $savedEntry['id'],
    $savedEntry['foodId'],
    $savedEntry['source'],
    $savedEntry['name'],
    $savedEntry['calories'],
    $savedEntry['protein'],
    $savedEntry['carbs'],
    $savedEntry['fat'],
    implode('|', $savedEntry['ingredientFoodIds']),
    json_encode($savedEntry['ingredients']),
    $savedEntry['time'],
    $savedEntry['createdAt'],
]);

fclose($csvFile);

// Send the saved row back to React.
// React uses this response to update the dashboard with the saved ID and time.
echo json_encode($savedEntry);
