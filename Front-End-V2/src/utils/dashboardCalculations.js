// Add all calories for today's foods.
export function calculateTotalCalories(foods) {
  return foods.reduce((sum, food) => sum + food.calories, 0)
}

// Add one macro across all foods.
export function calculateMacroTotal(foods, macroKey) {
  return foods.reduce((sum, food) => sum + food[macroKey], 0)
}

// Build the weekly chart data with today's calories at the end.
export function buildWeeklyProgressData(weeklyHistory, dailyCalorieGoal, todayCalories) {
  const daysWithGoal = weeklyHistory.map((entry) => ({
    ...entry,
    goal: dailyCalorieGoal,
  }))

  return [
    ...daysWithGoal,
    {
      id: 'today',
      day: 'Today',
      calories: todayCalories,
      goal: dailyCalorieGoal,
    },
  ]
}

// Build the values for the quick stats card.
export function buildQuickStats(foods, weeklyHistory, dailyCalorieGoal, currentStreak, totalFoodsLogged, goalAchievement) {
  const todayCalories = calculateTotalCalories(foods)
  const totalWeeklyCalories = weeklyHistory.reduce((sum, day) => sum + day.calories, todayCalories)
  const averageDailyCalories = Math.round(totalWeeklyCalories / (weeklyHistory.length + 1))

  return [
    { label: 'Average Daily Calories', value: `${averageDailyCalories.toLocaleString()} kcal` },
    { label: 'Streak', value: `${currentStreak} days 🔥`, highlight: true },
    { label: 'Foods Logged', value: `${totalFoodsLogged} total` },
    { label: 'Goal Achievement', value: `${goalAchievement}%` },
  ]
}
