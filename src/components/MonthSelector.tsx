"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { buildTransactionParams } from "@/lib/transaction-params";

type Props = {
  year: number;
  month: number;
  filters?: Record<string, string>;
};

const MONTH_NAMES = [
  "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/**
 * เลือกเดือน ‹ › — เปลี่ยน URL params (shareable)
 */
export default function MonthSelector({ year, month, filters }: Props) {
  const router = useRouter();

  const navigate = useCallback(
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
      const params = buildTransactionParams({
        month: newMonth,
        year: newYear,
        filters: filters as any,
      });
      router.push(`/transactions?${params.toString()}`);
    },
    [month, year, filters, router]
  );

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="เดือนก่อนหน้า"
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-text-muted transition-colors hover:bg-surface active:bg-surface-2"
      >
        ‹
      </button>
      <span className="min-w-[120px] text-center text-base font-semibold text-text">
        {MONTH_NAMES[month]} {year + 543}
      </span>
      <button
        type="button"
        onClick={() => navigate(1)}
        aria-label="เดือนถัดไป"
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-text-muted transition-colors hover:bg-surface active:bg-surface-2"
      >
        ›
      </button>
    </div>
  );
}
