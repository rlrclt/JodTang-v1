"use client";

import { useMemo, useState } from "react";
import type { MonthTrend as MonthTrendType } from "@/lib/summary-helpers";
import { formatSatang } from "@/lib/format-satang";

type RangeOption = 3 | 6 | 12;

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

  return (
    <div className="space-y-3">
      {/* Filter range buttons (Pill Segmented Control) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-income" />
            <span className="text-[11px] font-medium text-text-muted">รายรับ</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-expense" />
            <span className="text-[11px] font-medium text-text-muted">รายจ่าย</span>
          </div>
        </div>

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

      {!hasData ? (
        <div className="py-8 text-center text-xs text-text-muted rounded-2xl bg-surface-2/40 border border-dashed border-border/50">
          ยังไม่มีข้อมูลธุรกรรมในช่วง {range} เดือนนี้
        </div>
      ) : (
        /* Trend bars container พร้อมตัวเลขกำกับ */
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
