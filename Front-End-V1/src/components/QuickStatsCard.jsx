function QuickStatsCard({ stats }) {
  return (
    <section className="quick-stats" aria-label="Quick statistics summary">
      <div className="quick-stats__header">
        <h2 className="quick-stats__title">Quick Stats</h2>
      </div>

      <div className="quick-stats__list" role="list">
        {stats.map((stat) => (
          <div className="quick-stats__row" role="listitem" key={stat.label}>
            <span className="quick-stats__label">{stat.label}</span>
            <span
              className={
                stat.highlight
                  ? 'quick-stats__value quick-stats__value--highlight'
                  : 'quick-stats__value'
              }
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default QuickStatsCard
