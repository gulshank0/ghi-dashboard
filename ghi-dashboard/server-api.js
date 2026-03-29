import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Parses the combined GHI CSV file and returns JSON data.
 * CSV format: Date,GHI
 * Returns: [{ timestamp: "YYYY-MM-DD", ghi: number }, ...]
 */
function parseGhiCsv() {
  const csvPath = resolve(__dirname, "..", "combined_ghi.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 2) continue;

    const date = parts[0].trim();
    const ghi = Number.parseFloat(parts[1].trim());

    if (date && !Number.isNaN(ghi)) {
      data.push({ timestamp: date, ghi: Math.round(ghi * 1000) / 1000 });
    }
  }

  data.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return data;
}

/**
 * Vite plugin that exposes /api/ghi-data endpoint.
 * Reads the combined_ghi.csv at runtime and serves it as JSON.
 */
export default function ghiApiPlugin() {
  return {
    name: "ghi-api",
    configureServer(server) {
      server.middlewares.use("/api/ghi-data", (_req, res) => {
        try {
          const data = parseGhiCsv();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
    closeBundle() {
      try {
        const data = parseGhiCsv();
        const outDir = resolve(__dirname, "dist", "api");
        mkdirSync(outDir, { recursive: true });
        writeFileSync(
          resolve(outDir, "ghi-data"),
          JSON.stringify(data),
          "utf-8",
        );
        console.log(`✓ Generated dist/api/ghi-data (${data.length} records)`);
      } catch (err) {
        console.error("⚠ Failed to generate static GHI data:", err.message);
      }
    },
  };
}
