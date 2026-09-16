"use server";

/**
 * Server actions ที่เรียกจาก client โดยไม่ต้อง supabase ที่บรรทัด top-level
 * (แยกเพื่อให้ client bundle import ได้โดยไม่ดึง next/headers ตาม —
 * Turbopack จะถือว่าทั้งไฟล์เป็น server action ตาม "use server")
 */

import { createClient } from "@/lib/supabase/server";
import type { TrashRow, TrashCursor } from "./trash-types";

type ActionError = { error: string };
type ActionSuccess<T> = { data: T };
type ActionResult<T> = ActionError | ActionSuccess<T>;

/**
 * รายการในถังขยะ: deleted_at ไม่ null, เรียงใหม่ → เก่า + keyset
 */
export async function listTrash(params: {
  cursor?: TrashCursor;
  limit?: number;
}): Promise<
  ActionResult<{ items: TrashRow[]; next_cursor: TrashCursor | null }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const limit = params.limit ?? 50;

  let query = supabase
    .from("transactions")
    .select(
      "id, kind, amount, note, occurred_at, deleted_at, accounts!transactions_account_id_fkey(name), categories(name)"
    )
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1); // +1 เพื่อเช็คว่ามีหน้าถัดไปไหม

  if (params.cursor) {
    query = query.or(
      `deleted_at.lt.${params.cursor.deleted_at},and(deleted_at.eq.${params.cursor.deleted_at},id.lt.${params.cursor.id})`
    );
  }

  const { data, error } = await query;

  if (error) return { error: error.message };

  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    kind: row.kind,
    amount: row.amount,
    note: row.note,
    occurred_at: row.occurred_at,
    deleted_at: row.deleted_at,
    account_name: row.accounts?.name ?? null,
    category_name: row.categories?.name ?? null,
  })) as TrashRow[];

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;

  const last = pageItems[pageItems.length - 1];
  const next_cursor =
    hasMore && last ? { deleted_at: last.deleted_at, id: last.id } : null;

  return { data: { items: pageItems, next_cursor } };
}
