/**
 * MonthTrend — แสดงแนวโน้ม 6 เดือน (CSS/div เท่านั้น)
 *
 * กติกา:
 * - แสดงแท่งคู่ (รับ/จ่าย) ต่อเดือน
 * - ไม่มีข้อมูล = แสดง "ยังไม่มีข้อมูล"
 * - responsive: ไม่มี scroll ที่ 320/390/430px
 */

"use client";

import type { MonthTrend as MonthTrendType } from "@/lib/summary-helpers";
import { formatSatang } from "@/lib/format-satang";

export default function MonthTrend({
  trend,
}: {
  trend: MonthTrendType[];
}) {
  const hasData = trend.some((m) => m.income > 0 || m.expense > 0);

  if (!hasData) {
    return (
      <div className="rounded-[var(--radius-card)] bg-surface p-4 text-center text-text-muted">
        ยังไม่มีข้อมูล 6 เดือน
      </div>
    );
  }

  const maxValue = Math.max(
    ...trend.map((m) => Math.max(m.income, m.expense))
  );

  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text">
        แนวโน้ม 6 เดือน
      </h2>

      {/* Legend */}
      <div className="mb-2 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-income" />
          <span className="text-text-muted">รายรับ</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-expense" />
          <span className="text-text-muted">รายจ่าย</span>
        </div>
      </div>

      {/* Trend chart */}
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {trend.map((m) => {
          const incomeHeight =
            maxValue > 0 ? (m.income / maxValue) * 100 : 0;
          const expenseHeight =
            maxValue > 0 ? (m.expense / maxValue) * 100 : 0;
          return (
            <div
              key={`${m.year}-${m.month}`}
              className="flex flex-1 flex-col items-center gap-1"
            >
              {/* คู่แท่ง */}
              <div className="flex w-full items-end gap-0.5" style={{ height: 90 }}>
                <div
                  className="flex-1 rounded-t-[var(--radius-input)] bg-income transition-all duration-200"
                  style={{
                    height: `${Math.max(incomeHeight, 2)}%`,
                    minHeight: incomeHeight > 0 ? 2 : 0,
                  }}
                />
                <div
                  className="flex-1 rounded-t-[var(--radius-input)] bg-expense transition-all duration-200"
                  style={{
                    height: `${Math.max(expenseHeight, 2)}%`,
                    minHeight: expenseHeight > 0 ? 2 : 0,
                  }}
                />
              </div>
              {/* Label เดือน */}
              <span className="text-[10px] text-text-muted">{m.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
