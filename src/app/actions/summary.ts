/**
 * Server action สำหรับดึงข้อมูลสรุป (summary)
 *
 * ดึง transactions + budgets ของเดือนที่กำหนด
 * แล้วส่งต่อให้ computeSummary() ฝั่ง client คำนวณ
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { getMonthRange, getCurrentYearMonth } from "@/lib/date";

// ─── Types ───

export type TransactionRecord = {
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: number;
  category_id: string | null;
  occurred_at: string;
  categories: { id: string; name: string; icon: string | null } | null;
};

export type BudgetRecord = {
  category_id: string;
  amount: number;
  categories: { id: string; name: string; icon: string | null } | null;
};

export type SummaryData = {
  transactions: TransactionRecord[];
  budgets: BudgetRecord[];
  year: number;
  month: number;
};

// ─── Action ───

export async function getSummaryData(
  year?: number,
  month?: number
): Promise<SummaryData> {
  const now = getCurrentYearMonth();
  const y = year ?? now.year;
  const m = month ?? now.month;

  // จำกัดไม่ให้เลือกเดือนในอนาคต
  if (
    y > now.year ||
    (y === now.year && m > now.month)
  ) {
    return { transactions: [], budgets: [], year: now.year, month: now.month };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { transactions: [], budgets: [], year: y, month: m };

  const { start, end } = getMonthRange(y, m);

  // ดึง transactions ทั้งหมดของเดือน (keyset pagination)
  const transactions: TransactionRecord[] = [];
  let cursor: { occurred_at: string; id: string } | null = null;
  const BATCH = 200;
  // safety: ป้องกัน infinite loop — สูงสุด 10 batches = 2000 รายการ
  let batches = 0;

  while (batches < 10) {
    batches++;
    let q = supabase
      .from("transactions")
      .select(
        "id, kind, amount, category_id, occurred_at, categories(id, name, icon)"
      )
      .is("deleted_at", null)
      .gte("occurred_at", start)
      .lt("occurred_at", end)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(BATCH + 1);

    if (cursor) {
      q = q.or(
        `occurred_at.lt.${cursor.occurred_at},and(occurred_at.eq.${cursor.occurred_at},id.lt.${cursor.id})`
      );
    }

    const { data, error } = await q;
    if (error) break;

    const rows = data ?? [];
    const hasMore = rows.length > BATCH;
    const page = hasMore ? rows.slice(0, BATCH) : rows;
    // Supabase's nested relation inference is wider than TransactionRecord at this boundary.
    transactions.push(...(page as unknown as TransactionRecord[]));

    if (!hasMore || page.length === 0) break;
    const last = page[page.length - 1] as unknown as TransactionRecord;
    cursor = { occurred_at: last.occurred_at, id: last.id };
  }

  // ดึง budgets ของเดือน (format: YYYY-MM-01)
  const periodMonth = `${y}-${String(m).padStart(2, "0")}-01`;
  const { data: budgetData } = await supabase
    .from("budgets")
    .select("category_id, amount, categories(id, name, icon)")
    .eq("period_month", periodMonth);

  const budgets = (budgetData ?? []) as unknown as BudgetRecord[];

  return { transactions, budgets, year: y, month: m };
}
