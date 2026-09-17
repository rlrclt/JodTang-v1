"use client";

import { useMemo, useState } from "react";
import type { MonthTrend as MonthTrendType } from "@/lib/summary-helpers";
import { formatSatang } from "@/lib/format-satang";

type RangeOption = 3 | 6 | 12;
type ChartStyle = "bar" | "line";

function shortBahtLabel(satang: number): string {
  if (satang <= 0) return "";
  const b = satang / 100;
  if (b >= 1000000) return (b / 1000000).toFixed(1) + "M";
  if (b >= 1000) return Math.round(b / 1000) + "k";
  return String(Math.round(b));
}

export default function MonthTrendChart({
  trend,
}: {
  trend: MonthTrendType[];
}) {
  const [range, setRange] = useState<RangeOption>(6);
  const [chartStyle, setChartStyle] = useState<ChartStyle>("bar");

  // ตัดข้อมูลตามช่วงเดือนที่ผู้ใช้เลือก (3, 6 หรือ 12 เดือน)
  const displayTrend = useMemo(() => {
    if (range === 3) return trend.slice(-3);
    if (range === 6) return trend.slice(-6);
    return trend; // 12 เดือน
  }, [trend, range]);

  const hasData = displayTrend.some((m) => m.income > 0 || m.expense > 0);

  const maxValue = useMemo(() => {
    return Math.max(...displayTrend.map((m) => Math.max(m.income, m.expense)), 0);
  }, [displayTrend]);

  // คำนวณพิกัด SVG สำหรับ Smooth Area/Line Curve
  const svgMetrics = useMemo(() => {
    if (displayTrend.length < 2 || maxValue <= 0) return null;
    const width = 360;
    const height = 120;
    const paddingX = 24;
    const paddingTop = 16;
    const paddingBottom = 16;
    const plotHeight = height - paddingTop - paddingBottom;
    const plotWidth = width - paddingX * 2;
    const step = plotWidth / (displayTrend.length - 1);

    const incomePoints = displayTrend.map((m, i) => {
      const x = paddingX + i * step;
      const y = paddingTop + plotHeight - (m.income / maxValue) * plotHeight;
      return { x, y, val: m.income };
    });

    const expensePoints = displayTrend.map((m, i) => {
      const x = paddingX + i * step;
      const y = paddingTop + plotHeight - (m.expense / maxValue) * plotHeight;
      return { x, y, val: m.expense };
    });

    // Helper สร้าง Catmull-Rom หรือ Bezier Smooth Path
    const makeSmoothPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return "";
      let d = `M ${pts[0].x},${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 >= pts.length ? i + 1 : i + 2];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
      }
      return d;
    };

    const incomeLine = makeSmoothPath(incomePoints);
    const expenseLine = makeSmoothPath(expensePoints);

    const lastX = incomePoints[incomePoints.length - 1].x;
    const firstX = incomePoints[0].x;
    const bottomY = height - paddingBottom;

    const incomeArea = `${incomeLine} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
    const expenseArea = `${expenseLine} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

    return {
      width,
      height,
      incomePoints,
      expensePoints,
      incomeLine,
      expenseLine,
      incomeArea,
      expenseArea,
    };
  }, [displayTrend, maxValue]);

  return (
    <div className="space-y-3">
      {/* Controls Bar: Type (Bar / Curve) + Range (3/6/12) */}
      <div className="flex items-center justify-between gap-2">
        {/* สลับรูปแบบ: แท่งมนโค้ง vs กราฟเส้นสมูท */}
        <div className="flex items-center rounded-full bg-surface-2/80 p-0.5 border border-border/40">
          <button
            type="button"
            onClick={() => setChartStyle("bar")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all active:scale-95 ${
              chartStyle === "bar"
                ? "bg-focus text-white shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            <span>📊 แท่ง</span>
          </button>
          <button
            type="button"
            onClick={() => setChartStyle("line")}
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all active:scale-95 ${
              chartStyle === "line"
                ? "bg-focus text-white shadow-xs"
                : "text-text-muted hover:text-text"
            }`}
          >
            <span>📈 เส้นสมูท</span>
          </button>
        </div>

        {/* สลับช่วงเดือน (3, 6, 12 เดือน) */}
        <div className="flex items-center rounded-full bg-surface-2/80 p-0.5 border border-border/40">
          {([3, 6, 12] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all active:scale-95 ${
                range === r
                  ? "bg-focus text-white shadow-xs"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {r} เดือน
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 text-xs pr-1">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-income" />
          <span className="text-[11px] font-medium text-text-muted">รายรับ</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-expense" />
          <span className="text-[11px] font-medium text-text-muted">รายจ่าย</span>
        </div>
      </div>

      {!hasData ? (
        <div className="py-8 text-center text-xs text-text-muted rounded-2xl bg-surface-2/40 border border-dashed border-border/50">
          ยังไม่มีข้อมูลธุรกรรมในช่วง {range} เดือนนี้
        </div>
      ) : chartStyle === "line" && svgMetrics ? (
        /* 1. Smooth Area & Curve Chart สไตล์ Apple Wallet / Revolut */
        <div className="space-y-1 pt-1">
          <div className="relative w-full overflow-hidden rounded-2xl bg-surface-2/30 p-1">
            <svg
              viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`}
              className="w-full h-36 overflow-visible"
            >
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-income, #16a34a)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-income, #16a34a)" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-expense, #dc2626)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-expense, #dc2626)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area Shading */}
              <path d={svgMetrics.incomeArea} fill="url(#incomeGradient)" />
              <path d={svgMetrics.expenseArea} fill="url(#expenseGradient)" />

              {/* Smooth Curves */}
              <path
                d={svgMetrics.incomeLine}
                fill="none"
                stroke="var(--color-income, #16a34a)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={svgMetrics.expenseLine}
                fill="none"
                stroke="var(--color-expense, #dc2626)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points & Numeric Labels */}
              {svgMetrics.incomePoints.map((pt, idx) => (
                <g key={`inc-${idx}`}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    className="fill-surface stroke-income stroke-2 transition-transform hover:scale-125"
                  />
                  {pt.val > 0 && (
                    <text
                      x={pt.x}
                      y={pt.y - 7}
                      textAnchor="middle"
                      className="fill-income text-[9px] font-extrabold"
                    >
                      {shortBahtLabel(pt.val)}
                    </text>
                  )}
                </g>
              ))}

              {svgMetrics.expensePoints.map((pt, idx) => (
                <g key={`exp-${idx}`}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    className="fill-surface stroke-expense stroke-2 transition-transform hover:scale-125"
                  />
                  {pt.val > 0 && (
                    <text
                      x={pt.x}
                      y={pt.y - 7}
                      textAnchor="middle"
                      className="fill-expense text-[9px] font-extrabold"
                    >
                      {shortBahtLabel(pt.val)}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Label เดือนใต้กราฟเส้น */}
          <div className="flex items-center justify-between px-3 pt-0.5">
            {displayTrend.map((m) => (
              <span
                key={`${m.year}-${m.month}`}
                className="text-[10px] font-semibold text-text-muted"
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* 2. Curved Bar Chart พร้อมตัวเลขกำกับ */
        <div className="flex items-end gap-1.5 pt-6 pb-1" style={{ height: 160 }}>
          {displayTrend.map((m) => {
            const incomeHeight = maxValue > 0 ? (m.income / maxValue) * 100 : 0;
            const expenseHeight = maxValue > 0 ? (m.expense / maxValue) * 100 : 0;

            const incText = shortBahtLabel(m.income);
            const expText = shortBahtLabel(m.expense);

            return (
              <div
                key={`${m.year}-${m.month}`}
                className="group flex flex-1 flex-col items-center gap-1 transition-transform hover:scale-105"
                title={`${m.label}: รับ ${formatSatang(m.income)} | จ่าย ${formatSatang(m.expense)}`}
              >
                {/* คู่แท่งกราฟ พร้อมตัวเลขแสดงค่าด้านบน */}
                <div className="flex w-full items-end gap-1 justify-center relative" style={{ height: 110 }}>
                  {/* แท่งรายรับ + ตัวเลข */}
                  <div className="flex flex-1 flex-col items-center h-full justify-end">
                    {incText && (
                      <span className="text-[9px] font-extrabold text-income tabular-nums mb-0.5 leading-none">
                        {incText}
                      </span>
                    )}
                    <div
                      className="w-full max-w-[14px] rounded-t-sm bg-income transition-all duration-300 group-hover:brightness-110"
                      style={{
                        height: `${Math.max(incomeHeight, 3)}%`,
                        minHeight: incomeHeight > 0 ? 3 : 0,
                      }}
                    />
                  </div>

                  {/* แท่งรายจ่าย + ตัวเลข */}
                  <div className="flex flex-1 flex-col items-center h-full justify-end">
                    {expText && (
                      <span className="text-[9px] font-extrabold text-expense tabular-nums mb-0.5 leading-none">
                        {expText}
                      </span>
                    )}
                    <div
                      className="w-full max-w-[14px] rounded-t-sm bg-expense transition-all duration-300 group-hover:brightness-110"
                      style={{
                        height: `${Math.max(expenseHeight, 3)}%`,
                        minHeight: expenseHeight > 0 ? 3 : 0,
                      }}
                    />
                  </div>
                </div>

                {/* Label เดือน */}
                <span className="text-[10px] font-semibold text-text-muted group-hover:text-text truncate mt-0.5">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
