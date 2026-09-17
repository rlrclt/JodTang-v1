"use server";

/**
 * Server action: ดึงข้อมูลสำหรับ MonthCalendar (แบบ iOS Zoom)
 * - months: ยอด income/expense ของแต่ละเดือนในปี (12 เดือน) — ใช้ในมุมมองปี
 * - days: ยอด income/expense ของแต่ละวันในเดือนที่เลือก — ใช้ในมุมมองเดือน
 *
 * กติกา (ตาม PLAN.md §4):
 * - ใช้ session client — ไม่ bypass RLS
 * - soft delete = ทุก query ต้องกรอง deleted_at IS NULL
 * - เงิน = bigint สตางค์เสมอ
 * - ตัดวัน/เดือนตาม timezone Asia/Bangkok
 */

import { createClient } from "@/lib/supabase/server";
import { getMonthRange } from "@/lib/date";

export type CalendarMonthTotal = { month: number; income: number; expense: number };
export type CalendarDayTotal = { day: number; income: number; expense: number };

type ActionError = { error: string };
type ActionSuccess<T> = { data: T };
type ActionResult<T> = ActionError | ActionSuccess<T>;

const BKK_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export async function getCalendarData(params: {
  year: number;
  month: number;
}): Promise<
  ActionResult<{ months: CalendarMonthTotal[]; days: CalendarDayTotal[] }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  // query ทั้งปีครั้งเดียว แล้วรวมใน JS (ตัดวัน/เดือนตาม Asia/Bangkok)
  const yearStart = getMonthRange(params.year, 1).start;
  const yearEnd = getMonthRange(params.year + 1, 1).start;

  const { data, error } = await supabase
    .from("transactions")
    .select("kind, amount, occurred_at")
    .is("deleted_at", null)
    .gte("occurred_at", yearStart)
    .lt("occurred_at", yearEnd)
    .limit(10000);

  if (error) return { error: error.message };

  const months: CalendarMonthTotal[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
  }));
  // key = day-of-month → totals เฉพาะเดือนที่เลือก
  const dayMap = new Map<number, { income: number; expense: number }>();

  for (const tx of data ?? []) {
    if (tx.kind !== "income" && tx.kind !== "expense") continue;

    const parts = BKK_FORMATTER.formatToParts(new Date(tx.occurred_at));
    const y = Number(parts.find((p) => p.type === "year")!.value);
    const m = Number(parts.find((p) => p.type === "month")!.value);
    const d = Number(parts.find((p) => p.type === "day")!.value);

    if (y !== params.year) continue;

    const monthTotal = months[m - 1];
    if (tx.kind === "income") monthTotal.income += tx.amount;
    else monthTotal.expense += tx.amount;

    if (m === params.month) {
      const dayTotal = dayMap.get(d) ?? { income: 0, expense: 0 };
      if (tx.kind === "income") dayTotal.income += tx.amount;
      else dayTotal.expense += tx.amount;
      dayMap.set(d, dayTotal);
    }
  }

  const days: CalendarDayTotal[] = Array.from(dayMap.entries())
    .map(([day, totals]) => ({ day, ...totals }))
    .sort((a, b) => a.day - b.day);

  return { data: { months, days } };
}