import { SmoothLink } from "@/components/SmoothLink";
import { createClient } from "@/lib/supabase/server";
import { listBudgets } from "@/app/actions/budgets";
import { listCategories } from "@/app/actions/categories";
import { getCurrentYearMonth, getMonthRange } from "@/lib/date";
import BudgetsClient from "./BudgetsClient";

export const dynamic = "force-dynamic";

/**
 * Server component เรียก Supabase ตรง ๆ (RLS บังคับใช้ที่ DB) — ไม่เรียก server action
 * เหตุผล: server action ออกแบบไว้ให้ client component เรียกตอน mutate; ฝั่ง render
 * รวม query ทั้งหมดไว้ที่นี่เดียวให้ /summary เรียกชุดเดียวกันได้ (ให้มันเรียก query ที่นี่)
 */

type BudgetRow = {
  id: string;
  category_id: string;
  period_month: string;
  amount: number; // bigint สตางค์ (จาก PostgREST เป็น number เพราะ jsoncodes แปลงตาม schema)
  categories: { id: string; name: string; icon: string | null } | null;
};

type CategoryRow = {
  id: string;
  name: string;
  icon: string | null;
  kind: string;
};

/** ดึงรายจ่ายตามหมวดของเดือน (แยกเพื่อให้ /summary ใช้ชุดเดียวกันได้) */
async function fetchSpentByCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  year: number,
  month: number
): Promise<Map<string, bigint>> {
  const { start, end } = getMonthRange(year, month);
  const { data, error } = await supabase
    .from("transactions")
    .select("category_id, amount")
    .eq("kind", "expense")
    .is("deleted_at", null)
    .gte("occurred_at", start)
    .lt("occurred_at", end);

  const result = new Map<string, bigint>();
  if (error) return result; // error ที่เลเยอร์ DB → จัดเป็นว่าง (หน้า client จะแสดง error ตอนกด)
  for (const row of data ?? []) {
    if (!row.category_id) continue;
    const prev = result.get(row.category_id) ?? BigInt(0);
    result.set(row.category_id, prev + BigInt(row.amount));
  }
  return result;
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const now = getCurrentYearMonth();

  // key ของ URL = "2026-09"; fallback เป็นเดือนปัจจุบันตาม Asia/Bangkok
  const monthKey = typeof params.m === "string" ? params.m : null;
  const year = monthKey ? parseInt(monthKey.slice(0, 4), 10) : now.year;
  const month = monthKey ? parseInt(monthKey.slice(5, 7), 10) : now.month;

  // ก่อนเปิด env: Supabase ยังไม่ตั้ง → บอกว่าเดี๋ยวค่อยล็อกอิน (ไม่พัง)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center p-8">
        <p className="text-text-muted">กำลังเชื่อมต่อ…</p>
      </div>
    );
  }

  const period_month = `${year}-${String(month).padStart(2, "0")}-01`;

  const [budgetsRes, catsRes, spentMap] = await Promise.all([
    listBudgets(period_month),
    listCategories("expense"),
    fetchSpentByCategory(supabase, year, month),
  ]);

  if ("error" in budgetsRes) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[60dvh]">
        <p className="text-expense mb-4">โหลดงบไม่สำเร็จ</p>
        <p className="text-text-muted text-sm mb-6">{budgetsRes.error}</p>
        <SmoothLink
          href="/settings"
          direction="back"
          className="min-h-[44px] rounded-btn bg-surface px-5 py-3 text-sm"
        >
          กลับหน้าตั้งค่า
        </SmoothLink>
      </div>
    );
  }

  const budgets = budgetsRes.data;
  const categories = (("data" in catsRes ? catsRes.data : []) ?? []) as CategoryRow[];

  // แผนผังข้อมูลสรุป: หมวด + งบเดือนนี้ + ยอดใช้จริง
  const rows = categories.map((c) => {
    const budget = budgets.find((b: BudgetRow) => b.category_id === c.id);
    const budgetSatang =
      budget !== undefined ? BigInt(budget.amount) : null;
    const spentSatang = spentMap.get(c.id) ?? BigInt(0);
    return {
      category_id: c.id,
      name: c.name,
      icon: c.icon,
      // id ของแถวงบ (ถ้าตั้งไว้แล้ว) — client ต้องใช้ตอนกด "ล้าง" (DELETE ตาม id)
      budgetId: budget !== undefined ? budget.id : null,
      budgetSatang,
      spentSatang,
    };
  });

  return (
    <BudgetsClient
      year={year}
      month={month}
      rows={rows}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
      }))}
    />
  );
}
