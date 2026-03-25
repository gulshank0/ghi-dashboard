"""
GHI Data Processing & Visualization
====================================
Aggregates individual GHI CSV files from the GHI/ directory structure,
preprocesses the data, computes monthly statistics, and generates
time-series and monthly summary visualizations.

Dataset: GHI (Global Horizontal Irradiance) — daily total irradiation (kWh/m²/day).
"""

import os
from pathlib import Path

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# ─── Configuration ───────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
GHI_DIR = BASE_DIR / "GHI"
OUTPUT_CSV = BASE_DIR / "combined_ghi.csv"
DAILY_PLOT = BASE_DIR / "daily_ghi_timeseries.png"
MONTHLY_PLOT = BASE_DIR / "monthly_ghi_summary.png"
ROLLING_WINDOW = 30  # days for rolling average


# ─── Step 1: Aggregate all CSV files ────────────────────────────────────────

def load_all_ghi_data(ghi_dir: Path) -> pd.DataFrame:
    """
    Walk through all year-month subdirectories under ghi_dir,
    read each CSV, and concatenate into a single DataFrame.

    Each CSV is expected to have columns: Date, GHI
    """
    frames = []
    file_count = 0
    error_files = []

    # Sort directories to process chronologically
    for month_dir in sorted(ghi_dir.iterdir()):
        if not month_dir.is_dir():
            continue
        for csv_file in sorted(month_dir.glob("*.csv")):
            try:
                df = pd.read_csv(csv_file)
                frames.append(df)
                file_count += 1
            except Exception as e:
                error_files.append((csv_file.name, str(e)))

    if not frames:
        raise ValueError(f"No CSV files found in {ghi_dir}")

    combined = pd.concat(frames, ignore_index=True)
    print(f"✓ Loaded {file_count} CSV files ({len(combined)} rows)")

    if error_files:
        print(f"⚠ Skipped {len(error_files)} files with errors:")
        for name, err in error_files:
            print(f"  - {name}: {err}")

    return combined


# ─── Step 2: Preprocess ─────────────────────────────────────────────────────

