// This file handles barcode lookup.
// React gives us the scanned barcode, this service calls PHP,
// and PHP looks up nutrition data from Open Food Facts.
const BARCODE_LOOKUP_URL = 'http://localhost/CaloServer/findFoodByBarcode.php'

// Many US products are UPC-A barcodes with 12 digits, while APIs often
// store them as 13-digit EAN codes. Padding with a leading zero helps both match.
function normalizeUsBarcode(rawBarcode) {
  const digitsOnly = String(rawBarcode).replace(/\D/g, '')

  if (!digitsOnly) {
    return ''
  }

  return digitsOnly.padStart(13, '0')
}

// Look up one barcode and return a food object that AddFoodForm can use.
export async function lookupFoodByBarcode(rawBarcode) {
  const normalizedBarcode = normalizeUsBarcode(rawBarcode)

  if (!normalizedBarcode) {
    throw new Error('No barcode was detected.')
  }

  // The barcode is sent as a query parameter, like:
  // findFoodByBarcode.php?barcode=0028400705691
  const response = await fetch(
    `${BARCODE_LOOKUP_URL}?barcode=${encodeURIComponent(normalizedBarcode)}`,
  )

  const data = await response.json()
  console.log('[barcodeLookupService] raw response:', data)

  if (!response.ok) {
    console.error('[barcodeLookupService] barcode lookup failed:', {
      status: response.status,
      body: data,
    })

    throw new Error(data.error ?? 'Unable to look up barcode.')
  }

  // Make sure nutrition values are numbers so totals can be calculated safely.
  return {
    ...data,
    barcode: normalizedBarcode,
    calories: Number(data.calories) || 0,
    protein: Number(data.protein) || 0,
    carbs: Number(data.carbs) || 0,
    fat: Number(data.fat) || 0,
  }
}
