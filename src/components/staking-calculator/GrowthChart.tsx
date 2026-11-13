import React, { useMemo, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";

export interface ChartPoint {
  index: number;
  yearFraction: number;
  balance: number;
  rewards: number;
}

interface GrowthChartProps {
  points: ChartPoint[];
  tokenPrice: number | null;
}

const WIDTH = 640;
const HEIGHT = 280;
const PAD = { top: 24, right: 16, bottom: 36, left: 64 };

const money = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const GrowthChart = ({ points, tokenPrice }: GrowthChartProps) => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const accent = theme.palette.mode === "dark" ? "#7eebf2" : "#00b4c9";
  const grid = theme.palette.mode === "dark" ? "rgba(255,255,255,0.12)" : "#d7e6e8";
  const label = theme.palette.text.secondary;

  const layout = useMemo(() => {
    const balances = points.map((point) => point.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const span = max - min || Math.max(max, 1);
    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;
    const xAt = (index: number) =>
      PAD.left + (points.length === 1 ? innerWidth / 2 : (innerWidth * index) / (points.length - 1));
    const yAt = (balance: number) =>
      PAD.top + innerHeight - ((balance - min) / span) * innerHeight;
    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.balance)}`)
      .join(" ");
    const area = `${line} L ${xAt(points.length - 1)} ${PAD.top + innerHeight} L ${xAt(0)} ${PAD.top + innerHeight} Z`;
    const yTicks = [0, 0.5, 1].map((fraction) => {
      const balance = min + span * fraction;
      return { balance, y: yAt(balance) };
    });
    return { xAt, yAt, line, area, yTicks, innerHeight };
  }, [points]);

  const active = activeIndex == null ? null : points[activeIndex];

  const move = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relative = (event.clientX - bounds.left) / bounds.width;
    const chartX = relative * WIDTH;
    let nearest = 0;
    let best = Infinity;
    points.forEach((point, index) => {
      const distance = Math.abs(layout.xAt(index) - chartX);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActiveIndex(nearest);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 2, mb: 1 }}>
        <Typography sx={{ color: theme.palette.text.primary, fontWeight: 700 }}>
          Growth
        </Typography>
        <Typography sx={{ color: label, fontSize: 14, textAlign: "right" }}>
          {active
            ? `Year ${active.yearFraction.toFixed(2)} · ${money.format(active.balance)}${
                tokenPrice != null ? ` · $${money.format(active.balance * tokenPrice)}` : ""
              }`
            : "Move across the chart to read a point"}
        </Typography>
      </Box>
      <Box
        sx={{
          borderRadius: "8px",
          backgroundColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.03)" : "#f7fbfb",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          role="img"
          aria-label="Projected staking balance over time"
          onMouseMove={move}
          onMouseLeave={() => setActiveIndex(null)}
          style={{ display: "block", cursor: "crosshair", touchAction: "none" }}
        >
          <defs>
            <linearGradient id="stake-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={theme.palette.mode === "dark" ? 0.45 : 0.35} />
              <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {layout.yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={tick.y}
                y2={tick.y}
                stroke={grid}
              />
              <text x={PAD.left - 8} y={tick.y + 4} textAnchor="end" fill={label} fontSize="11">
                {money.format(tick.balance)}
              </text>
            </g>
          ))}
          <text x={PAD.left} y={HEIGHT - 10} fill={label} fontSize="11">
            Start
          </text>
          <text x={WIDTH - PAD.right} y={HEIGHT - 10} textAnchor="end" fill={label} fontSize="11">
            {points[points.length - 1].yearFraction.toFixed(2)} years
          </text>
          <path d={layout.area} fill="url(#stake-fill)" />
          <path d={layout.line} fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round" />
          {active && activeIndex != null && (
            <g>
              <line
                x1={layout.xAt(activeIndex)}
                x2={layout.xAt(activeIndex)}
                y1={PAD.top}
                y2={PAD.top + layout.innerHeight}
                stroke={accent}
                strokeDasharray="4 4"
              />
              <circle
                cx={layout.xAt(activeIndex)}
                cy={layout.yAt(active.balance)}
                r="5"
                fill={theme.palette.background.paper}
                stroke={accent}
                strokeWidth="3"
              />
            </g>
          )}
        </svg>
      </Box>
    </Box>
  );
};

export default GrowthChart;
