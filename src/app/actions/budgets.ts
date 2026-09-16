"use server";

/**
 * Server actions สำหรับจัดการงบรายเดือนต่อหมวด (budgets)
 *
 * กติกา:
 * - ใช้ session client — RLS ป้องกันข้อมูลข้ามบัญชี
 * - amount = bigint สตางค์ (check >= 0 ใน DB)
 * - period_month = date (วันแรกของเดือน เช่น 2026-09-01)
 * - งบซ้ำกันไม่ได้: หนึ่งหมวดต่อเดือนต่อบัญชี (UNIQUE constraint)
 */

import { createClient } from "@/lib/supabase/server";

type BudgetRow = {
  id: string;
  user_id: string;
  category_id: string;
  period_month: string; // YYYY-MM-DD
  amount: number; // bigint สตางค์
  created_at: string;
  updated_at: string;
  categories: { id: string; name: string; icon: string | null } | null;
};

type ActionResult<T> = { data: T } | { error: string };

/**
 * สร้าง/อัปเดตงบรายเดือนต่อหมวด
 * ใช้ upsert เพราะหนึ่งหมวดต่อเดือนต่อบัญชี = สร้างใหม่หรือแก้ไข
 */
export async function upsertBudget(input: {
  category_id: string;
  period_month: string; // "YYYY-MM-01" format
  amount: number; // bigint สตางค์ (>= 0)
}): Promise<ActionResult<BudgetRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: user.id,
        category_id: input.category_id,
        period_month: input.period_month,
        amount: input.amount,
      },
      { onConflict: "user_id,category_id,period_month" }
    )
    .select("*, categories(id, name, icon)")
    .single();

  if (error) return { error: error.message };
  return { data: data as BudgetRow };
}

/**
 * ลบงบรายเดือน (DELETE จริง — ต่างจาก transaction ที่ใช้ soft delete)
 * เพราะงบไม่ใช่ข้อมูลการเงินที่ต้องกู้คืน
 */
export async function deleteBudget(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { data: data as { id: string } };
}

/**
 * ดึงงบรายเดือนทั้งหมดของเดือนที่กำหนด
 * @param period_month - "YYYY-MM-01" format
 */
export async function listBudgets(
  period_month: string
): Promise<ActionResult<BudgetRow[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("budgets")
    .select("*, categories(id, name, icon)")
    .eq("period_month", period_month)
    .order("created_at");

  if (error) return { error: error.message };
  return { data: (data ?? []) as BudgetRow[] };
}
