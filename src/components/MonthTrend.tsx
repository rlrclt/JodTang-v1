"use client";

import { useMemo, useState } from "react";
import type { MonthTrend as MonthTrendType } from "@/lib/summary-helpers";
import { formatSatang } from "@/lib/format-satang";

function shortBahtLabel(satang: number): string {
  if (satang <= 0) return "0";
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
  // ควบคุมการแตะดูรายละเอียด (Interactive inspection on click)
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const hasData = trend.some((m) => m.income > 0 || m.expense > 0);

  const maxValue = useMemo(() => {
    return Math.max(...trend.map((m) => Math.max(m.income, m.expense)), 1);
  }, [trend]);

  // คำนวณพิกัด SVG สำหรับ Smooth Area/Line Curve สไตล์ Apple Health / Stocks
  const svgMetrics = useMemo(() => {
    if (trend.length < 2 || maxValue <= 0) return null;
    const width = 360;
    const height = 145;
    const paddingX = 22;
    const paddingTop = 22;
    const paddingBottom = 26;
    const plotHeight = height - paddingTop - paddingBottom;
    const plotWidth = width - paddingX * 2;
    const step = plotWidth / (trend.length - 1);

    const incomePoints = trend.map((m, i) => {
      const x = paddingX + i * step;
      const y = paddingTop + plotHeight - (m.income / maxValue) * plotHeight;
      return { x, y, val: m.income, data: m, index: i };
    });

    const expensePoints = trend.map((m, i) => {
      const x = paddingX + i * step;
      const y = paddingTop + plotHeight - (m.expense / maxValue) * plotHeight;
      return { x, y, val: m.expense, data: m, index: i };
    });

    // Helper สร้าง Bezier Smooth Curve
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
      bottomY,
    };
  }, [trend, maxValue]);

  if (!hasData || !svgMetrics) {
    return (
      <div className="py-8 text-center text-xs text-text-muted rounded-2xl bg-surface-2/40 border border-dashed border-border/50">
        ยังไม่มีข้อมูลสถิติแนวโน้ม
      </div>
    );
  }

  const activePoint = activeIdx !== null ? trend[activeIdx] : null;
  const activeNet = activePoint ? activePoint.income - activePoint.expense : 0;
  const activeX = activeIdx !== null ? svgMetrics.incomePoints[activeIdx].x : 0;

  // จัดตำแหน่ง Floating Tooltip ไม่ให้ล้นขอบจอซ้ายหรือขวา
  const tooltipX = Math.min(Math.max(activeX, 70), svgMetrics.width - 70);

  return (
    <div className="space-y-2 select-none">
      {/* Legend & Guide (ไม่มีการ์ดซ้ำกับ Header) */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-[11px] font-medium text-text-muted">
          แตะที่จุดบนกราฟเพื่อดูรายรับ-รายจ่าย
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-income" />
            <span className="text-[11px] font-medium text-text-muted">รายรับ</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-expense" />
            <span className="text-[11px] font-medium text-text-muted">รายจ่าย</span>
          </div>
        </div>
      </div>

      {/* Apple-style Smooth Area Curve Chart */}
      <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-surface-2/40 to-transparent p-1">
        <svg
          viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`}
          className="w-full h-44 overflow-visible cursor-pointer"
        >
          <defs>
            <linearGradient id="curveIncomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-income, #16a34a)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-income, #16a34a)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="curveExpenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-expense, #dc2626)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-expense, #dc2626)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Shading */}
          <path d={svgMetrics.incomeArea} fill="url(#curveIncomeGrad)" />
          <path d={svgMetrics.expenseArea} fill="url(#curveExpenseGrad)" />

          {/* Guidelines Grid */}
          <line
            x1="15"
            y1={svgMetrics.bottomY}
            x2={svgMetrics.width - 15}
            y2={svgMetrics.bottomY}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="3 3"
          />

          {/* Active Vertical Indicator Line (เส้นประเล็งตำแหน่งเมื่อแตะ) */}
          {activeIdx !== null && (
            <line
              x1={activeX}
              y1="10"
              x2={activeX}
              y2={svgMetrics.bottomY}
              stroke="var(--color-focus, #3b82f6)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="animate-in fade-in duration-150"
            />
          )}

          {/* Smooth Vector Curves */}
          <path
            d={svgMetrics.incomeLine}
            fill="none"
            stroke="var(--color-income, #16a34a)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={svgMetrics.expenseLine}
            fill="none"
            stroke="var(--color-expense, #dc2626)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Clickable Points on Curves */}
          {svgMetrics.incomePoints.map((pt, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <g
                key={`inc-${idx}`}
                onClick={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
                className="cursor-pointer group"
              >
                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "5" : "3.5"}
                  className={`transition-all duration-200 ${
                    isSelected
                      ? "fill-income stroke-surface stroke-2 shadow-md scale-125"
                      : "fill-surface stroke-income stroke-2 group-hover:scale-125"
                  }`}
                />
              </g>
            );
          })}

          {svgMetrics.expensePoints.map((pt, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <g
                key={`exp-${idx}`}
                onClick={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
                className="cursor-pointer group"
              >
                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "5" : "3.5"}
                  className={`transition-all duration-200 ${
                    isSelected
                      ? "fill-expense stroke-surface stroke-2 shadow-md scale-125"
                      : "fill-surface stroke-expense stroke-2 group-hover:scale-125"
                  }`}
                />
              </g>
            );
          })}

          {/* 3. Floating In-Graph Tooltip Pin (ลอยแสดงผลบนตัวกราฟโดยตรงเมื่อกดดู) */}
          {activePoint && (
            <g
              transform={`translate(${tooltipX}, 28)`}
              className="animate-in zoom-in-95 fade-in duration-200"
            >
              {/* Tooltip Background Glass Pill */}
              <rect
                x="-64"
                y="-22"
                width="128"
                height="44"
                rx="14"
                className="fill-surface/95 stroke-border/60 stroke"
                style={{ filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))" }}
              />
              {/* Month title inside tooltip */}
              <text
                x="0"
                y="-9"
                textAnchor="middle"
                className="fill-text text-[10px] font-black tracking-tight"
              >
                {activePoint.label} ({activePoint.year + 543})
              </text>
              {/* Income and Expense inside tooltip */}
              <text x="0" y="5" textAnchor="middle" className="text-[9px] font-bold tabular-nums">
                <tspan className="fill-income font-black">+{shortBahtLabel(activePoint.income)}</tspan>
                <tspan className="fill-text-muted opacity-50">  |  </tspan>
                <tspan className="fill-expense font-black">−{shortBahtLabel(activePoint.expense)}</tspan>
              </text>
              {/* Net status inside tooltip */}
              <text
                x="0"
                y="16"
                textAnchor="middle"
                className={`text-[8px] font-extrabold ${activeNet >= 0 ? "fill-balance" : "fill-expense"}`}
              >
                {activeNet >= 0 ? "เหลือ +" : "ติดลบ "}{formatSatang(Math.abs(activeNet))}
              </text>
            </g>
          )}
        </svg>

        {/* แถบชื่อเดือนด้านล่าง — แตะเพื่อดู tooltip บนกราฟได้เช่นกัน */}
        <div className="flex items-center justify-between px-3 pt-0.5">
          {trend.map((m, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <button
                key={`${m.year}-${m.month}`}
                type="button"
                onClick={() => setActiveIdx((prev) => (prev === idx ? null : idx))}
                className={`text-[10px] transition-all rounded-md px-1 py-0.5 ${
                  isSelected
                    ? "font-black text-focus bg-focus/10 scale-110"
                    : "font-semibold text-text-muted hover:text-text"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
