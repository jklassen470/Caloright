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

// Open Food Facts can return nutrition per serving or per 100g.
// We prefer serving values when available because they match what users expect
// after scanning a package. If serving values are missing, we fall back to 100g.
function nutriment_value($nutriments, $servingKey, $hundredGramKey)
{
    if (isset($nutriments[$servingKey]) && $nutriments[$servingKey] !== '') {
        return (float) $nutriments[$servingKey];
    }

    if (isset($nutriments[$hundredGramKey]) && $nutriments[$hundredGramKey] !== '') {
        return (float) $nutriments[$hundredGramKey];
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

// serving_size is usually best for the UI, but quantity is a useful fallback
// when Open Food Facts does not know the serving.
$portion = $product['serving_size'] ?? $product['quantity'] ?? '100g';
$name = trim($product['product_name'] ?? '');

if ($name === '') {
    $name = "Unknown Food";
}

// Return the same kind of food object that AddFoodForm expects from searches.
send_json([
    // The frontend saves foodId for the future database. For barcode products,
    // the barcode is the stable external identifier from Open Food Facts.
    "foodId" => (string) ($product['code'] ?? $barcode),
    "barcode" => $barcode,
    "name" => $name,
    "brandName" => $product['brands'] ?? '',
    "foodType" => "Open Food Facts",
    "portion" => $portion,
    "calories" => nutriment_value($nutriments, "energy-kcal_serving", "energy-kcal_100g"),
    "protein" => nutriment_value($nutriments, "proteins_serving", "proteins_100g"),
    "carbs" => nutriment_value($nutriments, "carbohydrates_serving", "carbohydrates_100g"),
    "fat" => nutriment_value($nutriments, "fat_serving", "fat_100g"),
]);
