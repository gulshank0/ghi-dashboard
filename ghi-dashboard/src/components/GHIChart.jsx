import { useRef, useEffect, useState, useCallback } from "react";

function GHIChart({ data, theme }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    date: "",
    value: 0,
  });
  const animProgress = useRef(0);
  const animFrame = useRef(null);

  // Chart drawing constants
  const PADDING = { top: 20, right: 20, bottom: 45, left: 60 };

  const getColors = useCallback(() => {
    const isDark = theme === "dark";
    return {
      line: "#f97316",
      gradientStart: isDark ? "rgba(249,115,22,0.45)" : "rgba(234,88,12,0.3)",
      gradientEnd: isDark ? "rgba(249,115,22,0.02)" : "rgba(234,88,12,0.01)",
      grid: isDark ? "rgba(48,54,61,0.5)" : "rgba(0,0,0,0.06)",
      axisText: isDark ? "#8b949e" : "#555770",
      peakGlow: isDark ? "rgba(249,115,22,0.6)" : "rgba(234,88,12,0.4)",
      crosshair: isDark ? "rgba(139,148,158,0.3)" : "rgba(0,0,0,0.1)",
    };
  }, [theme]);

  const drawChart = useCallback(
    (progress = 1) => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper || data.length === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = wrapper.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      const w = rect.width;
      const h = rect.height;
      const plotW = w - PADDING.left - PADDING.right;
      const plotH = h - PADDING.top - PADDING.bottom;

      const colors = getColors();

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Data ranges
      const ghiValues = data.map((d) => d.ghi);
      const maxGHI = Math.max(...ghiValues) * 1.1;
      const minGHI = 0;

      const toX = (i) => PADDING.left + (i / (data.length - 1)) * plotW;
      const toY = (val) =>
        PADDING.top + plotH - ((val - minGHI) / (maxGHI - minGHI)) * plotH;

      // Grid lines
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const yVal = minGHI + (maxGHI - minGHI) * (i / yTicks);
        const y = toY(yVal);
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(PADDING.left, y);
        ctx.lineTo(w - PADDING.right, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Y labels
        ctx.fillStyle = colors.axisText;
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(yVal.toFixed(1), PADDING.left - 10, y);
      }

      // X labels — always show dates since data is daily
      const xLabelCount = Math.min(data.length, w < 500 ? 4 : 7);
      const step = Math.max(1, Math.floor(data.length / xLabelCount));
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = colors.axisText;
      ctx.font = "11px Inter, sans-serif";

      for (let i = 0; i < data.length; i += step) {
        const x = toX(i);
        const date = new Date(data[i].timestamp);
        const label = date.toLocaleDateString([], {
          month: "short",
          day: "numeric",
        });
        ctx.fillText(label, x, h - PADDING.bottom + 12);
      }

      // Animated data slice
      const visibleCount = Math.max(2, Math.floor(data.length * progress));
      const visibleData = data.slice(0, visibleCount);

      // Area gradient
      const gradient = ctx.createLinearGradient(
        0,
        PADDING.top,
        0,
        h - PADDING.bottom,
      );
      gradient.addColorStop(0, colors.gradientStart);
      gradient.addColorStop(1, colors.gradientEnd);

      // Draw area
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(visibleData[0].ghi));
      for (let i = 1; i < visibleData.length; i++) {
        ctx.lineTo(toX(i), toY(visibleData[i].ghi));
      }
      ctx.lineTo(toX(visibleData.length - 1), h - PADDING.bottom);
      ctx.lineTo(toX(0), h - PADDING.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw line
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(visibleData[0].ghi));
      for (let i = 1; i < visibleData.length; i++) {
        ctx.lineTo(toX(i), toY(visibleData[i].ghi));
      }
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();

      // Peak marker
      if (progress >= 1) {
        const peakIdx = ghiValues.indexOf(Math.max(...ghiValues));
        if (peakIdx >= 0 && peakIdx < data.length) {
          const px = toX(peakIdx);
          const py = toY(data[peakIdx].ghi);

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

      // Y-axis label
      ctx.save();
      ctx.translate(14, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = colors.axisText;
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("kWh/m²/day", 0, 0);
      ctx.restore();
    },
    [data, theme, getColors],
  );

  // Animation on data change
  useEffect(() => {
    animProgress.current = 0;
    const startTime = performance.now();
    const duration = 800;

    const animate = (now) => {
      const elapsed = now - startTime;
      animProgress.current = Math.min(1, elapsed / duration);
      // ease out cubic
      const eased = 1 - Math.pow(1 - animProgress.current, 3);
      drawChart(eased);
      if (animProgress.current < 1) {
        animFrame.current = requestAnimationFrame(animate);
      }
    };

    animFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [data, drawChart]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => drawChart(1);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawChart]);

  // Mouse move for tooltip
  const handleMouseMove = useCallback(
    (e) => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper || data.length === 0) return;

      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const plotW = rect.width - PADDING.left - PADDING.right;

      // Find closest data point
      const relX = mouseX - PADDING.left;
      if (relX < 0 || relX > plotW) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      const idx = Math.round((relX / plotW) * (data.length - 1));
      const clampedIdx = Math.max(0, Math.min(data.length - 1, idx));
      const point = data[clampedIdx];

      const plotH = rect.height - PADDING.top - PADDING.bottom;
      const maxGHI = Math.max(...data.map((d) => d.ghi)) * 1.1;
      const pointX = PADDING.left + (clampedIdx / (data.length - 1)) * plotW;
      const pointY = PADDING.top + plotH - (point.ghi / maxGHI) * plotH;

      // Draw crosshair
      drawChart(1);
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);

      const colors = getColors();
      ctx.strokeStyle = colors.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(pointX, PADDING.top);
      ctx.lineTo(pointX, rect.height - PADDING.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(PADDING.left, pointY);
      ctx.lineTo(rect.width - PADDING.right, pointY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Hover dot
      ctx.beginPath();
      ctx.arc(pointX, pointY, 5, 0, Math.PI * 2);
      ctx.fillStyle = colors.line;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();

      ctx.restore();

      // Position tooltip
      let tooltipX = pointX + 15;
      let tooltipY = pointY - 40;
      if (tooltipX + 160 > rect.width) tooltipX = pointX - 165;
      if (tooltipY < 10) tooltipY = pointY + 15;

      const date = new Date(point.timestamp);
      setTooltip({
        visible: true,
        x: tooltipX,
        y: tooltipY,
        date: date.toLocaleDateString([], {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        value: point.ghi.toFixed(3),
      });
    },
    [data, drawChart, getColors],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
    drawChart(1);
  }, [drawChart]);

  return (
    <div
      className="chart-canvas-wrapper"
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas ref={canvasRef} />
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
