<?php

// Dashboard data endpoint.
// This file is the temporary "backend database reader" for the React dashboard.
// Instead of React importing mockDashboardData.js, React calls this PHP file.
// PHP reads CSV files, converts the rows into arrays, and returns JSON.
//
// Later, each CSV read can be replaced with a MySQL SELECT query while keeping
// the JSON response shape the same for the frontend.

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// React/Vite and PHP run on different local origins:
// React: http://localhost:5173
// PHP:   http://localhost
// The browser may send OPTIONS first to check CORS permissions.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// This endpoint only reads dashboard data, so it should be called with GET.
// Save/update actions use separate POST endpoints.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$dataDirectory = __DIR__ . '/data';
$foodLogPath = $dataDirectory . '/food_log.csv';
$goalsPath = $dataDirectory . '/goals.csv';
$historyPath = $dataDirectory . '/history.csv';

// Create the data folder automatically so the app can run on a fresh computer
// without manually creating CSV files first.
if (!is_dir($dataDirectory)) {
    mkdir($dataDirectory, 0777, true);
}

// Write rows to a CSV using a known header order.
// This helper is used when creating starter CSV files.
function write_csv_rows($csvPath, $headers, $rows)
{
    $csvFile = fopen($csvPath, 'w');

    if ($csvFile === false) {
        return false;
    }

    fputcsv($csvFile, $headers);

    foreach ($rows as $row) {
        $orderedRow = [];

        foreach ($headers as $header) {
            $orderedRow[] = $row[$header] ?? '';
        }

        fputcsv($csvFile, $orderedRow);
    }

    fclose($csvFile);
    return true;
}

// If goals.csv does not exist yet, create a starter calorie goal.
// Later this would probably come from a users table in MySQL.
function ensure_goals_csv($goalsPath)
{
    if (file_exists($goalsPath)) {
        return;
    }

    write_csv_rows(
        $goalsPath,
        ['daily_calorie_goal', 'updated_at'],
        [[
            'daily_calorie_goal' => 2000,
            'updated_at' => date('c'),
        ]]
    );
}

// If history.csv does not exist yet, create sample weekly history data.
// This keeps the dashboard chart from being empty on first run.
function ensure_history_csv($historyPath)
{
    if (file_exists($historyPath)) {
        return;
    }

    write_csv_rows(
        $historyPath,
        ['id', 'day', 'calories'],
        [
            ['id' => 'mon', 'day' => 'Mon', 'calories' => 1850],
            ['id' => 'tue', 'day' => 'Tue', 'calories' => 2100],
            ['id' => 'wed', 'day' => 'Wed', 'calories' => 1920],
            ['id' => 'thu', 'day' => 'Thu', 'calories' => 1780],
            ['id' => 'fri', 'day' => 'Fri', 'calories' => 2050],
            ['id' => 'sat', 'day' => 'Sat', 'calories' => 1890],
        ]
    );
}

// Read any CSV file into an array of associative arrays.
// Example output row: ["name" => "Rice", "calories" => "200"].
function read_csv_assoc($csvPath)
{
    if (!file_exists($csvPath)) {
        return [];
    }

    $csvFile = fopen($csvPath, 'r');

    if ($csvFile === false) {
        return [];
    }

    $headers = fgetcsv($csvFile);

    if ($headers === false) {
        fclose($csvFile);
        return [];
    }

    $rows = [];

    while (($row = fgetcsv($csvFile)) !== false) {
        if (count(array_filter($row, fn($value) => $value !== null && $value !== '')) === 0) {
            continue;
        }

        $rows[] = array_combine(
            $headers,
            array_pad($row, count($headers), '')
        );
    }

    fclose($csvFile);
    return $rows;
}

// CSV values are read as strings, so convert nutrition numbers before
// sending them back to React.
function number_value($value)
{
    if ($value === null || $value === '') {
        return 0;
    }

    return (float) $value;
}

// Convert one food_log.csv row into the frontend dashboard food shape.
// Recipe ingredients are stored as JSON in the CSV, so we decode them here.
function map_food_row($row)
{
    $ingredientsJson = $row['ingredients_json'] ?? '[]';
    $ingredients = json_decode($ingredientsJson, true);

    if (!is_array($ingredients)) {
        $ingredients = [];
    }

    $ingredientFoodIds = trim($row['ingredient_food_ids'] ?? '') === ''
        ? []
        : explode('|', $row['ingredient_food_ids']);

    return [
        'id' => $row['id'] ?? '',
        'foodId' => $row['food_id'] ?? '',
        'source' => $row['source'] ?? '',
        'name' => $row['name'] ?? '',
        'calories' => number_value($row['calories'] ?? 0),
        'protein' => number_value($row['protein'] ?? 0),
        'carbs' => number_value($row['carbs'] ?? 0),
        'fat' => number_value($row['fat'] ?? 0),
        'ingredientFoodIds' => $ingredientFoodIds,
        'ingredients' => $ingredients,
        'time' => $row['time'] ?? '',
        'createdAt' => $row['created_at'] ?? '',
    ];
}

// The current CSV stores the latest goal as the last row.
// Since saveDailyGoal.php rewrites the file, there is usually only one row.
function load_daily_calorie_goal($goalsPath)
{
    $goalRows = read_csv_assoc($goalsPath);
    $latestGoal = $goalRows[count($goalRows) - 1]['daily_calorie_goal'] ?? 2000;

    return (int) $latestGoal;
}

// Convert one history.csv row into the chart format used by React.
function map_history_row($row)
{
    return [
        'id' => $row['id'] ?? strtolower($row['day'] ?? ''),
        'day' => $row['day'] ?? '',
        'calories' => number_value($row['calories'] ?? 0),
    ];
}

ensure_goals_csv($goalsPath);
ensure_history_csv($historyPath);

$foods = array_map('map_food_row', read_csv_assoc($foodLogPath));
$weeklyHistory = array_map('map_history_row', read_csv_assoc($historyPath));
$dailyCalorieGoal = load_daily_calorie_goal($goalsPath);

// Final response shape must match what useDashboardData expects.
echo json_encode([
    'foods' => $foods,
    'dailyCalorieGoal' => $dailyCalorieGoal,
    'weeklyHistory' => $weeklyHistory,
]);
