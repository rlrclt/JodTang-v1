/**
 * SummaryContent — client component สำหรับแสดงผล summary
 *
 * รับ computed data จาก server component แล้ว render
 * ใช้ <Link> สำหรับ month navigation (ไม่ใช้ state)
 */

"use client";

import { SmoothLink } from "@/components/SmoothLink";
import { formatSatang } from "@/lib/format-satang";
import type {
  CategorySummary,
  MonthTrend,
  BudgetProgress,
} from "@/lib/summary-helpers";
import ExpenseBarChart from "@/components/ExpenseBarChart";
import MonthTrendChart from "@/components/MonthTrend";
import BudgetProgressSection from "@/components/BudgetProgress";

type Props = {
  expenses: CategorySummary[];
  trend: MonthTrend[];
  budgetProgress: BudgetProgress[];
  totalIncome: number;
  totalExpense: number;
  monthLabel: string;
  selectedYear: number;
  selectedMonth: number;
  prevYear: number;
  prevMonth: number;
  nextYear: number;
  nextMonth: number;
  canGoNext: boolean;
  hasData: boolean;
};

export default function SummaryContent(props: Props) {
  const {
    expenses,
    trend,
    budgetProgress,
    totalIncome,
    totalExpense,
    monthLabel,
    selectedYear,
    selectedMonth,
    prevYear,
    prevMonth,
    nextYear,
    nextMonth,
    canGoNext,
    hasData,
  } = props;

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <SmoothLink
          href={`/summary?month=${prevYear}-${String(prevMonth).padStart(2, "0")}`}
          className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-btn)] text-text-muted transition-colors hover:bg-surface active:scale-95"
          aria-label="เดือนก่อนหน้า"
        >
          ‹
        </SmoothLink>
        <h1 className="text-base font-semibold text-text tabular-nums">
          {monthLabel}
        </h1>
        {canGoNext ? (
          <SmoothLink
            href={`/summary?month=${nextYear}-${String(nextMonth).padStart(2, "0")}`}
            className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-btn)] text-text-muted transition-colors hover:bg-surface active:scale-95"
            aria-label="เดือนถัดไป"
          >
            ›
          </SmoothLink>
        ) : (
          <div className="h-11 w-11" />
        )}
      </div>

      {/* ยอดรวมเดือนนี้ */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-[var(--radius-card)] bg-surface p-3 text-center">
          <p className="text-[10px] text-text-muted">รายรับ</p>
          <p className="text-sm font-semibold tabular-nums text-income">
            {hasData ? formatSatang(totalIncome) : "—"}
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-surface p-3 text-center">
          <p className="text-[10px] text-text-muted">รายจ่าย</p>
          <p className="text-sm font-semibold tabular-nums text-expense">
            {hasData ? formatSatang(totalExpense) : "—"}
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] bg-surface p-3 text-center">
          <p className="text-[10px] text-text-muted">คงเหลือ</p>
          <p className="text-sm font-semibold tabular-nums text-balance">
            {hasData ? formatSatang(totalIncome - totalExpense) : "—"}
          </p>
        </div>
      </div>

      {/* กราฟแท่งรายจ่ายตามหมวด */}
      <div className="mb-4">
        <ExpenseBarChart categories={expenses} />
      </div>

      {/* แนวโน้ม 6 เดือน */}
      <div className="mb-4">
        <MonthTrendChart trend={trend} />
      </div>

      {/* เทียบงบ */}
      <BudgetProgressSection progress={budgetProgress} />
    </div>
  );
}
