<?php

// Food search endpoint.
// React calls this file when the user searches for foods by text.
// This PHP file then calls USDA FoodData Central, cleans the response,
// and returns a smaller JSON list that the frontend can display.

// These settings help local debugging while keeping browser output clean.
// Errors are logged by PHP/XAMPP instead of being mixed into JSON responses.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('serialize_precision', '-1');
ini_set('precision', '14');

// Allow the Vite React frontend to call this PHP endpoint during development.
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Handle the browser's CORS preflight request before doing USDA work.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$debug = [];

// Add one debugging item to the response.
// This is useful while learning because the browser can show each backend step.
function debug_step($label, $value = null)
{
    global $debug;
    $debug[] = [
        "label" => $label,
        "value" => $value
    ];
}

// Send the final response in the wrapper format:
// { "debug": [...], "payload": [...] }
// React reads payload, while students can inspect debug when something breaks.
function debug_response($payload, $statusCode = 200)
{
    global $debug;
    http_response_code($statusCode);
    echo json_encode([
        "debug" => $debug,
        "payload" => $payload
    ], JSON_PRETTY_PRINT);
    exit;
}

// USDA/PHP floating point values can have long tails like
// 3.470000000000000195. This keeps nutrition values readable.
function clean_number($value)
{
    if ($value === null || $value === '') {
        return 0;
    }

    // number_format removes PHP floating-point tails like 3.470000000000000195.
    return (float) number_format((float) $value, 2, '.', '');
}

// Choose the name the user should see in search results.
function display_food_name($food)
{
    $name = $food["description"] ?? "Unknown food";
    $brand = $food["brandOwner"] ?? $food["brandName"] ?? null;

    // USDA branded records often have generic names like "RICE" for many
    // different brands. Add the brand to the display name so users can tell
    // the search results apart in React.
    if ($brand && strtolower($food["dataType"] ?? '') === 'branded') {
        return $name . " (" . $brand . ")";
    }

    return $name;
}

// Get the search query from the URL (?query=apple).
// By default we search USDA's generic datasets because they are better for
// recipe ingredients. If you want packaged brand results too, use:
// searchFood.php?query=rice&includeBranded=1
$query = $_GET['query'] ?? '';
$includeBranded = ($_GET['includeBranded'] ?? '') === '1';

debug_step("searchFood.php called", [
    "query" => $query,
    "includeBranded" => $includeBranded,
]);

// If no query is provided, return an empty array
if (!$query) {
    debug_step("No query provided");
    debug_response([]);
}

// Read the USDA FoodData Central API key from the server environment.
// Do NOT hardcode real API keys in this file before uploading to GitHub.
// Local setup example:
// export USDA_API_KEY="your_api_key_here"
$apiKey = getenv("USDA_API_KEY") ?: "";

if ($apiKey === "") {
    debug_step("Missing USDA API key");
    debug_response([
        "error" => "USDA API key is not configured on the server",
        "setup_hint" => "Set the USDA_API_KEY environment variable before using food search.",
    ], 500);
}

// Build USDA search URL.
// We use the POST + JSON format from the USDA docs:
// POST /fdc/v1/foods/search?api_key=...
// Body: { "query": "rice", "pageSize": 10 }
$searchUrl = "https://api.nal.usda.gov/fdc/v1/foods/search"."?api_key=".urlencode($apiKey);

$searchRequestBody = [
    "query" => $query,
    "pageSize" => 25,
    "sortBy" => "dataType.keyword",
    "sortOrder" => "asc",
];

if (!$includeBranded) {
    $searchRequestBody["dataType"] = [
        "Foundation",
        "SR Legacy",
        "Survey (FNDDS)",
    ];
}

// Do not print the real API key into the browser response.
// The frontend can see debug JSON, so we mask the key while debugging.
$debugSearchUrl = str_replace(urlencode($apiKey), "API_KEY_HIDDEN", $searchUrl);
debug_step("USDA search URL", $debugSearchUrl);
debug_step("USDA search JSON body", $searchRequestBody);

// Create a cURL request
$ch = curl_init();

// Set the URL for the USDA search request
curl_setopt($ch, CURLOPT_URL, $searchUrl);

// Tell USDA this is a POST request with JSON data.
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($searchRequestBody));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Accept: application/json",
]);

// Receive server response as a string
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);

// Execute search request
$searchResponse = curl_exec($ch);
$searchHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

debug_step("USDA search HTTP code", $searchHttpCode);

// Check for cURL errors
if (curl_errno($ch)) {
    $errorMessage = curl_error($ch);
    debug_step("USDA search request failed", $errorMessage);

    debug_response([
        "error" => "Failed to search USDA foods",
        "query" => $query,
        "search_url" => $searchUrl,
        "curl_error" => $errorMessage,
    ], 500);
}

// Convert JSON into PHP array
$searchData = json_decode($searchResponse, true);

if (!is_array($searchData)) {
    debug_step("USDA JSON decode failed", substr((string) $searchResponse, 0, 300));

    debug_response([
        "error" => "USDA returned invalid JSON",
        "query" => $query,
    ], 502);
}

debug_step("USDA search summary", [
    "totalHits" => $searchData["totalHits"] ?? 0,
    "returnedFoods" => count($searchData["foods"] ?? []),
]);

// Prepare clean result array
$foods = [];

// USDA returns food items inside "foods"
if (isset($searchData['foods'])) {
    foreach ($searchData['foods'] as $food) {
        if (count($foods) >= 10) {
            break;
        }

        $nutrients = $food['foodNutrients'] ?? [];

        // Start as null so we can tell the difference between "missing"
        // and an actual zero value from USDA.
        $calories = null;
        $protein = null;
        $carbs = null;
        $fat = null;

        foreach ($nutrients as $nutrient) {
            $name = strtolower($nutrient['nutrientName'] ?? '');
            $unit = strtolower($nutrient['unitName'] ?? '');
            $value = $nutrient['value'] ?? null;

            // USDA can name energy a few different ways, especially in
            // Foundation foods, such as "Energy (Atwater General Factors)".
            // React expects calories, so prefer kcal. If only kJ exists, convert
            // kJ to kcal as a fallback.
            if (strpos($name, 'energy') !== false && $unit === 'kcal') {
                $calories = $value;
            }

            if ($calories === null && strpos($name, 'energy') !== false && $unit === 'kj') {
                $calories = ((float) $value) * 0.239006;
            }

            if ($name === 'protein') {
                $protein = $value;
            }

            if ($name === 'carbohydrate, by difference') {
                $carbs = $value;
            }

            if ($name === 'total lipid (fat)') {
                $fat = $value;
            }
        }

        $foods[] = [
            "food_id" => $food["fdcId"] ?? null,
            "name" => display_food_name($food),
            "brand" => $food["brandOwner"] ?? $food["brandName"] ?? null,
            "calories" => clean_number($calories),
            "protein" => clean_number($protein),
            "carbs" => clean_number($carbs),
            "fat" => clean_number($fat),
            // FoodData Central search nutrients are usually reported per 100g.
            "portion" => "100g",
            "description" => $food["dataType"] ?? "USDA FoodData Central"
        ];
    }
}

debug_step("Cleaned foods returned", $foods);

debug_response($foods);
