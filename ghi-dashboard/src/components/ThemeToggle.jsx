function ThemeToggle({ theme, onToggle }) {
  return (
    <select
      className="theme-selector"
      value={theme}
      onChange={onToggle}
      aria-label="Select theme"
      style={{
        backgroundColor: "var(--bg-card)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        padding: "8px 12px",
        borderRadius: "8px",
        cursor: "pointer",
        outline: "none",
        fontWeight: "500"
      }}
    >
      <option value="dark"> Dark Theme</option>
      <option value="light"> Light Theme</option>
    </select>
  );
}

export default ThemeToggle;
