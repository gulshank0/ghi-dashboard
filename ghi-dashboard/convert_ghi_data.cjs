/**
 * Converts the combined GHI CSV into a JSON file for the React dashboard.
 * Reads ../combined_ghi.csv and writes public/ghi_data.json.
 *
 * CSV format: Date,GHI
 * JSON format: [{ "timestamp": "YYYY-MM-DD", "ghi": number }, ...]
 */
const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "combined_ghi.csv");
const outPath = path.join(__dirname, "public", "ghi_data.json");

const raw = fs.readFileSync(csvPath, "utf-8");
const lines = raw.trim().split("\n");

// Skip header row
const data = [];
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(",");
  if (parts.length < 2) continue;

  const date = parts[0].trim();
  const ghi = parseFloat(parts[1].trim());

  if (date && !isNaN(ghi)) {
    data.push({ timestamp: date, ghi: Math.round(ghi * 1000) / 1000 });
  }
}

// Sort by date
data.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Wrote ${data.length} data points to ${outPath}`);
