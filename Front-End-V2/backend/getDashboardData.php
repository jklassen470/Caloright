<?php

// Dashboard data endpoint for the React frontend.
// React calls this when the dashboard first loads.
// Reading today's food entries, the user's calorie goal, and weekly history from the database and returning them as JSON.

require_once __DIR__ . '/db.php';
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handling the browser's CORS preflight request before doing any work.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Returning an error if anything other than a GET request is sent.
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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
$today  = date('Y-m-d');

// Loading today's food entries by joining meals and m_Items.
// Each row is one food item the user logged today.
$stmt = $pdo->prepare("
    SELECT
        i.item_id,
        i.food_id,
        i.calories,
        i.protein_g,
        i.carbs_g,
        i.fat_g,
        i.add_method,
        f.food_name,
        m.logged_at
    FROM m_Items i
    JOIN meals m ON i.log_id = m.log_id
    JOIN foods f ON i.food_id = f.food_id
    WHERE m.user_id = ? AND m.log_date = ?
    ORDER BY m.logged_at ASC
");
$stmt->execute([$userId, $today]);
$foodRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$foods = array_map(function($row) {
    return [
        'id'       => (string) $row['item_id'],
        'foodId'   => (string) $row['food_id'],
        'source'   => $row['add_method'],
        'name'     => $row['food_name'],
        'calories' => (float) $row['calories'],
        'protein'  => (float) $row['protein_g'],
        'carbs'    => (float) $row['carbs_g'],
        'fat'      => (float) $row['fat_g'],
        'time'     => date('g:i A', strtotime($row['logged_at'])),
        'createdAt' => $row['logged_at'],
        'ingredientFoodIds' => [],
        'ingredients'       => [],
    ];
}, $foodRows);

// Loading the user's active calorie goal.
// Defaulting to 2000 if no goal has been set yet.
$stmt = $pdo->prepare("
    SELECT daily_calorie_target, period_start, period_end
    FROM user_goals
    WHERE user_id = ? AND is_active = 1
    ORDER BY created_at DESC
    LIMIT 1
");
$stmt->execute([$userId]);
$goal = $stmt->fetch(PDO::FETCH_ASSOC);
$dailyCalorieGoal = $goal ? (int) $goal['daily_calorie_target'] : 2000;

// Loading the last 6 days of calorie history for the weekly chart.
// Excluding today because the frontend adds today's total separately.
$stmt = $pdo->prepare("
    SELECT summary_date, total_calories
    FROM daily
    WHERE user_id = ? AND summary_date < ?
    ORDER BY summary_date DESC
    LIMIT 6
");
$stmt->execute([$userId, $today]);
$historyRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Reversing the rows so the chart shows oldest to newest left to right.
$historyRows = array_reverse($historyRows);

$weeklyHistory = array_map(function($row) {
    return [
        'id'       => $row['summary_date'],
        'day'      => date('D', strtotime($row['summary_date'])),
        'calories' => (float) $row['total_calories'],
    ];
}, $historyRows);

// Loading the user's current logging streak.
$stmt = $pdo->prepare("SELECT current_streak FROM streaks WHERE user_id = ?");
$stmt->execute([$userId]);
$streakRow = $stmt->fetch(PDO::FETCH_ASSOC);
$currentStreak = $streakRow ? (int) $streakRow['current_streak'] : 0;

// Loading the total number of foods the user has ever logged.
$stmt = $pdo->prepare("SELECT SUM(foods_logged) as total FROM daily WHERE user_id = ?");
$stmt->execute([$userId]);
$totalRow = $stmt->fetch(PDO::FETCH_ASSOC);
$totalFoodsLogged = $totalRow ? (int) $totalRow['total'] : 0;

// Calculating goal achievement for the current goal period.
// Comparing the average daily calories to the target and returning a percentage.
// Within 5% of the target counts as 100%.
$goalAchievement = 0;

if ($goal) {
    $stmt = $pdo->prepare("
        SELECT AVG(total_calories) as avg_calories
        FROM daily
        WHERE user_id = ? AND summary_date BETWEEN ? AND ?
    ");
    $stmt->execute([$userId, $goal['period_start'], $goal['period_end']]);
    $avgRow = $stmt->fetch(PDO::FETCH_ASSOC);
    $avgCalories = (float) ($avgRow['avg_calories'] ?? 0);

    if ($avgCalories > 0) {
        $target = (float) $goal['daily_calorie_target'];
        $diff = abs($avgCalories - $target) / $target;

        if ($diff <= 0.05) {
            $goalAchievement = 100;
        } else {
            $goalAchievement = max(0, (int) round((1 - $diff) * 100));
        }
    }
}

echo json_encode([
    'foods'            => $foods,
    'dailyCalorieGoal' => $dailyCalorieGoal,
    'weeklyHistory'    => $weeklyHistory,
    'currentStreak'    => $currentStreak,
    'totalFoodsLogged' => $totalFoodsLogged,
    'goalAchievement'  => $goalAchievement,
]);
