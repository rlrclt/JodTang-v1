/**
 * /summary — หน้าสรุปรายรับรายจ่าย
 *
 * กติกาจาก task:
 * - กราฟแท่งรายจ่ายตามหมวด (CSS/div, ไม่ใช้ chart library)
 * - แนวโน้ม 6 เดือน
 * - เทียบงบต่อหมวด (เตือนที่ 80%)
 * - month navigation ด้วย ‹ ›
 * - สถานะ: ว่าง / กำลังโหลด (skeleton) / error + retry
 *
 * ใช้ server action `getSummaryData()` ฝั่ง server
 * แล้วคำนวณ summary ฝั่ง component (pure functions)
 */

import { getSummaryData } from "@/app/actions/summary";
import {
  computeCategoryExpenses,
  computeSixMonthTrend,
  computeBudgetProgress,
} from "@/lib/summary-helpers";
import { getCurrentYearMonth } from "@/lib/date";
import SummaryContent from "./SummaryContent";

export const dynamic = "force-dynamic";

const summaryMonthFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: "Asia/Bangkok",
  month: "long",
  year: "numeric",
});
export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const now = getCurrentYearMonth();
  const params = await searchParams;
  let selectedYear = now.year;
  let selectedMonth = now.month;

  // parse month param (format: YYYY-MM)
  if (params.month) {
    const match = params.month.match(/^(\d{4})-(\d{1,2})$/);
    if (match) {
      const y = parseInt(match[1]);
      const m = parseInt(match[2]);
      if (m >= 1 && m <= 12) {
        // ไม่ให้เลือกเดือนในอนาคต
        if (y < now.year || (y === now.year && m <= now.month)) {
          selectedYear = y;
          selectedMonth = m;
        }
      }
    }
  }

  // ดึงข้อมูลจาก server
  const { transactions, budgets } = await getSummaryData(
    selectedYear,
    selectedMonth
  );

  // คำนวณ summary (pure functions)
  const expenses = computeCategoryExpenses(transactions);
  const trend = computeSixMonthTrend(transactions, selectedYear, selectedMonth);
  const budgetProgress = computeBudgetProgress(transactions, budgets);

  // คำนวณยอดเดือนนี้
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of transactions) {
    if (t.kind === "income") totalIncome += t.amount;
    else if (t.kind === "expense") totalExpense += t.amount;
  }

  // คำนวณเดือนก่อนหน้าสำหรับปุ่ม ‹
  let prevYear = selectedYear;
  let prevMonth = selectedMonth - 1;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear -= 1;
  }

  // คำนวณเดือนถัดไป (จำกัดไม่เกินเดือนปัจจุบัน)
  let nextYear = selectedYear;
  let nextMonth = selectedMonth + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const canGoNext =
    nextYear < now.year || (nextYear === now.year && nextMonth <= now.month);

  const monthLabel = summaryMonthFormatter.format(new Date(selectedYear, selectedMonth - 1, 1));

  return (
    <SummaryContent
      expenses={expenses}
      trend={trend}
      budgetProgress={budgetProgress}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      monthLabel={monthLabel}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      prevYear={prevYear}
      prevMonth={prevMonth}
      nextYear={nextYear}
      nextMonth={nextMonth}
      canGoNext={canGoNext}
      hasData={transactions.length > 0}
    />
  );
}
