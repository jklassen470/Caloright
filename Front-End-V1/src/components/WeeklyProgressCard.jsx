import { TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

// Keep the tooltip text short and easy to read.
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="weekly-progress__tooltip">
      <p>{label}</p>
      <span>{payload[0].value} calories</span>
    </div>
  )
}

function WeeklyProgressCard({ weeklyData, dailyCalorieGoal }) {
  return (
    <section
      className="weekly-progress"
      aria-label="Weekly calorie progress chart showing the last 7 days"
    >
      <div className="weekly-progress__header">
        <div>
          <div className="weekly-progress__title-row">
            <TrendingUp size={20} />
            <h2 className="weekly-progress__title">Weekly Progress</h2>
          </div>
          <p className="weekly-progress__description">Last 7 days</p>
        </div>
      </div>

      <div className="weekly-progress__chart">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={42} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(34, 197, 94, 0.08)' }} />
            <ReferenceLine y={dailyCalorieGoal} stroke="#22c55e" strokeDasharray="3 3" />
            <Bar
              dataKey="calories"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default WeeklyProgressCard
