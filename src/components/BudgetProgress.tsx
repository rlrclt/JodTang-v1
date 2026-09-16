/**
 * BudgetProgress — เทียบงบรายเดือนต่อหมวด
 *
 * กติกา:
 * - progress bar ใช้ CSS width เท่านั้น
 * - >= 80% = แสดงสี warn (ไม่ใช้ icon/สีเดียว — มี % กำกับ)
 * - ไม่มีงบ = ไม่แสดง (ไม่ใช่ "ยังไม่ได้ตั้งงบ")
 * - เรียงตาม % มาก → น้อย
 */

"use client";

import type { BudgetProgress as BudgetProgressType } from "@/lib/summary-helpers";
import { formatSatang } from "@/lib/format-satang";
import CategoryIcon from "./CategoryIcon";

export default function BudgetProgressSection({
  progress,
}: {
  progress: BudgetProgressType[];
}) {
  if (progress.length === 0) {
    return null; // ไม่มีงบ = ไม่แสดง section
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text">
        เทียบงบรายเดือน
      </h2>

      <div className="flex flex-col gap-3">
        {progress.map((item) => {
          const isWarn = item.percentage >= 80;
          const barColor = isWarn ? "var(--color-warn)" : "var(--color-balance)";
          const barWidth = Math.min(item.percentage, 100);

          return (
            <div key={item.category_id}>
              {/* Header: ไอคอน + ชื่อ + % */}
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CategoryIcon name={item.name} size={16} />
                  <span className="text-xs text-text">{item.name}</span>
                </div>
                <span
                  className={`text-xs tabular-nums ${
                    isWarn ? "font-semibold text-warn" : "text-text-muted"
                  }`}
                >
                  {item.percentage}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>

              {/* จำนวนเงิน */}
              <div className="mt-0.5 flex justify-between text-[10px] text-text-muted">
                <span>{formatSatang(item.spent)}</span>
                <span>/ {formatSatang(item.budget)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
