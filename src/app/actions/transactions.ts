"use server";

/**
 * Server actions สำหรับจัดการธุรกรรม (transactions)
 *
 * กติกา:
 * - ใช้ session client (@supabase/ssr) — ไม่ใช้ secret key, ไม่ bypass RLS
 * - เงิน = bigint สตางค์เสมอ
 * - soft delete = ตั้ง deleted_at
 * - client_id = idempotency key (คู่กับ UNIQUE constraint ใน DB)
 * - Transfer ต้องมี to_account_id และยอดเท่ากัน (ตรวจสอบใน DB)
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

type ActionError = { error: string };
type ActionSuccess<T> = { data: T };
type ActionResult<T> = ActionError | ActionSuccess<T>;

/**
 * สร้างธุรกรรมใหม่ — ใช้ client_id เป็น idempotency key
 * ถ้า client_id ซ้ำ จะคืน data เดิม (ไม่ throw, ไม่ error)
 */
export async function createTransaction(input: {
  account_id: string;
  category_id?: string | null;
  to_account_id?: string | null;
  kind: "income" | "expense" | "transfer";
  amount: number; // bigint สตางค์
  note?: string | null;
  occurred_at: string; // ISO timestamptz
  client_id: string; // uuid — idempotency key
}): Promise<ActionResult<TransactionRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("transactions")
    .upsert(
      {
        user_id: user.id,
        account_id: input.account_id,
        category_id: input.category_id ?? null,
        to_account_id: input.to_account_id ?? null,
        kind: input.kind,
        amount: input.amount,
        note: input.note ?? null,
        occurred_at: input.occurred_at,
        client_id: input.client_id,
      },
      { onConflict: "client_id" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as TransactionRow };
}

/**
 * แก้ไขธุรกรรม
 */
export async function updateTransaction(
  id: string,
  input: {
    account_id?: string;
    category_id?: string | null;
    to_account_id?: string | null;
    kind?: "income" | "expense" | "transfer";
    amount?: number;
    note?: string | null;
    occurred_at?: string;
  }
): Promise<ActionResult<TransactionRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const updates: Record<string, string | number | null> = {};
  if (input.account_id !== undefined) updates.account_id = input.account_id;
  if (input.category_id !== undefined) updates.category_id = input.category_id;
  if (input.to_account_id !== undefined)
    updates.to_account_id = input.to_account_id;
  if (input.kind !== undefined) updates.kind = input.kind;
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.note !== undefined) updates.note = input.note;
  if (input.occurred_at !== undefined) updates.occurred_at = input.occurred_at;

  if (Object.keys(updates).length === 0) {
    return { error: "ไม่มีอะไรให้แก้" };
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as TransactionRow };
}

/**
 * Soft delete — ตั้ง deleted_at (ไม่ DELETE จริง)
 */
export async function deleteTransaction(
  id: string
): Promise<ActionResult<TransactionRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as TransactionRow };
}

/**
 * กู้คืนธุรกรรมที่ soft delete แล้ว
 */
export async function restoreTransaction(
  id: string
): Promise<ActionResult<TransactionRow>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("transactions")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as TransactionRow };
}

/**
 * ดึงรายการธุรกรรม (keyset pagination)
 *
 * @param cursor - { occurred_at, id } ของรายการสุดท้ายที่เห็น (keyset)
 * @param limit - จำนวนรายการต่อหน้า (default 50)
 * @param filters - filters ต่างๆ
 */
export async function listTransactions(params: {
  cursor?: { occurred_at: string; id: string };
  limit?: number;
  filters?: {
    date_from?: string;
    date_to?: string;
    account_id?: string;
    category_id?: string;
    kind?: "income" | "expense" | "transfer";
    search?: string;
  };
}): Promise<
  ActionResult<{
    items: TransactionRow[];
    next_cursor: { occurred_at: string; id: string } | null;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const limit = params.limit ?? 50;
  const f = params.filters;

  let query = supabase
    .from("transactions")
    .select("*, accounts!transactions_account_id_fkey(id, name), to_accounts:accounts!transactions_to_account_id_fkey(id, name), categories(id, name, icon)")
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // ขอดีกว่า 1 เพื่อดูว่ามีหน้าถัดไป

  // Keyset pagination
  if (params.cursor) {
    query = query.or(
      `occurred_at.lt.${params.cursor.occurred_at},and(occurred_at.eq.${params.cursor.occurred_at},id.lt.${params.cursor.id})`
    );
  }

  // Filters
  if (f?.date_from) query = query.gte("occurred_at", f.date_from);
  if (f?.date_to) query = query.lt("occurred_at", f.date_to);
  if (f?.account_id) query = query.eq("account_id", f.account_id);
  if (f?.category_id) query = query.eq("category_id", f.category_id);
  if (f?.kind) query = query.eq("kind", f.kind);
  if (f?.search) {
    query = query.ilike("note", `%${f.search}%`);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };

  const items = (data ?? []) as TransactionRow[];
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;

  const lastItem = pageItems[pageItems.length - 1];
  const next_cursor = hasMore && lastItem
    ? { occurred_at: lastItem.occurred_at, id: lastItem.id }
    : null;

  return { data: { items: pageItems, next_cursor } };
}
