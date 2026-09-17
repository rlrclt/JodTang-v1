/**
 * summary-helpers.ts — คำนวณข้อมูลสรุปจาก transactions + budgets
 *
 * ฟังก์ชันบริสุทธิ์ (pure functions) ไม่พึ่ง DB
 * รับ input เป็น array แล้วคืน object สำหรับ summary components
 */

import type { TransactionRecord, BudgetRecord } from "@/app/actions/summary";

// ─── Types ───

export type CategorySummary = {
  category_id: string;
  name: string;
  icon: string | null;
  total: number; // bigint สตางค์
};

export type MonthSummary = {
  income: number;
  expense: number;
};

export type MonthTrend = {
  year: number;
  month: number;
  label: string; // "ก.ย.", "ส.ค.", etc.
  income: number;
  expense: number;
};

export type BudgetProgress = {
  category_id: string;
  name: string;
  spent: number;
  budget: number;
  percentage: number;
};

// ─── Summary: expenses by category ───

/**
 * คำนวณยอดจ่ายตามหมวดของเดือน
 * - กรองเฉพาะ kind = 'expense'
 * - รวม amount ตาม category_id
 * - เรียงตาม amount มาก → น้อย
 * - หมวดที่ไม่มี (category_id = null) จะถูกข้าม
 */
export function computeCategoryExpenses(
  transactions: TransactionRecord[]
): CategorySummary[] {
  const map = new Map<string, { name: string; icon: string | null; total: number }>();

  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    if (!t.category_id || !t.categories) continue;

    const existing = map.get(t.category_id);
    if (existing) {
      existing.total += t.amount;
    } else {
      map.set(t.category_id, {
        name: t.categories.name,
        icon: t.categories.icon,
        total: t.amount,
      });
    }
  }

  return Array.from(map.entries())
    .map(([id, { name, icon, total }]) => ({
      category_id: id,
      name,
      icon,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

// ─── Trend: 6-month income/expense ───

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/**
 * คำนวณยอดรับ/จ่าย 6 เดือนล่าสุด
 * - รับ transactions ทั้งหมดของ 6 เดือน
 * - สร้าง array 6 เดือนที่ว่างก่อน แล้วเติมข้อมูล
 * - คืน array 6 รายการ เรียงเก่า → ใหม่
 */
export function computeSixMonthTrend(
  transactions: TransactionRecord[],
  currentYear: number,
  currentMonth: number,
  monthsCount = 12
): MonthTrend[] {
  // สร้าง array ย้อนหลัง monthsCount เดือน (ค่า default = 12 เดือน)
  const months: { year: number; month: number }[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    months.push({ year: y, month: m });
  }

  // เริ่มต้นด้วย 0
  const result: MonthTrend[] = months.map(({ year, month }) => ({
    year,
    month,
    label: THAI_MONTHS[month - 1],
    income: 0,
    expense: 0,
  }));

  // เติมข้อมูลจาก transactions
  for (const t of transactions) {
    const d = new Date(t.occurred_at);
    if (Number.isNaN(d.getTime())) continue;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(d);
    const ty = parseInt(parts.find((p) => p.type === "year")!.value);
    const tm = parseInt(parts.find((p) => p.type === "month")!.value);

    const idx = result.findIndex((r) => r.year === ty && r.month === tm);
    if (idx === -1) continue;

    if (t.kind === "income") {
      result[idx].income += t.amount;
    } else if (t.kind === "expense") {
      result[idx].expense += t.amount;
    }
  }

  return result;
}
// ─── Budget progress ───

/**
 * คำนวณ % งบใช้ไปต่อหมวด
 * - รวม amount ของ expense ตาม category_id
 * - เทียบกับ budget.amount
 * - ไม่มีงบ = ไม่แสดง
 * - เรียงตาม percentage มาก → น้อย
 */
export function computeBudgetProgress(
  transactions: TransactionRecord[],
  budgets: BudgetRecord[]
): BudgetProgress[] {
  // รวมค่าใช้จ่ายตามหมวด
  const spentMap = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    if (!t.category_id) continue;
    spentMap.set(
      t.category_id,
      (spentMap.get(t.category_id) ?? 0) + t.amount
    );
  }

  const result: BudgetProgress[] = [];
  for (const b of budgets) {
    if (b.amount <= 0) continue;
    const spent = spentMap.get(b.category_id) ?? 0;
    const percentage = Math.round((spent / b.amount) * 100);
    result.push({
      category_id: b.category_id,
      name: b.categories?.name ?? "ไม่ทราบ",
      spent,
      budget: b.amount,
      percentage,
    });
  }

  return result.sort((a, b) => b.percentage - a.percentage);
}
