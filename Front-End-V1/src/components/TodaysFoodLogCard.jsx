import { Clock3, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import AddFoodForm from './AddFoodForm'

// Show the right item count text.
function getItemCountText(count) {
  return count === 1 ? '1 item logged' : `${count} items logged`
}

function TodaysFoodLogCard({ foods, onAddFood, onDeleteFood }) {
  const [addFoodOpen, setAddFoodOpen] = useState(false)

  // Add the food and close the inline form.
  const handleAddFood = (food) => {
    onAddFood(food)
    setAddFoodOpen(false)
  }

  return (
    <section className="food-log">
      <div className="food-log__header">
        <div>
          <h2 className="food-log__title">Today&apos;s Food Log</h2>
          <p className="food-log__description">{getItemCountText(foods.length)}</p>
        </div>

        <button
          className="food-log__add-button"
          type="button"
          onClick={() => setAddFoodOpen((open) => !open)}
        >
          <Plus size={16} />
          <span>Add Food</span>
        </button>
      </div>

      <div className="food-log__content">
        {addFoodOpen ? (
          <AddFoodForm onAddFood={handleAddFood} onCancel={() => setAddFoodOpen(false)} />
        ) : null}

        {foods.length === 0 && !addFoodOpen ? (
          <div className="food-log__empty">
            <p>No foods logged yet today</p>
            <button
              className="food-log__empty-button"
              type="button"
              onClick={() => setAddFoodOpen(true)}
            >
              <Plus size={16} />
              <span>Add Your First Food</span>
            </button>
          </div>
        ) : null}

        {foods.length > 0 ? (
          <div className="food-log__list" role="list" aria-label="Today's food entries">
            {foods.map((food) => (
              <article className="food-log__item" role="listitem" key={food.id}>
                <div className="food-log__item-main">
                  <div className="food-log__item-top">
                    <h3>{food.name}</h3>
                    <span className="food-log__time" aria-label={`Logged at ${food.time}`}>
                      <Clock3 size={12} />
                      <span>{food.time}</span>
                    </span>
                  </div>

                  <div className="food-log__nutrition">
                    <span className="food-log__calorie-badge">{food.calories} kcal</span>
                    <span>P: {food.protein}g</span>
                    <span>C: {food.carbs}g</span>
                    <span>F: {food.fat}g</span>
                  </div>
                </div>

                <button
                  className="food-log__delete-button"
                  type="button"
                  aria-label={`Delete ${food.name}`}
                  onClick={() => onDeleteFood(food.id)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default TodaysFoodLogCard
