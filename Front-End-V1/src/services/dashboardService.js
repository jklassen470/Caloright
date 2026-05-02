

// Import initial mock data (acts like a fake database)
import {
  INITIAL_DAILY_CALORIE_GOAL,
  INITIAL_FOODS,
  INITIAL_WEEKLY_HISTORY,
} from '../data/mockDashboardData'

// Create mutable copies of the initial data
// These act like in-memory "tables" that we can update
let mockFoods = [...INITIAL_FOODS]
let mockDailyCalorieGoal = INITIAL_DAILY_CALORIE_GOAL
let mockWeeklyHistory = [...INITIAL_WEEKLY_HISTORY]

// Helper function: format current time (e.g., "8:30 AM")
function formatFoodTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}


// GET DASHBOARD DATA
// =======================

// Returns all data needed by the dashboard
// This mimics a GET API request
export async function getDashboardData() {
  return {
    // Return copies to avoid direct mutation from outside
    foods: [...mockFoods],
    dailyCalorieGoal: mockDailyCalorieGoal,
    weeklyHistory: [...mockWeeklyHistory],
  }
}



// UPDATE DAILY GOAL
// =======================

// Updates the daily calorie goal
// This mimics a POST/PUT API request
export async function saveDailyCalorieGoal(goal) {
  mockDailyCalorieGoal = goal
  return mockDailyCalorieGoal
}




// ADD FOOD ENTRY
// =======================

// Adds a new food item to the list
// This mimics an INSERT operation
export async function createFoodEntry(food) {
  // Create a new food object with additional fields
  const newFood = {
    ...food, // copy existing food data
    id: Date.now().toString(), // generate unique ID
    time: formatFoodTime(), // add current time
  }

  // Add new food to the list (immutably)
  mockFoods = [...mockFoods, newFood]

  // Return the newly created food (like an API response)
  return newFood
}


// =======================
// DELETE FOOD ENTRY
// =======================

// Removes a food item by ID
// This mimics a DELETE operation
export async function removeFoodEntry(foodId) {
  // Keep all foods except the one with matching ID
  mockFoods = mockFoods.filter((food) => food.id !== foodId)

  // Return the deleted ID (confirmation)
  return foodId
}