def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and prepare the combined DataFrame:
    - Parse the Date column to datetime
    - Drop rows with invalid dates or GHI values
    - Remove duplicates (keep first occurrence)
    - Sort chronologically
    """
    # Parse dates
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")

    # Drop rows where Date could not be parsed
    invalid_dates = df["Date"].isna().sum()
    if invalid_dates > 0:
        print(f"⚠ Dropped {invalid_dates} rows with unparseable dates")
    df = df.dropna(subset=["Date"])

    # Ensure GHI is numeric; coerce non-numeric to NaN then drop
    df["GHI"] = pd.to_numeric(df["GHI"], errors="coerce")
    invalid_ghi = df["GHI"].isna().sum()
    if invalid_ghi > 0:
        print(f"⚠ Dropped {invalid_ghi} rows with invalid GHI values")
    df = df.dropna(subset=["GHI"])

    # Remove duplicate dates
    dupes = df.duplicated(subset=["Date"]).sum()
    if dupes > 0:
        print(f"⚠ Removed {dupes} duplicate date entries")
    df = df.drop_duplicates(subset=["Date"], keep="first")

    # Sort by date
    df = df.sort_values("Date").reset_index(drop=True)

    print(f"✓ Preprocessed: {len(df)} rows | "
          f"{df['Date'].min().date()} → {df['Date'].max().date()}")
    return df


# ─── Step 3: Monthly statistics ─────────────────────────────────────────────

def compute_monthly_stats(df: pd.DataFrame) -> pd.DataFrame:
    """
    Group by year-month and compute:
    - mean, max, min GHI
    - count of observations
    """
    df = df.copy()
    df["YearMonth"] = df["Date"].dt.to_period("M")

    stats = df.groupby("YearMonth").agg(
        Mean_GHI=("GHI", "mean"),
        Max_GHI=("GHI", "max"),
        Min_GHI=("GHI", "min"),
        Observations=("GHI", "count"),
    ).reset_index()

    stats["YearMonth"] = stats["YearMonth"].dt.to_timestamp()
    return stats


# ─── Step 4: Daily time-series plot ─────────────────────────────────────────

def plot_daily_timeseries(df: pd.DataFrame, output_path: Path) -> None:
    """
    Line plot of daily GHI with a 30-day rolling average overlay.
    """
    fig, ax = plt.subplots(figsize=(14, 5))

    # Daily values – subtle markers
    ax.plot(
        df["Date"], df["GHI"],
        color="#93c5fd", linewidth=0.6, alpha=0.7,
        label="Daily GHI",
    )

    # Rolling average
    rolling = df.set_index("Date")["GHI"].rolling(
        window=f"{ROLLING_WINDOW}D", min_periods=3
    ).mean()
    ax.plot(
        rolling.index, rolling.values,
        color="#2563eb", linewidth=2,
        label=f"{ROLLING_WINDOW}-day Rolling Avg",
    )

    # Formatting
    ax.set_title("Daily GHI Time Series (2019–2022)", fontsize=14, fontweight="bold")
    ax.set_xlabel("Date")
    ax.set_ylabel("GHI (kWh/m²/day)")
    ax.legend(loc="upper right")
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    fig.autofmt_xdate(rotation=45)
    ax.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print(f"✓ Saved daily time-series plot → {output_path.name}")


# ─── Step 5: Monthly bar chart ──────────────────────────────────────────────

def plot_monthly_summary(stats: pd.DataFrame, output_path: Path) -> None:
    """
    Bar chart of monthly mean GHI with min–max error bars.
    """
    fig, ax = plt.subplots(figsize=(14, 5))

    # Error bars: distance from mean to min/max
    err_low = stats["Mean_GHI"] - stats["Min_GHI"]
    err_high = stats["Max_GHI"] - stats["Mean_GHI"]

    # Color bars by month-of-year for seasonal intuition
    months = stats["YearMonth"].dt.month
    cmap = plt.cm.RdYlGn  # red (winter/low) → green (summer/high)
    colors = [cmap(m / 12) for m in months]

    ax.bar(
        stats["YearMonth"], stats["Mean_GHI"],
        width=25, color=colors, edgecolor="white", linewidth=0.5,
        yerr=[err_low, err_high], capsize=3, error_kw={"elinewidth": 1, "alpha": 0.6},
        label="Mean GHI (with min/max range)",
    )

    ax.set_title("Monthly Average GHI (2019–2022)", fontsize=14, fontweight="bold")
    ax.set_xlabel("Month")
    ax.set_ylabel("GHI (kWh/m²/day)")
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=3))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    fig.autofmt_xdate(rotation=45)
    ax.legend(loc="upper right")
    ax.grid(axis="y", alpha=0.3)
    plt.tight_layout()
    fig.savefig(output_path, dpi=150)
    plt.close(fig)
    print(f"✓ Saved monthly summary plot → {output_path.name}")


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  GHI Data Processing & Visualization")
    print("=" * 60)

    # 1. Load
    raw = load_all_ghi_data(GHI_DIR)

    # 2. Preprocess
    df = preprocess(raw)

    # 3. Save combined CSV
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"✓ Saved combined dataset → {OUTPUT_CSV.name}")

    # 4. Monthly statistics
    monthly = compute_monthly_stats(df)
    print("\n── Monthly Statistics ──────────────────────────────────────")
    print(monthly.to_string(index=False))

    # 5. Visualizations
    print("\n── Generating Plots ────────────────────────────────────────")
    plot_daily_timeseries(df, DAILY_PLOT)
    plot_monthly_summary(monthly, MONTHLY_PLOT)

    print("\n✅ All done!")


if __name__ == "__main__":
    main()
