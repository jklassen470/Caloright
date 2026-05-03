import { useEffect, useState } from 'react'
import {
  createFoodEntry,
  getDashboardData,
  removeFoodEntry,
  saveDailyCalorieGoal,
} from '../services/dashboardService'

function useDashboardData() {
  const [foods, setFoods] = useState([])
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(0)
  const [weeklyHistory, setWeeklyHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

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
    errorMessage,
    addFood,
    deleteFood,
    updateDailyCalorieGoal,
  }
}

export default useDashboardData
