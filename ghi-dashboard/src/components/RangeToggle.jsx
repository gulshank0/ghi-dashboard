function RangeToggle({ range, onRangeChange }) {
  const ranges = ["1D", "7D", "30D"];

  return (
    <div className="range-toggle">
      {ranges.map((r) => (
        <button
          key={r}
          className={`range-btn ${range === r ? "active" : ""}`}
          onClick={() => onRangeChange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export default RangeToggle;
