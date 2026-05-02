import { Target } from 'lucide-react'

const DEFAULT_CALORIE_GOAL = 2000

// Format today's date to show under the card title.
function formatTodayDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Keep the goal safe in case an invalid number is passed in.
function getSafeGoal(goal) {
  return goal > 0 ? goal : DEFAULT_CALORIE_GOAL
}

function TodaysCalorieGoalCard({ totalCalories, dailyCalorieGoal, onSetGoalsClick }) {
  const safeGoal = getSafeGoal(dailyCalorieGoal)
  const remainingCalories = safeGoal - totalCalories
  const calorieProgress = (totalCalories / safeGoal) * 100
  const progressValue = Math.min(calorieProgress, 100)
  const hasExceededGoal = calorieProgress > 100
  const todayDate = formatTodayDate()

  return (
    <section className="goal-card" aria-labelledby="today-calorie-goal-title">
      {/* Card header */}
      <div className="goal-card__header">
        <div>
          <h1 className="goal-card__title" id="today-calorie-goal-title">
            Today&apos;s Calorie Goal
          </h1>
          <p className="goal-card__date">{todayDate}</p>
        </div>

        <button className="goal-card__button" type="button" onClick={onSetGoalsClick}>
          <Target size={16} />
          <span>Set Goals</span>
        </button>
      </div>

      {/* Main calorie numbers */}
      <div className="goal-card__stats">
        <div>
          <p className="goal-card__label">Consumed</p>
          <p className="goal-card__consumed">
            <span>{totalCalories}</span>
            <span className="goal-card__consumed-secondary"> / {safeGoal} kcal</span>
          </p>
        </div>

        <div className="goal-card__remaining-block">
          <p className="goal-card__label">Remaining</p>
          <p className="goal-card__remaining">{remainingCalories} kcal</p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="goal-card__progress"
        role="progressbar"
        aria-label="Calorie consumption progress"
        aria-valuemin="0"
        aria-valuemax={safeGoal}
        aria-valuenow={Math.min(totalCalories, safeGoal)}
      >
        <div className="goal-card__progress-fill" style={{ width: `${progressValue}%` }} />
      </div>

      {/* Warning only shows when calories go over the goal */}
      {hasExceededGoal ? (
        <p className="goal-card__warning">You&apos;ve exceeded your daily goal</p>
      ) : null}
    </section>
  )
}

export default TodaysCalorieGoalCard
