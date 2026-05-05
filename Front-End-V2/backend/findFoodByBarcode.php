<?php

// Barcode lookup endpoint.
// React sends a scanned barcode here, and PHP looks up product nutrition
// from Open Food Facts. This is separate from searchFood.php because barcode
// products usually come from packaged-food databases, not USDA search.

// Allow the Vite React development server to call this PHP file.
// In production, this should be changed to the real frontend domain.
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Browsers send an OPTIONS request before some cross-origin requests.
// We answer it early so the real GET request can happen afterward.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Small helper so every response has the same JSON format behavior.
function send_json($payload, $statusCode = 200)
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

// Keep only numbers and convert UPC-A style barcodes to GTIN-13 by adding
// leading zeroes. Example: 28400705691 becomes 0028400705691.
function normalize_barcode($barcode)
{
    $digitsOnly = preg_replace('/\D+/', '', $barcode);

    if ($digitsOnly === '') {
        return '';
    }

    return str_pad($digitsOnly, 13, '0', STR_PAD_LEFT);
}

// Using per-100g values consistently so barcode results match the USDA search format.
// Falling back to per-serving values only when 100g data is missing.
function nutriment_value($nutriments, $hundredGramKey, $servingKey)
{
    if (isset($nutriments[$hundredGramKey]) && $nutriments[$hundredGramKey] !== '') {
        return (float) $nutriments[$hundredGramKey];
    }

    if (isset($nutriments[$servingKey]) && $nutriments[$servingKey] !== '') {
        return (float) $nutriments[$servingKey];
    }

    return 0;
}

// Makes one Open Food Facts request and returns both the HTTP details and body.
// Keeping this in a function lets us try a fallback endpoint if the first one
// returns something unexpected, like an HTML error page instead of JSON.
function fetch_open_food_facts($lookupUrl)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $lookupUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, "CaloRightStudentProject/1.0 (local development)");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Accept: application/json",
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_errno($ch) ? curl_error($ch) : null;
    curl_close($ch);

    return [
        "url" => $lookupUrl,
        "body" => $response,
        "httpCode" => $httpCode,
        "curlError" => $curlError,
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_json(["error" => "Method not allowed"], 405);
}

// Read and normalize the barcode from the URL:
// findFoodByBarcode.php?barcode=0028400705691
$barcode = normalize_barcode($_GET['barcode'] ?? '');

if ($barcode === '') {
    send_json(["error" => "Barcode is required"], 422);
}

// Open Food Facts does not need OAuth for public product lookup. We request only
// the fields the React app needs so the response stays small.
$fields = "code,product_name,brands,quantity,serving_size,nutriments";
$lookupUrl = "https://world.openfoodfacts.org/api/v2/product/"
    . urlencode($barcode)
    . ".json?"
    . http_build_query(["fields" => $fields]);

$lookupResult = fetch_open_food_facts($lookupUrl);

if ($lookupResult['curlError'] !== null) {
    send_json([
        "error" => "Failed to connect to Open Food Facts",
        "details" => $lookupResult['curlError'],
    ], 500);
}

$lookupData = json_decode($lookupResult['body'], true);

// If API v2 ever returns a non-JSON response, try the older product endpoint.
// It returns the same product/status structure and is useful as a safety net.
if (!is_array($lookupData)) {
    $fallbackUrl = "https://world.openfoodfacts.org/api/v0/product/"
        . urlencode($barcode)
        . ".json";
    $lookupResult = fetch_open_food_facts($fallbackUrl);
    $lookupData = json_decode($lookupResult['body'], true);
}

if (!is_array($lookupData)) {
    send_json([
        "error" => "Open Food Facts returned invalid JSON",
        "httpCode" => $lookupResult['httpCode'],
        // A short preview helps us debug without dumping a huge HTML page.
        "bodyPreview" => substr((string) $lookupResult['body'], 0, 300),
        "lookupUrl" => $lookupResult['url'],
    ], 502);
}

if (($lookupData['status'] ?? 0) !== 1 || !isset($lookupData['product'])) {
    send_json([
        "error" => "No food item found for this barcode",
        "barcode" => $barcode,
        "status" => $lookupData['status'] ?? null,
        "statusVerbose" => $lookupData['status_verbose'] ?? null,
    ], 404);
}

$product = $lookupData['product'];
$nutriments = $product['nutriments'] ?? [];

$name = trim($product['product_name'] ?? '');

if ($name === '') {
    $name = "Unknown Food";
}

