import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const MACRO_STYLES = {
  protein: {
    label: 'Protein',
    valueColorClass: 'macro-breakdown__value--protein',
    boxClass: 'macro-breakdown__box macro-breakdown__box--protein',
    chartColor: '#3b82f6',
  },
  carbs: {
    label: 'Carbs',
    valueColorClass: 'macro-breakdown__value--carbs',
    boxClass: 'macro-breakdown__box macro-breakdown__box--carbs',
    chartColor: '#f59e0b',
  },
  fat: {
    label: 'Fat',
    valueColorClass: 'macro-breakdown__value--fat',
    boxClass: 'macro-breakdown__box macro-breakdown__box--fat',
    chartColor: '#a855f7',
  },
}

// Convert macro grams into calories for the pie chart.
function buildMacroChartData({ protein, carbs, fat }) {
  return [
    {
      id: 'protein',
      name: 'Protein',
      grams: protein,
      value: protein * 4,
    },
    {
      id: 'carbs',
      name: 'Carbs',
      grams: carbs,
      value: carbs * 4,
    },
    {
      id: 'fat',
      name: 'Fat',
      grams: fat,
      value: fat * 9,
    },
  ]
}

// Keep the tooltip text short and readable.
function MacroTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }

  const item = payload[0].payload

  return (
    <div className="macro-breakdown__tooltip">
      <p>{item.name}</p>
      <span>{item.value.toFixed(0)} kcal</span>
    </div>
  )
}

function MacronutrientBreakdownCard({ protein, carbs, fat }) {
  const macroChartData = buildMacroChartData({ protein, carbs, fat })
  const totalMacroCalories = macroChartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <section className="macro-breakdown" aria-label="Macronutrient breakdown">
      <div className="macro-breakdown__header">
        <h2 className="macro-breakdown__title">Macronutrient Breakdown</h2>
        <p className="macro-breakdown__description">Track your protein, carbs, and fats</p>
      </div>

      <div className="macro-breakdown__summary">
        <div className={MACRO_STYLES.protein.boxClass}>
          <p className="macro-breakdown__label">{MACRO_STYLES.protein.label}</p>
          <p className={`macro-breakdown__value ${MACRO_STYLES.protein.valueColorClass}`}>
            {protein.toFixed(2)}g
          </p>
        </div>

        <div className={MACRO_STYLES.carbs.boxClass}>
          <p className="macro-breakdown__label">{MACRO_STYLES.carbs.label}</p>
          <p className={`macro-breakdown__value ${MACRO_STYLES.carbs.valueColorClass}`}>
            {carbs.toFixed(2)}g
          </p>
        </div>

        <div className={MACRO_STYLES.fat.boxClass}>
          <p className="macro-breakdown__label">{MACRO_STYLES.fat.label}</p>
          <p className={`macro-breakdown__value ${MACRO_STYLES.fat.valueColorClass}`}>
            {fat.toFixed(2)}g
          </p>
        </div>
      </div>

      {/* Show a simple empty state when there are no macros yet. */}
      {totalMacroCalories === 0 ? (
        <div className="macro-breakdown__empty">No macronutrient data yet</div>
      ) : (
        <div className="macro-breakdown__chart">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={macroChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={({ percent }) => `${Math.round(percent * 100)}%`}
                isAnimationActive={false}
              >
                {macroChartData.map((item) => (
                  <Cell key={item.id} fill={MACRO_STYLES[item.id].chartColor} />
                ))}
              </Pie>
              <Tooltip content={<MacroTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export default MacronutrientBreakdownCard
