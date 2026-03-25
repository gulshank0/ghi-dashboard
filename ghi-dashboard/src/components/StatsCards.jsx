function StatsCards({ stats }) {
  return (
    <div className="stats-grid">
      <div className="stat-card max">
        <div className="stat-label">
          <span className="stat-icon">▲</span>
          Maximum GHI
        </div>
        <div className="stat-value max">
          {stats.max.toFixed(2)}
          <span className="stat-unit">kWh/m²/day</span>
        </div>
      </div>

      <div className="stat-card min">
        <div className="stat-label">
          <span className="stat-icon">▼</span>
          Minimum GHI
        </div>
        <div className="stat-value min">
          {stats.min.toFixed(2)}
          <span className="stat-unit">kWh/m²/day</span>
        </div>
      </div>

      <div className="stat-card avg">
        <div className="stat-label">
          <span className="stat-icon">◆</span>
          Average GHI
        </div>
        <div className="stat-value avg">
          {stats.avg.toFixed(2)}
          <span className="stat-unit">kWh/m²/day</span>
        </div>
      </div>
    </div>
  );
}

export default StatsCards;
