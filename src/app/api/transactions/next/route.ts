/**
 * API route สำหรับ keyset cursor pagination
 * GET /api/transactions/next?cursor_occurred_at=...&cursor_id=...
 *
 * - ใช้ session client (ไม่ bypass RLS)
 * - Returns: { items, next_cursor }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  accounts: { id: string; name: string } | null;
  to_accounts: { id: string; name: string } | null;
  categories: { id: string; name: string; icon: string | null } | null;
};

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const cursorOccurredAt = searchParams.get("cursor_occurred_at");
  const cursorId = searchParams.get("cursor_id");

  let query = supabase
    .from("transactions")
    .select(
      "*, accounts!transactions_account_id_fkey(id, name), to_accounts:accounts!transactions_to_account_id_fkey(id, name), categories(id, name, icon)"
    )
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1); // +1 สำหรับ hasMore

  // Keyset pagination
  if (cursorOccurredAt && cursorId) {
    query = query.or(
      `occurred_at.lt.${cursorOccurredAt},and(occurred_at.eq.${cursorOccurredAt},id.lt.${cursorId})`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []) as TransactionRow[];
  const hasMore = items.length > PAGE_SIZE;
  const pageItems = hasMore ? items.slice(0, PAGE_SIZE) : items;
  const lastItem = pageItems[pageItems.length - 1];
  const next_cursor =
    hasMore && lastItem
      ? { occurred_at: lastItem.occurred_at, id: lastItem.id }
      : null;

  return NextResponse.json({ items: pageItems, next_cursor });
}
