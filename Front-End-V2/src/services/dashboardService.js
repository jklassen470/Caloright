// This file is the dashboard API layer.
// React components call these functions instead of talking directly to PHP.
// That keeps fetch URLs, JSON parsing, and data cleanup in one easy-to-find place.
const API_BASE_URL = 'http://localhost/CaloServer'

const DASHBOARD_DATA_URL = `${API_BASE_URL}/getDashboardData.php`
const SAVE_DAILY_GOAL_URL = `${API_BASE_URL}/saveDailyGoal.php`
const SAVE_FOOD_ENTRY_URL = `${API_BASE_URL}/saveFoodEntry.php`
const DELETE_FOOD_ENTRY_URL = `${API_BASE_URL}/deleteFoodEntry.php`

// If a newly created food does not come back with a time from PHP,
// we create a friendly display time on the frontend.
function formatFoodTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// PHP and React may use slightly different field names, like food_id vs foodId.
// This helper converts every food entry into the same shape the dashboard expects.
function normalizeFoodEntry(food) {
  return {
    ...food,
    id: String(food.id ?? `local-${Date.now()}`),
    foodId: String(food.foodId ?? food.food_id ?? ''),
    name: food.name ?? 'Unknown food',
    calories: Number(food.calories) || 0,
    protein: Number(food.protein) || 0,
    carbs: Number(food.carbs) || 0,
    fat: Number(food.fat) || 0,
    ingredientFoodIds: Array.isArray(food.ingredientFoodIds) ? food.ingredientFoodIds : [],
    ingredients: Array.isArray(food.ingredients) ? food.ingredients : [],
    time: food.time ?? formatFoodTime(),
    createdAt: food.createdAt ?? '',
  }
}

// The dashboard page expects three main pieces of data:
// saved foods, the user's calorie goal, and weekly calorie history.
// This helper protects the UI from missing CSV files or incomplete backend data.
function normalizeDashboardData(data) {
  return {
    foods: Array.isArray(data.foods) ? data.foods.map(normalizeFoodEntry) : [],
    dailyCalorieGoal: Number(data.dailyCalorieGoal) || 0,
    weeklyHistory: Array.isArray(data.weeklyHistory)
      ? data.weeklyHistory.map((entry) => ({
          id: String(entry.id ?? entry.day ?? ''),
          day: entry.day ?? '',
          calories: Number(entry.calories) || 0,
        }))
      : [],
  }
}

// All PHP endpoints return JSON. This helper gives us one consistent place
// to handle failed requests and show useful error messages in React.
async function parseJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error ?? fallbackMessage)
  }

  return data
}

// Load all dashboard data from PHP/CSV instead of React mock data.
// Called when the dashboard first opens.
export async function getDashboardData() {
  const response = await fetch(DASHBOARD_DATA_URL)
  const data = await parseJsonResponse(response, 'Unable to load dashboard data.')

  return normalizeDashboardData(data ?? {})
}

// Save the daily calorie goal to the backend CSV file.
// PHP writes the latest goal into goals.csv.
export async function saveDailyCalorieGoal(goal) {
  const response = await fetch(SAVE_DAILY_GOAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dailyCalorieGoal: goal }),
  })
  const data = await parseJsonResponse(response, 'Unable to save daily calorie goal.')

  return Number(data.dailyCalorieGoal) || goal
}

// Add a new food item to the backend CSV file.
// This supports normal searched foods, barcode foods, and manual recipe foods.
export async function createFoodEntry(food) {
  const response = await fetch(SAVE_FOOD_ENTRY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(food),
  })
  const savedFood = await parseJsonResponse(response, 'Unable to save food entry.')

  return normalizeFoodEntry(savedFood)
}

// Delete a food item from the backend CSV file.
// The backend removes the matching row from food_log.csv.
export async function removeFoodEntry(foodId) {
  const response = await fetch(DELETE_FOOD_ENTRY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: foodId }),
  })

  await parseJsonResponse(response, 'Unable to delete food entry.')

  return foodId
}
