"use client";

import { useCallback } from "react";
import { useSmoothNavigate } from "@/lib/motion/useSmoothNavigate";
import { buildTransactionParams } from "@/lib/transaction-params";

type Props = {
  year: number;
  month: number;
  filters?: Record<string, string>;
};

const monthSelectorFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: "Asia/Bangkok",
  month: "short",
  year: "numeric",
});
/**
 * เลือกเดือน ‹ › — เปลี่ยน URL params (shareable)
 */
export default function MonthSelector({ year, month, filters }: Props) {
  const navigate = useSmoothNavigate();

  const navigateTo = useCallback(
    (newYear: number, newMonth: number, direction: "forward" | "back") => {
      const params = buildTransactionParams({
        month: newMonth,
        year: newYear,
        filters: filters as any,
      });
      // ใช้ transition มีทิศทางแทน router.push เปล่า (กันภาพตัดแบบพรึบ)
      navigate(`/transactions?${params.toString()}`, { direction });
    },
    [filters, navigate]
  );

  const navigateByDelta = useCallback(
    (delta: number) => {
      let newMonth = month + delta;
      let newYear = year;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      } else if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }
      navigateTo(newYear, newMonth, delta > 0 ? "forward" : "back");
    },
    [month, year, navigateTo]
  );

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => navigateByDelta(-1)}
        aria-label="เดือนก่อนหน้า"
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-text-muted transition-colors hover:bg-surface active:bg-surface-2"
      >
        ‹
      </button>
      <span className="min-w-[120px] text-center text-base font-semibold text-text">
        {monthSelectorFormatter.format(new Date(year, month - 1, 1))}
      </span>
      <button
        type="button"
        onClick={() => navigateByDelta(1)}
        aria-label="เดือนถัดไป"
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-text-muted transition-colors hover:bg-surface active:bg-surface-2"
      >
        ›
      </button>
    </div>
  );
}
