"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SeriesPoint {
  value: number;
  recordedAt: string | Date;
}

export function SeriesChart({
  data,
  color = "#059669",
  unit = "",
}: {
  data: SeriesPoint[];
  color?: string;
  unit?: string;
}) {
  const points = data.map((d) => ({
    value: d.value,
    time: new Date(d.recordedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  if (points.length === 0) {
    return (
      <div className="grid h-40 place-items-center text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  return (
    <div className="h-40 w-full min-w-0">
      <ResponsiveContainer
        width="100%"
        height={160}
        initialDimension={{ width: 1, height: 160 }}
      >
      <AreaChart data={points} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          formatter={(v) => [`${v}${unit}`, ""]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color})`}
        />
      </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
