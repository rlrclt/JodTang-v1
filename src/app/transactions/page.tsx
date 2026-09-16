import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { parseTransactionParams } from "@/lib/transaction-params";
import { getCurrentYearMonth, getMonthRange } from "@/lib/date";
import TransactionPageClient from "./TransactionPageClient";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

async function getTransactionData(searchParams: SearchParams) {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return { error: "ยังไม่ได้ตั้งค่า Supabase" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") sp.set(key, value);
  }
  const { month: paramMonth, year: paramYear, filters } =
    parseTransactionParams(sp);

  const { year: curYear, month: curMonth } = getCurrentYearMonth();
  const year = paramYear ?? curYear;
  const month = paramMonth ?? curMonth;

  // ดึงข้อมูลเดือน
  const { start, end } = getMonthRange(year, month);

  // ดึง transactions แรก (50 รายการ)
  let query = supabase
    .from("transactions")
    .select(
      "*, accounts!transactions_account_id_fkey(id, name), to_accounts:accounts!transactions_to_account_id_fkey(id, name), categories(id, name, icon)"
    )
    .is("deleted_at", null)
    .gte("occurred_at", start)
    .lt("occurred_at", end)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(51); // 50 + 1 for hasMore

  // Apply filters
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.category_id) query = query.eq("category_id", filters.category_id);
  if (filters.account_id) query = query.eq("account_id", filters.account_id);
  if (filters.search) {
    query = query.or(
      `note.ilike.%${filters.search}%,categories.name.ilike.%${filters.search}%`
    );
  }

  const { data: txData, error: txError } = await query;

  if (txError) {
    return { error: txError.message };
  }

  const items = (txData ?? []) as any[];
  const hasMore = items.length > 50;
  const pageItems = hasMore ? items.slice(0, 50) : items;
  const lastItem = pageItems[pageItems.length - 1];
  const nextCursor =
    hasMore && lastItem
      ? { occurred_at: lastItem.occurred_at, id: lastItem.id }
      : null;

  // คำนวณยอดรวมเดือน (income / expense)
  const { data: balanceData } = await supabase
    .from("transactions")
    .select("kind, amount")
    .is("deleted_at", null)
    .gte("occurred_at", start)
    .lt("occurred_at", end);

  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of (balanceData ?? []) as { kind: string; amount: number }[]) {
    if (t.kind === "income") totalIncome += t.amount;
    else if (t.kind === "expense") totalExpense += t.amount;
  }

  // ดึง accounts + categories สำหรับ filter
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .is("archived_at", null)
    .eq("user_id", user.id);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, kind")
    .is("archived_at", null)
    .eq("user_id", user.id);

  return {
    items: pageItems,
    nextCursor,
    year,
    month,
    totalIncome,
    totalExpense,
    accounts: accounts ?? [],
    categories: categories ?? [],
    filters: Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v != null)
    ),
  };
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const result = await getTransactionData(sp);

  if ("error" in result) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-8">
        <p className="text-lg text-expense">{result.error}</p>
      </div>
    );
  }

  return (
    <Suspense>
      <TransactionPageClient
        initialItems={result.items}
        nextCursor={result.nextCursor}
        year={result.year}
        month={result.month}
        totalIncome={result.totalIncome}
        totalExpense={result.totalExpense}
        accounts={result.accounts}
        categories={result.categories}
        initialFilters={result.filters}
      />
    </Suspense>
  );
}
