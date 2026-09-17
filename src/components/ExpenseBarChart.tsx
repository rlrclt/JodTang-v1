/**
 * ExpenseBarChart — กราฟแท่งรายจ่ายตามหมวด (CSS/div เท่านั้น)
 *
 * กติกา:
 * - bar สูงสุด = 100% (ไม่ fix px) →  responsive
 * - สีจาก CSS token (--color-cat-*) ไม่ hardcode
 * - legend ใต้กราฟ มีไอคอน + ชื่อหมวด + จำนวนเงิน
 * - ไม่มีข้อมูล = แสดง "ยังไม่มีรายการจ่าย"
 */

"use client";

import type { CategorySummary } from "@/lib/summary-helpers";
import { formatSatang } from "@/lib/format-satang";
import CategoryColorDot from "./CategoryColorDot";
import { SmoothLink } from "./SmoothLink";

// แมป category_id → CSS token key (ใช้กับ --color-cat-*)
// ใน v1 ไม่มี mapping ที่แม่นยำ → ใช้ index mod 8 เพื่อกระจายสี
const COLORS = [
  "var(--color-cat-food)",
  "var(--color-cat-transport)",
  "var(--color-cat-shopping)",
  "var(--color-cat-entertainment)",
  "var(--color-cat-health)",
  "var(--color-cat-education)",
  "var(--color-cat-bills)",
  "var(--color-cat-other)",
];

export default function ExpenseBarChart({
  categories,
}: {
  categories: CategorySummary[];
}) {
  if (categories.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] bg-surface p-4 text-center text-text-muted">
        ยังไม่มีรายการจ่ายเดือนนี้
      </div>
    );
  }

  const maxAmount = Math.max(...categories.map((c) => c.total));

  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-4">
      <h2 className="mb-3 text-sm font-semibold text-text">รายจ่ายตามหมวด</h2>

      {/* Bar chart */}
      <div
        className="flex items-end gap-2"
        style={{ height: 140 }}
        role="img"
        aria-label="กราฟแท่งรายจ่ายตามหมวด"
      >
        {categories.map((cat, i) => {
          const heightPct = maxAmount > 0 ? (cat.total / maxAmount) * 100 : 0;
          const color = COLORS[i % COLORS.length];
          return (
            <SmoothLink
              key={cat.category_id}
              href={`/transactions?category_id=${cat.category_id}`}
              className="flex flex-1 flex-col items-center gap-1 transition-transform hover:scale-105 active:scale-95 group"
              title={`ดูรายการหมวด ${cat.name}`}
            >
              {/* จำนวนเงินเหนือ bar */}
              <span className="text-[10px] text-text-muted tabular-nums group-hover:text-text">
                {formatSatang(cat.total)}
              </span>
              {/* Bar */}
              <div
                className="w-full rounded-t-[var(--radius-input)] transition-all duration-200 group-hover:brightness-110"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  backgroundColor: color,
                  minHeight: 4,
                }}
              />
            </SmoothLink>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {categories.map((cat) => (
          <SmoothLink
            key={cat.category_id}
            href={`/transactions?category_id=${cat.category_id}`}
            className="flex items-center gap-1 text-xs text-text hover:text-focus transition-colors"
          >
            <CategoryColorDot name={cat.name} icon={cat.icon} size={14} />
            <span>{cat.name}</span>
          </SmoothLink>
        ))}
      </div>
    </div>
  );
}