// Pulling the per-100g values from the API — used when the user switches to grams or mL mode.
$calories100g = nutriment_value($nutriments, "energy-kcal_100g", "energy-kcal_serving");
$protein100g  = nutriment_value($nutriments, "proteins_100g", "proteins_serving");
$carbs100g    = nutriment_value($nutriments, "carbohydrates_100g", "carbohydrates_serving");
$fat100g      = nutriment_value($nutriments, "fat_100g", "fat_serving");

// Detecting the serving unit and numeric amount from the serving_size string.
// Using a negative lookahead on the gram pattern to avoid matching "mg".
$servingSizeRaw = trim($product['serving_size'] ?? '');
$servingUnit    = null;
$servingAmount  = null;

if ($servingSizeRaw !== '') {
    if (preg_match('/(\d+\.?\d*)\s*ml/i', $servingSizeRaw, $matches)) {
        $servingUnit   = 'mL';
        $servingAmount = (float) $matches[1];
    } elseif (preg_match('/(\d+\.?\d*)\s*g(?![a-z])/i', $servingSizeRaw, $matches)) {
        $servingUnit   = 'g';
        $servingAmount = (float) $matches[1];
    }
}

// Using serving_quantity from nutriments as a reliable gram value when available.
$servingQuantityGrams = isset($nutriments['serving_quantity']) && (float) $nutriments['serving_quantity'] > 0
    ? (float) $nutriments['serving_quantity']
    : null;

// Calculating per-serving nutrition using the best available data.
// Trying _serving nutriment values first, then scaling from _100g using the serving weight in grams,
// then parsing the gram value from the serving_size string, and falling back to _100g if nothing else works.
if (isset($nutriments['energy-kcal_serving']) && $nutriments['energy-kcal_serving'] !== '') {
    // Using pre-calculated per-serving values from the API directly.
    $caloriesServing = (float) $nutriments['energy-kcal_serving'];
    $proteinServing  = (float) ($nutriments['proteins_serving'] ?? 0);
    $carbsServing    = (float) ($nutriments['carbohydrates_serving'] ?? 0);
    $fatServing      = (float) ($nutriments['fat_serving'] ?? 0);
    $portionLabel    = $servingAmount !== null ? "{$servingAmount} {$servingUnit}" : '1 serving';
} elseif ($servingQuantityGrams !== null) {
    // Scaling per-100g values by the serving weight in grams.
    $scale           = $servingQuantityGrams / 100;
    $caloriesServing = round($calories100g * $scale, 2);
    $proteinServing  = round($protein100g  * $scale, 2);
    $carbsServing    = round($carbs100g    * $scale, 2);
    $fatServing      = round($fat100g      * $scale, 2);
    $portionLabel    = "{$servingQuantityGrams}g";
    if ($servingUnit === null) {
        $servingUnit   = 'g';
        $servingAmount = $servingQuantityGrams;
    }
} elseif ($servingAmount !== null && $servingUnit === 'g') {
    // Scaling from the gram value parsed out of the serving_size string.
    $scale           = $servingAmount / 100;
    $caloriesServing = round($calories100g * $scale, 2);
    $proteinServing  = round($protein100g  * $scale, 2);
    $carbsServing    = round($carbs100g    * $scale, 2);
    $fatServing      = round($fat100g      * $scale, 2);
    $portionLabel    = "{$servingAmount}g";
} else {
    // Falling back to per-100g values when no serving size data is available.
    $caloriesServing = $calories100g;
    $proteinServing  = $protein100g;
    $carbsServing    = $carbs100g;
    $fatServing      = $fat100g;
    $portionLabel    = '100g';
    $servingUnit     = 'g';
    $servingAmount   = 100;
}

// Sending per-serving values as the default and per-100g values for weight mode in the frontend.
send_json([
    "foodId"        => (string) ($product['code'] ?? $barcode),
    "barcode"       => $barcode,
    "name"          => $name,
    "brandName"     => $product['brands'] ?? '',
    "foodType"      => "Open Food Facts",
    "portion"       => $portionLabel,
    "servingUnit"   => $servingUnit,
    "servingAmount" => $servingAmount,
    "calories"      => $caloriesServing,
    "protein"       => $proteinServing,
    "carbs"         => $carbsServing,
    "fat"           => $fatServing,
    "calories100g"  => $calories100g,
    "protein100g"   => $protein100g,
    "carbs100g"     => $carbs100g,
    "fat100g"       => $fat100g,
]);
