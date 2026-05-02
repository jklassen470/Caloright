const SEARCH_FOOD_URL = 'http://localhost/CaloServer/searchFood.php'

function normalizeFoodResult(item, index) {
  return {
    id: String(item.id ?? item.food_id ?? item.name ?? index),
    name: item.name ?? item.food_name ?? 'Unknown Food',
    portion: item.portion ?? item.serving_size ?? item.serving ?? '1 serving',
    calories: Number(item.calories ?? item.kcal) || 0,
    protein: Number(item.protein) || 0,
    carbs: Number(item.carbs ?? item.carbohydrates) || 0,
    fat: Number(item.fat) || 0,
  }
}

// Search the PHP endpoint and shape the response so the React form can use it.
export async function searchFoods(query) {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return []
  }

  const response = await fetch(`${SEARCH_FOOD_URL}?query=${encodeURIComponent(trimmedQuery)}`)

  if (!response.ok) {
    throw new Error('Unable to search foods right now.')
  }

  const data = await response.json()
  const items = Array.isArray(data) ? data : data.results

  if (!Array.isArray(items)) {
    return []
  }

  return items.map(normalizeFoodResult)
}
