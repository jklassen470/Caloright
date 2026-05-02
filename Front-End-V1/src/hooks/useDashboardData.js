import { useEffect, useState } from 'react'
import {
  createFoodEntry,
  getDashboardData,
  removeFoodEntry,
  saveDailyCalorieGoal,
} from '../services/dashboardService'

function useDashboardData() {
  const [foods, setFoods] = useState([])
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(2000)
  const [weeklyHistory, setWeeklyHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadDashboardData = async () => {
      const data = await getDashboardData()

      if (!isMounted) {
        return
      }

      setFoods(data.foods)
      setDailyCalorieGoal(data.dailyCalorieGoal)
      setWeeklyHistory(data.weeklyHistory)
      setIsLoading(false)
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [])

  // Save a new goal value through the service layer.
  const updateDailyCalorieGoal = async (goal) => {
    const savedGoal = await saveDailyCalorieGoal(goal)
    setDailyCalorieGoal(savedGoal)
  }

  // Add a new food through the service layer.
  const addFood = async (food) => {
    const savedFood = await createFoodEntry(food)
    setFoods((current) => [...current, savedFood])
  }

  // Delete a food through the service layer.
  const deleteFood = async (foodId) => {
    await removeFoodEntry(foodId)
    setFoods((current) => current.filter((food) => food.id !== foodId))
  }

  return {
    foods,
    dailyCalorieGoal,
    weeklyHistory,
    isLoading,
    addFood,
    deleteFood,
    updateDailyCalorieGoal,
  }
}

export default useDashboardData
