import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import './CSS/setDailyCalorieGoalDialog.css'

const MIN_GOAL = 500
const MAX_GOAL = 10000

function SetDailyCalorieGoalDialog({ currentGoal, onClose, onSaveGoal }) {
  const [goal, setGoal] = useState(String(currentGoal))
  const [error, setError] = useState('')

  // Close the dialog with the Escape key.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Save the new calorie goal after validation.
  const handleSubmit = (event) => {
    event.preventDefault()

    const goalNumber = Number(goal)
    if (!goalNumber || goalNumber < MIN_GOAL || goalNumber > MAX_GOAL) {
      setError('Please enter a goal between 500 and 10,000 calories.')
      return
    }

    setError('')
    onSaveGoal(goalNumber)
    onClose()
  }

  return (
    <div className="goal-dialog-overlay" role="presentation" onClick={onClose}>
      <div
        className="goal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-dialog-title"
        aria-describedby="goal-dialog-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="goal-dialog__header">
          <div>
            <h2 className="goal-dialog__title" id="goal-dialog-title">
              Set Daily Calorie Goal
            </h2>
            <p className="goal-dialog__description" id="goal-dialog-description">
              Customize your daily calorie target based on your health goals
            </p>
          </div>

          <button
            className="goal-dialog__close-button"
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <form className="goal-dialog__form" onSubmit={handleSubmit}>
          <label className="goal-dialog__field" htmlFor="calorieGoal">
            <span>Daily Calorie Goal (kcal)</span>
            <input
              id="calorieGoal"
              type="number"
              step="1"
              min={MIN_GOAL}
              max={MAX_GOAL}
              value={goal}
              placeholder="2000"
              onChange={(event) => setGoal(event.target.value)}
            />
          </label>

          {error ? <p className="goal-dialog__error">{error}</p> : null}

          <div className="goal-dialog__info">
            <p className="goal-dialog__info-title">Recommended ranges:</p>
            <ul>
              <li>• Weight loss: 1,500 - 1,800 kcal</li>
              <li>• Maintenance: 2,000 - 2,500 kcal</li>
              <li>• Muscle gain: 2,500 - 3,000 kcal</li>
            </ul>
          </div>

          <div className="goal-dialog__actions">
            <button className="goal-dialog__button goal-dialog__button--outline" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="goal-dialog__button goal-dialog__button--primary" type="submit">
              Save Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SetDailyCalorieGoalDialog
