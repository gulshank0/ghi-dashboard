import React, { useRef, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Filler,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Filler,
  Legend
);

function GHIChart({ data, theme }) {
  const wrapperRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    date: "",
    value: 0,
  });

  const isDark = theme === "dark";

  const colors = useMemo(() => {
    return {
      line: "#f97316",
      gradientStart: isDark ? "rgba(249,115,22,0.45)" : "rgba(234,88,12,0.3)",
      gradientEnd: isDark ? "rgba(249,115,22,0.02)" : "rgba(234,88,12,0.01)",
      grid: isDark ? "rgba(48,54,61,0.5)" : "rgba(0,0,0,0.06)",
      axisText: isDark ? "#8b949e" : "#555770",
      crosshair: isDark ? "rgba(139,148,158,0.3)" : "rgba(0,0,0,0.1)",
      peakGlow: isDark ? "rgba(249,115,22,0.6)" : "rgba(234,88,12,0.4)",
    };
  }, [isDark]);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = data.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    });

    const ghiValues = data.map(d => d.ghi);

    return {
      labels,
      datasets: [
        {
          label: 'GHI',
          data: ghiValues,
          borderColor: colors.line,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;

            if (!chartArea) {
              return null;
            }
            
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom
            );
            gradient.addColorStop(0, colors.gradientStart);
            gradient.addColorStop(1, colors.gradientEnd);
            return gradient;
          },
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: colors.line,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          fill: true,
          tension: 0,
        }
      ]
    };
  }, [data, colors]);

  const crosshairPlugin = useMemo(() => ({
    id: 'crosshair',
    afterDraw: (chart) => {
      if (chart.tooltip?._active?.length) {
        const activePoint = chart.tooltip._active[0];
        const ctx = chart.ctx;
        const x = activePoint.element.x;
        const y = activePoint.element.y;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        const leftX = chart.scales.x.left;
        const rightX = chart.scales.x.right;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = colors.crosshair;
        ctx.lineWidth = 1;

        // Vertical line
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        
        // Horizontal line
        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);
        
        ctx.stroke();
        ctx.restore();
      }
    }
  }), [colors.crosshair]);

  const peakMarkerPlugin = useMemo(() => ({
    id: 'peakMarker',
    afterDraw: (chart) => {
      if (!data || data.length === 0) return;
      const ghiValues = data.map(d => d.ghi);
      const maxGHI = Math.max(...ghiValues);
      const peakIdx = ghiValues.indexOf(maxGHI);
      if (peakIdx >= 0) {
        const meta = chart.getDatasetMeta(0);
        if (meta.data[peakIdx]) {
          const px = meta.data[peakIdx].x;
          const py = meta.data[peakIdx].y;
          const ctx = chart.ctx;
           
          // Outer glow
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fillStyle = colors.peakGlow;
          ctx.fill();

          // Inner dot
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = colors.line;
          ctx.fill();

          // White center
          ctx.beginPath();
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
        }
      }
    }
  }), [data, colors]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      layout: {
        padding: {
          top: 5,
          right: 20,
        }
      },
      animation: {
        duration: 800,
        easing: 'easeOutCubic'
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
          external: (context) => {
            const { chart, tooltip: chartjsTooltip } = context;
            
            if (chartjsTooltip.opacity === 0) {
              setTooltip(prev => ({ ...prev, visible: false }));
              return;
            }

            const dataPoint = chartjsTooltip.dataPoints[0];
            if (!dataPoint) return;

            const rect = wrapperRef.current?.getBoundingClientRect();
            if (!rect) return;

            let tooltipX = chartjsTooltip.caretX + 15;
            let tooltipY = chartjsTooltip.caretY - 40;
            if (tooltipX + 160 > rect.width) tooltipX = chartjsTooltip.caretX - 165;
            if (tooltipY < 10) tooltipY = chartjsTooltip.caretY + 15;

            setTooltip({
              visible: true,
              x: tooltipX,
              y: tooltipY,
              date: dataPoint.label,
              value: dataPoint.raw.toFixed(3),
            });
          }
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          border: {
            display: false
          },
          ticks: {
            color: colors.axisText,
            font: {
              family: 'Inter, sans-serif',
              size: 11
            },
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: typeof window !== "undefined" ? (window.innerWidth < 500 ? 5 : 8) : 8,
            callback: function(value, index) {
              if (data && data[index]) {
                  const date = new Date(data[index].timestamp);
                  return date.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  });
              }
              return this.getLabelForValue(value);
            }
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: data && data.length > 0 ? Math.max(...data.map(d => d.ghi)) * 1.1 : undefined,
          grid: {
            color: colors.grid,
            tickLength: 0,
            borderDash: [4, 4],
          },
          border: {
            display: false,
            dash: [4, 4]
          },
          ticks: {
            color: colors.axisText,
            font: {
              family: 'Inter, sans-serif',
              size: 11
            },
            maxTicksLimit: 6,
            callback: function(value) {
              return value.toFixed(1);
            }
          },
          title: {
            display: true,
            text: 'kWh/m²/day',
            color: colors.axisText,
            font: {
              family: 'Inter, sans-serif',
              size: 12
            },
            padding: {bottom: 10}
          }
        }
      },
    };
  }, [data, colors]);

  const plugins = useMemo(() => [crosshairPlugin, peakMarkerPlugin], [crosshairPlugin, peakMarkerPlugin]);

  if (!data || data.length === 0) return null;

  return (
    <div
      className="chart-canvas-wrapper"
      ref={wrapperRef}
      onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
    >
      <Line data={chartData} options={options} plugins={plugins} />
      <div
        className={`chart-tooltip ${tooltip.visible ? "" : "hidden"}`}
        style={{ left: tooltip.x, top: tooltip.y }}
      >
        <div className="tooltip-date">{tooltip.date}</div>
        <div className="tooltip-value">
          {tooltip.value}
          <span className="tooltip-unit">kWh/m²/day</span>
        </div>
      </div>
    </div>
  );
}

export default GHIChart;
