<?php

// Food entry save endpoint for the React frontend.
// React sends one food entry as JSON and PHP saves it across the foods, meals, m_Items, daily, and streaks tables.
// Checking for a valid session before saving anything.

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
$rawBody = file_get_contents("php://input");
$requestData = json_decode($rawBody, true);

if (!is_array($requestData)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body"]);
    exit;
}

// Pulling out only the fields this endpoint knows how to save.
$name     = trim($requestData['name'] ?? '');
$calories = (float) ($requestData['calories'] ?? 0);
$protein  = (float) ($requestData['protein'] ?? 0);
$carbs    = (float) ($requestData['carbs'] ?? 0);
$fat      = (float) ($requestData['fat'] ?? 0);
$foodId   = trim((string) ($requestData['foodId'] ?? ''));
$source   = trim((string) ($requestData['source'] ?? 'manual'));
$ingredientFoodIds = is_array($requestData['ingredientFoodIds'] ?? null)
    ? $requestData['ingredientFoodIds']
    : [];
$ingredients = is_array($requestData['ingredients'] ?? null)
    ? $requestData['ingredients']
    : [];

if ($name === '' || $calories <= 0) {
    http_response_code(422);
    echo json_encode(["error" => "Food name and calories are required"]);
    exit;
}

$today = date('Y-m-d');
$time  = date('g:i A');

// ---------- Save to MySQL ----------

// Step 1: Finding or creating a food record in the foods library.
// Any food that has an external ID (USDA or barcode) is checked for an existing row first
// so the same food isn't duplicated every time a user logs it.
// Manual foods (no foodId) always create a new row.
$foodRowId = null;

if ($foodId !== '') {
    // Checking if this food already exists in the library by its external ID.
    $stmt = $pdo->prepare("SELECT food_id FROM foods WHERE usda_food_id = ?");
    $stmt->execute([$foodId]);
    $existingFood = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existingFood) {
        $foodRowId = $existingFood['food_id'];
    }
}

if ($foodRowId === null) {
    // Inserting a new food into the library.
    $stmt = $pdo->prepare("
        INSERT INTO foods (usda_food_id, food_name, serving_description, calories_per_serving, protein_g, carbs_g, fat_g, source, created_by_user_id)
        VALUES (?, ?, '100g', ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $foodId !== '' ? $foodId : null,
        $name,
        $calories,
        $protein,
        $carbs,
        $fat,
        $source === 'usda' ? 'usda' : ($source === 'label_scan' ? 'label_scan' : ($source === 'quick' ? 'quick' : 'manual')),
        $userId,
    ]);
    $foodRowId = $pdo->lastInsertId();
}

// Step 2: Finding or creating a meal container for today.
// Using one meal per day per user as the default container for logged foods.
$stmt = $pdo->prepare("SELECT log_id FROM meals WHERE user_id = ? AND log_date = ? LIMIT 1");
$stmt->execute([$userId, $today]);
$existingMeal = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existingMeal) {
    $logId = $existingMeal['log_id'];
} else {
    $stmt = $pdo->prepare("INSERT INTO meals (user_id, log_date, meal_type) VALUES (?, ?, 'other')");
    $stmt->execute([$userId, $today]);
    $logId = $pdo->lastInsertId();
}

// Step 3: Inserting the food item into the meal.
// Taking a snapshot of the nutrition values at the moment of logging.
$stmt = $pdo->prepare("
    INSERT INTO m_Items (log_id, food_id, servings, calories, protein_g, carbs_g, fat_g, add_method)
    VALUES (?, ?, 1.00, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $logId,
    $foodRowId,
    $calories,
    $protein,
    $carbs,
    $fat,
    $source === 'fatsecret' ? 'fatsecret' : ($source === 'label_scan' ? 'label_scan' : ($source === 'quick' ? 'quick' : 'manual')),
]);
$itemId = $pdo->lastInsertId();

// Step 4: Updating the daily summary for today.
// Using INSERT ... ON DUPLICATE KEY UPDATE to keep exactly one row per user per day.
$stmt = $pdo->prepare("
    INSERT INTO daily (user_id, summary_date, total_calories, total_protein_g, total_carbs_g, total_fat_g, foods_logged)
    VALUES (?, ?, ?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
        total_calories  = total_calories  + VALUES(total_calories),
        total_protein_g = total_protein_g + VALUES(total_protein_g),
        total_carbs_g   = total_carbs_g   + VALUES(total_carbs_g),
        total_fat_g     = total_fat_g     + VALUES(total_fat_g),
        foods_logged    = foods_logged    + 1
");
$stmt->execute([$userId, $today, $calories, $protein, $carbs, $fat]);

// Step 5: Updating the user's logging streak.
// Incrementing the streak if they logged yesterday, or resetting to 1 if they missed a day.
$stmt = $pdo->prepare("SELECT * FROM streaks WHERE user_id = ?");
$stmt->execute([$userId]);
$streak = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$streak) {
    // First time this user has ever logged a food.
    $stmt = $pdo->prepare("INSERT INTO streaks (user_id, current_streak, longest_streak, last_log_date) VALUES (?, 1, 1, ?)");
    $stmt->execute([$userId, $today]);
} elseif ($streak['last_log_date'] === $today) {
    // Already logged today, so the streak stays the same.
} elseif ($streak['last_log_date'] === date('Y-m-d', strtotime('-1 day'))) {
    // Logged yesterday, so incrementing the streak and updating the longest streak if needed.
    $newStreak = $streak['current_streak'] + 1;
    $newLongest = max($newStreak, $streak['longest_streak']);
    $stmt = $pdo->prepare("UPDATE streaks SET current_streak = ?, longest_streak = ?, last_log_date = ? WHERE user_id = ?");
    $stmt->execute([$newStreak, $newLongest, $today, $userId]);
} else {
    // Missed at least one day, so resetting the streak to 1.
    $stmt = $pdo->prepare("UPDATE streaks SET current_streak = 1, last_log_date = ? WHERE user_id = ?");
    $stmt->execute([$today, $userId]);
}

// Sending the saved entry back to React so it can update the dashboard without reloading.
echo json_encode([
    "id"               => (string) $itemId,
    "foodId"           => $foodId,
    "source"           => $source,
    "name"             => $name,
    "calories"         => $calories,
    "protein"          => $protein,
    "carbs"            => $carbs,
    "fat"              => $fat,
    "ingredientFoodIds" => array_values($ingredientFoodIds),
    "ingredients"      => array_values($ingredients),
    "time"             => $time,
    "createdAt"        => date('c'),
]);
