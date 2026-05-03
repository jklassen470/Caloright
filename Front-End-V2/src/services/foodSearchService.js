// This file handles food text search.
// React sends a search word here, this file calls our PHP endpoint,
// and PHP talks to the USDA FoodData Central API.
const SEARCH_FOOD_URL = 'http://localhost/CaloServer/searchFood.php'

// Older food APIs sometimes place nutrition in one long description string,
// such as "Per 100g - Calories: 52kcal | Fat: 0.2g".
// This parser is a fallback so the UI can still show useful numbers.
function parseNutritionDescription(description = '') {
  const portionMatch = description.match(/^Per\s+(.+?)\s+-/i)
  const caloriesMatch = description.match(/Calories:\s*([\d.]+)kcal/i)
  const fatMatch = description.match(/Fat:\s*([\d.]+)g/i)
  const carbsMatch = description.match(/Carbs:\s*([\d.]+)g/i)
  const proteinMatch = description.match(/Protein:\s*([\d.]+)g/i)

  return {
    portion: portionMatch?.[1]?.trim() ?? '1 serving',
    calories: Number(caloriesMatch?.[1]) || 0,
    fat: Number(fatMatch?.[1]) || 0,
    carbs: Number(carbsMatch?.[1]) || 0,
    protein: Number(proteinMatch?.[1]) || 0,
  }
}

// Convert one food result into the format used by AddFoodForm.
// This keeps the component simple because it does not need to know
// whether data came from USDA, our PHP wrapper, or an older API shape.
function normalizeFoodResult(item, index) {
  const fallbackName = item.name ?? item.food_name ?? 'Unknown Food'
  const parsedNutrition = parseNutritionDescription(item.description ?? item.food_description)

  return {
    id: String(item.id ?? item.food_id ?? `${fallbackName}-${index}`),
    foodId: String(item.food_id ?? item.id ?? `${fallbackName}-${index}`),
    name: fallbackName,
    portion: item.portion ?? item.serving_size ?? item.serving ?? parsedNutrition.portion,
    calories: Number(item.calories ?? item.kcal) || parsedNutrition.calories,
    protein: Number(item.protein) || parsedNutrition.protein,
    carbs: Number(item.carbs ?? item.carbohydrates) || parsedNutrition.carbs,
    fat: Number(item.fat) || parsedNutrition.fat,
  }
}

// Search the PHP endpoint and shape the response so the React form can use it.
export async function searchFoods(query) {
  // Empty searches should not call the backend.
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return []
  }

  // encodeURIComponent makes spaces and special characters safe inside a URL.
  const requestUrl = `${SEARCH_FOOD_URL}?query=${encodeURIComponent(trimmedQuery)}`
  console.log('[foodSearchService] searching foods:', requestUrl)

  const response = await fetch(requestUrl)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[foodSearchService] search request failed:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    })
    throw new Error('Unable to search foods right now.')
  }

  const data = await response.json()
  console.log('[foodSearchService] raw response:', data)

  // Our PHP endpoint returns { payload: [...] }, but this also supports
  // plain arrays and older { results: [...] } responses while we transition.
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data.payload)
      ? data.payload
      : data.results

  if (!Array.isArray(items)) {
    console.error('[foodSearchService] response was not an array of foods:', data)
    return []
  }

  // Normalize every item before sending it back to the form.
  const normalizedItems = items.map(normalizeFoodResult)
  console.log('[foodSearchService] normalized results:', normalizedItems)

  return normalizedItems
}
