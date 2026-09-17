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
  // ดัชนีเดือนที่ถูกเลือก/แตะอยู่ (default เป็นเดือนล่าสุด)
  const [selectedIndex, setSelectedIndex] = useState<number>(trend.length - 1);

  const hasData = trend.some((m) => m.income > 0 || m.expense > 0);

  const maxValue = useMemo(() => {
    return Math.max(...trend.map((m) => Math.max(m.income, m.expense)), 1);
  }, [trend]);

  const selectedMonth = trend[selectedIndex] || trend[trend.length - 1];

  // คำนวณพิกัด SVG สำหรับ Smooth Area/Line Curve สไตล์ Apple Health / Wallet
  const svgMetrics = useMemo(() => {
    if (trend.length < 2 || maxValue <= 0) return null;
    const width = 360;
    const height = 140;
    const paddingX = 20;
    const paddingTop = 20;
    const paddingBottom = 24;
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

    // Helper สร้าง Bezier Smooth Path
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

  const selectedNet = (selectedMonth.income || 0) - (selectedMonth.expense || 0);

  return (
    <div className="space-y-3 select-none">
      {/* 1. Interactive Detailed Inspection Card (การ์ดแสดงรายละเอียดเมื่อแตะจุดบนกราฟ) */}
      <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-surface-2/80 p-3 shadow-sm backdrop-blur-md transition-all">
        <div>
          <span className="text-[10px] font-semibold text-text-muted">เดือนที่เลือก</span>
          <h4 className="text-sm font-extrabold text-text tracking-tight">
            {selectedMonth.label} พ.ศ. {selectedMonth.year + 543}
          </h4>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="block text-[9px] font-medium text-text-muted">รายรับ</span>
            <span className="text-xs font-bold text-income tabular-nums">
              +{formatSatang(selectedMonth.income)}
            </span>
          </div>
          <div>
            <span className="block text-[9px] font-medium text-text-muted">รายจ่าย</span>
            <span className="text-xs font-bold text-expense tabular-nums">
              −{formatSatang(selectedMonth.expense)}
            </span>
          </div>
          <div className="border-l border-border/50 pl-3">
            <span className="block text-[9px] font-medium text-text-muted">คงเหลือ</span>
            <span
              className={`text-xs font-black tabular-nums ${
                selectedNet >= 0 ? "text-balance" : "text-expense"
              }`}
            >
              {selectedNet >= 0 ? "+" : ""}
              {formatSatang(selectedNet)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Apple-style Smooth Area Curve Chart */}
      <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-surface-2/40 to-transparent p-2">
        <svg
          viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`}
          className="w-full h-44 overflow-visible cursor-pointer"
        >
          <defs>
            {/* Gradient แรเงาสีเขียว รายรับ */}
            <linearGradient id="curveIncomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-income, #16a34a)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--color-income, #16a34a)" stopOpacity="0.0" />
            </linearGradient>
            {/* Gradient แรเงาสีแดง รายจ่าย */}
            <linearGradient id="curveExpenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-expense, #dc2626)" stopOpacity="0.3" />
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

          {/* Active Vertical Indicator Line (เส้นเล็งตำแหน่งเดือนที่เลือก) */}
          {svgMetrics.incomePoints[selectedIndex] && (
            <line
              x1={svgMetrics.incomePoints[selectedIndex].x}
              y1="10"
              x2={svgMetrics.incomePoints[selectedIndex].x}
              y2={svgMetrics.bottomY}
              stroke="var(--color-focus, #3b82f6)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="animate-in fade-in duration-200"
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
            const isSelected = idx === selectedIndex;
            return (
              <g
                key={`inc-${idx}`}
                onClick={() => setSelectedIndex(idx)}
                className="cursor-pointer group"
              >
                {/* Hitbox โปร่งแสงขนาดใหญ่ให้ใช้นิ้วแตะง่าย */}
                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                {/* วงกลมจุดพล็อต */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "5.5" : "3.5"}
                  className={`transition-all duration-200 ${
                    isSelected
                      ? "fill-income stroke-surface stroke-3 shadow-md scale-110"
                      : "fill-surface stroke-income stroke-2 group-hover:scale-125"
                  }`}
                />

                {/* ตัวเลขบนจุดพล็อต */}
                <text
                  x={pt.x}
                  y={pt.y - 9}
                  textAnchor="middle"
                  className={`transition-all duration-200 ${
                    isSelected
                      ? "fill-income text-[10px] font-black"
                      : "fill-income text-[8px] font-bold opacity-60 group-hover:opacity-100"
                  }`}
                >
                  {shortBahtLabel(pt.val)}
                </text>
              </g>
            );
          })}

          {svgMetrics.expensePoints.map((pt, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <g
                key={`exp-${idx}`}
                onClick={() => setSelectedIndex(idx)}
                className="cursor-pointer group"
              >
                {/* Hitbox */}
                <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "5.5" : "3.5"}
                  className={`transition-all duration-200 ${
                    isSelected
                      ? "fill-expense stroke-surface stroke-3 shadow-md scale-110"
                      : "fill-surface stroke-expense stroke-2 group-hover:scale-125"
                  }`}
                />

                <text
                  x={pt.x}
                  y={pt.y - 9}
                  textAnchor="middle"
                  className={`transition-all duration-200 ${
                    isSelected
                      ? "fill-expense text-[10px] font-black"
                      : "fill-expense text-[8px] font-bold opacity-60 group-hover:opacity-100"
                  }`}
                >
                  {shortBahtLabel(pt.val)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* แถบชื่อเดือนด้านล่าง — แตะเพื่อเลือกเดือนได้เช่นกัน */}
        <div className="flex items-center justify-between px-3 pt-1">
          {trend.map((m, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={`${m.year}-${m.month}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`text-[11px] transition-all rounded-md px-1 py-0.5 ${
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
