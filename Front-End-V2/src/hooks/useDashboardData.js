import { useEffect, useMemo, useState } from 'react'
import {
  createFoodEntry,
  getDashboardData,
  removeFoodEntry,
  saveDailyCalorieGoal,
} from '../services/dashboardService'

// Custom hook that loads all dashboard data from PHP and exposes functions to add, delete, and update it.
function useDashboardData() {
  const [foods, setFoods] = useState([])
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(0)
  const [weeklyHistory, setWeeklyHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  // Storing the streak and total foods logged returned by PHP.
  const [currentStreak, setCurrentStreak] = useState(0)
  const [totalFoodsLogged, setTotalFoodsLogged] = useState(0)

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      try {
        const data = await getDashboardData()

        if (!isMounted) {
          return
        }

        setFoods(data.foods)
        setDailyCalorieGoal(data.dailyCalorieGoal)
        setWeeklyHistory(data.weeklyHistory)
        // Setting the stats that come from the database instead of calculating them in the frontend.
        setCurrentStreak(data.currentStreak ?? 0)
        setTotalFoodsLogged(data.totalFoodsLogged ?? 0)
        setErrorMessage('')
      } catch (error) {
        console.error('[useDashboardData] failed to load dashboard data:', error)

        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load dashboard data.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [])

  // Deriving goal achievement from the current food list and calorie goal so it updates
  // immediately when food is added or removed without needing a page reload.
  // Capping at 100% and showing 0% when no goal has been set yet.
  const goalAchievement = useMemo(() => {
    if (dailyCalorieGoal <= 0) return 0
    const todayCalories = foods.reduce((sum, food) => sum + food.calories, 0)
    return Math.min(100, Math.round((todayCalories / dailyCalorieGoal) * 100))
  }, [foods, dailyCalorieGoal])

  // Save a new goal value through the service layer.
  const updateDailyCalorieGoal = async (goal) => {
    const savedGoal = await saveDailyCalorieGoal(goal)
    setDailyCalorieGoal(savedGoal)
  }

  // Adding a new food through the service layer and incrementing the running total.
  const addFood = async (food) => {
    const savedFood = await createFoodEntry(food)
    setFoods((current) => [...current, savedFood])
    setTotalFoodsLogged((count) => count + 1)
  }

  // Deleting a food through the service layer and decrementing the running total.
  const deleteFood = async (foodId) => {
    await removeFoodEntry(foodId)
    setFoods((current) => current.filter((food) => food.id !== foodId))
    setTotalFoodsLogged((count) => Math.max(0, count - 1))
  }

  return {
    foods,
    dailyCalorieGoal,
    weeklyHistory,
    currentStreak,
    totalFoodsLogged,
    goalAchievement,
    isLoading,
    errorMessage,
    addFood,
    deleteFood,
    updateDailyCalorieGoal,
  }
}

export default useDashboardData
