import { useState, useEffect } from "react";
import GHIChart from "./components/GHIChart";
import StatsCards from "./components/StatsCards";
import RangeToggle from "./components/RangeToggle";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  const [allData, setAllData] = useState([]);
  const [range, setRange] = useState("30D");
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from local JSON
  useEffect(() => {
    fetch("/ghi_data.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch GHI data");
        return res.json();
      })
      .then((data) => {
        setAllData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Apply theme to HTML
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Filter data by selected range
  const getFilteredData = () => {
    if (allData.length === 0) return [];

    const lastDate = new Date(allData[allData.length - 1].timestamp);
    let cutoff = new Date(lastDate);

    switch (range) {
      case "1D":
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case "7D":
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case "30D":
        cutoff.setDate(cutoff.getDate() - 30);
        break;
      default:
        cutoff.setDate(cutoff.getDate() - 30);
    }

    return allData.filter((d) => new Date(d.timestamp) >= cutoff);
  };

  const filteredData = getFilteredData();

  // Compute stats
  const stats = {
    max:
      filteredData.length > 0 ? Math.max(...filteredData.map((d) => d.ghi)) : 0,
    min:
      filteredData.length > 0 ? Math.min(...filteredData.map((d) => d.ghi)) : 0,
    avg:
      filteredData.length > 0
        ? filteredData.reduce((sum, d) => sum + d.ghi, 0) / filteredData.length
        : 0,
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span className="loading-text">Loading solar data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading">
        <span className="loading-text" style={{ color: "#ef4444" }}>
          Error: {error}
        </span>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="header-badge">☀ Live Data</span>
          <h1 className="header-title">GHI Dashboard</h1>
          <p className="header-subtitle">
            Global Horizontal Irradiance — Solar resource monitoring
          </p>
        </div>
        <div className="header-right">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Chart */}
      <section className="chart-section">
        <div className="chart-header">
          <div className="chart-title-group">
            <h2 className="chart-title">GHI Time Series</h2>
            <span className="chart-subtitle">
              Daily irradiance (kWh/m²/day) over selected period
            </span>
          </div>
          <RangeToggle range={range} onRangeChange={setRange} />
        </div>

        <GHIChart data={filteredData} theme={theme} />

        <div className="chart-footer">
          <span className="last-updated">
            Last updated:{" "}
            {new Date(
              allData[allData.length - 1]?.timestamp,
            ).toLocaleDateString()}
          </span>
          <span className="data-points-badge">
            {filteredData.length} data points
          </span>
        </div>
      </section>
    </div>
  );
}

export default App;
