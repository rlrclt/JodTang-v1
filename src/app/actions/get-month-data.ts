"use server";

/**
 * Server action: ดึงข้อมูลเดือนสำหรับหน้าแรก
 * - transactions 20 รายการล่าสุด
 * - summary (income, expense, balance) จาก transactions ทั้งเดือน
 *
 * กติกา:
 * - ใช้ session client — ไม่ bypass RLS
 * - soft delete filter = ทุก query ต้องกรอง deleted_at IS NULL
 * - เงิน = bigint สตางค์เสมอ
 */

import { createClient } from "@/lib/supabase/server";

type TransactionRow = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  to_account_id: string | null;
  kind: "income" | "expense" | "transfer";
  amount: number;
  note: string | null;
  occurred_at: string;
  client_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  accounts: { id: string; name: string } | null;
  to_accounts: { id: string; name: string } | null;
  categories: { id: string; name: string; icon: string | null } | null;
};

type MonthSummary = {
  income: number;
  expense: number;
  balance: number;
};

type ActionError = { error: string };
type ActionSuccess<T> = { data: T };
type ActionResult<T> = ActionError | ActionSuccess<T>;

export async function getMonthData(params: {
  date_from: string;
  date_to: string;
}): Promise<
  ActionResult<{
    recent: TransactionRow[];
    summary: MonthSummary;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  // ดึง transactions ทั้งเดือน (สูงสุด 1000 สำหรับ summary)
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "*, accounts!transactions_account_id_fkey(id, name), to_accounts:accounts!transactions_to_account_id_fkey(id, name), categories(id, name, icon)"
    )
    .is("deleted_at", null)
    .gte("occurred_at", params.date_from)
    .lt("occurred_at", params.date_to)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);

  if (error) return { error: error.message };

  const all = (data ?? []) as TransactionRow[];

  // summary = income - expense (transfer ไม่คิดใน summary)
  const summary: MonthSummary = { income: 0, expense: 0, balance: 0 };
  for (const tx of all) {
    if (tx.kind === "income") summary.income += tx.amount;
    else if (tx.kind === "expense") summary.expense += tx.amount;
  }
  summary.balance = summary.income - summary.expense;

  // 20 รายการล่าสุด
  const recent = all.slice(0, 20);

  return { data: { recent, summary } };
}
