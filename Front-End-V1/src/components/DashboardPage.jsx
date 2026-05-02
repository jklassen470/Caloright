import { useState } from 'react'

// Import UI components
import DashboardFooter from './DashboardFooter'
import Navbar from './Navbar'
import MacronutrientBreakdownCard from './MacronutrientBreakdownCard'
import QuickStatsCard from './QuickStatsCard'
import SetDailyCalorieGoalDialog from './SetDailyCalorieGoalDialog'
import TodaysCalorieGoalCard from './TodaysCalorieGoalCard'
import TodaysFoodLogCard from './TodaysFoodLogCard'
import WeeklyProgressCard from './WeeklyProgressCard'

// Import custom hook (THIS is where data is loaded)
import useDashboardData from '../hooks/useDashboardData'

// Import calculation helpers (pure functions, no data fetching)
import {
  buildQuickStats,
  buildWeeklyProgressData,
  calculateMacroTotal,
  calculateTotalCalories,
} from '../utils/dashboardCalculations'

// Import CSS
import './CSS/dashboard.css'


// Main dashboard component
function DashboardPage({ userName = 'John Doe' }) {
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const {
    foods,
    dailyCalorieGoal,
    weeklyHistory,
    isLoading,
    addFood,
    deleteFood,
    updateDailyCalorieGoal,
  } = useDashboardData()

  
  const totalCalories = calculateTotalCalories(foods)
  const totalProtein = calculateMacroTotal(foods, 'protein')
  const totalCarbs = calculateMacroTotal(foods, 'carbs')
  const totalFat = calculateMacroTotal(foods, 'fat')
  const weeklyProgressData = buildWeeklyProgressData(weeklyHistory, dailyCalorieGoal, totalCalories)
  const quickStats = buildQuickStats(foods, weeklyHistory, dailyCalorieGoal)

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <Navbar userName={userName} />
        <main className="dashboard-main">
          <div className="dashboard-main__inner">
            <div className="dashboard-main__column">
              <section className="dashboard-loading-card">
                <p>Loading dashboard...</p>
              </section>
            </div>
          </div>
        </main>
        <DashboardFooter />
      </div>
    )
  }

  // ===== MAIN UI =====
  return (
    <div className="dashboard-page">

      {/* Navbar rendered component rendered top */}
      <Navbar userName={userName} />

      <main className="dashboard-main">
        <div className="dashboard-main__inner">
          <div className="dashboard-main__column">


            {/* TodaysCalorieGoalCard component rendered here */}
            <TodaysCalorieGoalCard
              totalCalories={totalCalories}
              dailyCalorieGoal={dailyCalorieGoal}
              onSetGoalsClick={() => setGoalDialogOpen(true)}
            />

            {/* WeeklyProgressCard + QuickStatsCard component rendered together */}
            <div className="dashboard-main__stats-grid">
              <WeeklyProgressCard weeklyData={weeklyProgressData} dailyCalorieGoal={dailyCalorieGoal} />
              <QuickStatsCard stats={quickStats} />
            </div>

            {/* MacronutrientBreakdownCard component rendered here */}
            <MacronutrientBreakdownCard
              protein={totalProtein}
              carbs={totalCarbs}
              fat={totalFat}
            />

            {/* TodaysFoodLogCard component rendered here */}
            <TodaysFoodLogCard
              foods={foods}
              onAddFood={addFood}
              onDeleteFood={deleteFood}
            />
          </div>
        </div>
      </main>

      <DashboardFooter />

      {goalDialogOpen ? (
        <SetDailyCalorieGoalDialog
          currentGoal={dailyCalorieGoal}
          onClose={() => setGoalDialogOpen(false)}
          onSaveGoal={updateDailyCalorieGoal}
        />
      ) : null}
    </div>
  )
}

export default DashboardPage
