/**
 * ดึงข้อมูลจาก Supabase สำหรับชั้นส่งออก — แยกจาก route handler เพื่อเทสต์
 * (โค้ดนี้ import supabase client — จึงต้องไม่โดนเทสต์ unit ขนาดเล็ก; เทสต์ผ่าน pglite/RLS จริงแทน)
 *
 * กติกา:
 * - ใช้ session client — NOT secret key, NOT bypass RLS
 * - ไม่รวมรายการที่ลบ soft delete (ตามสเปกการ์ด)
 * - เช็คจำนวนแถวทั้งหมดของ user ก่อน เกิน 20,000 = บอกผู้ใช้ให้กรองเอง
 *   (ห้ามตัดเงียบเด็ดขาด — ข้อมูลการเงินที่หายไปครึ่งหนึ่งเป็นอะไรที่อันตรายมาก)
 */
import { createClient } from "@/lib/supabase/server";
import {
  BackupPayload,
  ExportTransaction,
  EXPORT_ROW_LIMIT,
  isOverExportLimit,
  transactionsToCsv,
} from "@/lib/export";

export { EXPORT_ROW_LIMIT } from "@/lib/export";

export type ExportArea = "auth" | "limit" | "error" | null;

export type ExportResult =
  | { data: { csv: string; backup: BackupPayload }; area: null }
  | { data: null; area: Exclude<ExportArea, null>; message?: string };

const TX_SELECT = `
  id, kind, amount, note, occurred_at,
  accounts!transactions_account_id_fkey(name),
  to_accounts:accounts!transactions_to_account_id_fkey(name),
  categories(name)
`;

const ACCOUNT_SELECT = "id, name, currency, archived_at";
const CATEGORY_SELECT = "id, name, icon, kind, archived_at";
const BUDGET_SELECT = "id, period_month, amount, category_id";

/**
 * นับจำนวนรายการทั้งหมด (ไม่รวม soft delete) — ใช้ตรวจว่าเกินลิมิตไหม
 */
async function countTransactions(supabase: any): Promise<number> {
  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * เรียกรายการ (ไม่รวม soft delete) แบบแบ่งหน้าเพื่อไม่โหลดทีเดียว 20,000 แถว
 * (keyset pagination — เหมือน actions/transactions.ts)
 */
async function fetchTransactions(
  supabase: any,
  totalCount: number
): Promise<ExportTransaction[]> {
  const rows: ExportTransaction[] = [];
  const PAGE = 1000;
  let cursor: { occurred_at: string; id: string } | null = null;

  while (rows.length < totalCount) {
    let query = supabase
      .from("transactions")
      .select(TX_SELECT)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE);

    if (cursor) {
      query = query.or(
        `occurred_at.lt.${cursor.occurred_at},and(occurred_at.eq.${cursor.occurred_at},id.lt.${cursor.id})`
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data) {
      rows.push({
        id: row.id,
        kind: row.kind,
        amount: Number(row.amount),
        note: row.note,
        occurred_at: row.occurred_at,
        account_name: row.accounts?.name ?? null,
        to_account_name: row.to_accounts?.name ?? null,
        category_name: row.categories?.name ?? null,
      });
    }
    const last = data[data.length - 1];
    cursor = { occurred_at: last.occurred_at, id: last.id };

    if (data.length < PAGE) break;
  }

  return rows;
}

export async function getExportData(): Promise<ExportResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { data: null, area: "auth" };

    const total = await countTransactions(supabase);
    if (isOverExportLimit(total)) {
      return {
        data: null,
        area: "limit",
        message: `รวม ${total} แถว — เกินลิมิต ${EXPORT_ROW_LIMIT}`,
      };
    }

    const transactions = await fetchTransactions(supabase, total);

    // เอา accounts/categories/budgets มาด้วย เพื่อทำ JSON backup ครบชุด
    // (แต่ละตารางผูกกับ user คนนี้อยู่แล้วโดย RLS — อ่านทั้งตารางได้เพราะ session filter user_id)
    const [accRes, catRes, budRes] = await Promise.all([
      supabase.from("accounts").select(ACCOUNT_SELECT).order("name"),
      supabase.from("categories").select(CATEGORY_SELECT).order("name"),
      supabase.from("budgets").select(BUDGET_SELECT).order("period_month"),
    ]);

    if (accRes.error) throw new Error(accRes.error.message);
    if (catRes.error) throw new Error(catRes.error.message);
    if (budRes.error) throw new Error(budRes.error.message);

    const backup: BackupPayload = {
      exported_at: new Date().toISOString(),
      version: 1,
      transactions,
      accounts: accRes.data,
      categories: catRes.data,
      budgets: budRes.data.map((b: any) => ({
        id: b.id,
        period_month: b.period_month,
        amount_satang: b.amount,
        category_id: b.category_id,
      })),
    };

    return { data: { csv: transactionsToCsv(transactions), backup }, area: null };
  } catch (e) {
    // ห้ามมี error ที่ล้มทั้ง route — จะคืน area error เพื่อให้ route handler ตอบ 500
    console.error("getExportData failed:", e);
    return { data: null, area: "error" };
  }
}
