/**
 * ตรรกะล้วนของหน้า /settings/budgets — แยกออกจาก UI เพื่อให้ node --test หยิบไปรันได้โดยตรง
 * กติกา: คำนวณเงินด้วยจำนวนเต็มสตางค์เท่านั้น ห้ามใช้ทศนิยม
 */

/**
 * ข้อความบาท → สตางค์ (bigint) โดยไม่เสียเลข
 * รับรูปแบบ "1,234.5" หรือ "1234.56" · คืน null ถ้าฟอร์แมตไม่ใช่ตัวเลข/ติดลบ
 */
export function bahtTextToSatang(text: string): bigint | null {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;

  const dot = cleaned.indexOf(".");
  const wholeZeros = dot === -1 ? cleaned.length : dot;
  const subPart = dot === -1 ? "" : cleaned.slice(dot + 1);
  // สตางค์เกิน 2 หลัก = ปัดทิ้ง (app รับเงินระดับสตางค์)
  const sub = subPart.slice(0, 2).padEnd(2, "0");
  const whole = cleaned.slice(0, wholeZeros);

  try {
    return BigInt(whole + sub);
  } catch {
    return null;
  }
}

/** สตางค์ → ข้อความบาทแบบกรอกได้ (ไม่ใส่คอมมา) เช่น 123456 → "1234.56" */
export function satangToBahtText(satang: bigint): string {
  const negative = satang < 0;
  const abs = negative ? -satang : satang;
  const baht = abs / BigInt(100);
  const sub = abs % BigInt(100);
  const s = `${baht}.${sub
    .toString()
    .padStart(2, "0")}`
    .replace(/0+$/, "")
    .replace(/\.$/, "");
  return negative ? `-${s}` : s;
}

/**
 * % ที่ใช้ไป = floor(spent / budget * 100) — จำนวนเต็มเสมอ
 * คืน null เมื่อไม่มีงบ (งบ null เท่านั้น · งบ 0 = ตั้งไว้แล้วแต่เป็นศูนย์)
 */
export function spendPercent(
  spentSatang: bigint,
  budgetSatang: bigint | null
): number | null {
  if (budgetSatang === null) return null;
  if (budgetSatang === BigInt(0)) return null; // งบ 0 = ไม่อ้างอิงเปอร์เซ็นต์
  return Number((spentSatang * BigInt(100)) / budgetSatang);
}

/**
 * เตือนเมื่อ ≥80% — เข้มงวดที่ขอบ 80.00%:
 * ใช้จำนวนเต็มตรง ๆ (spent*100 >= budget*80) ไม่ทำทศนิยม จึงตัดที่ 79.99% ไม่เตือน
 */
export function shouldWarn(
  spentSatang: bigint,
  budgetSatang: bigint | null
): boolean {
  if (budgetSatang === null || budgetSatang === BigInt(0)) return false;
  return spentSatang * BigInt(100) >= budgetSatang * BigInt(80);
}

/**
 * "2026-09" → period_month "2026-09-01" (วันแรกของเดือน)
 * คืน null ถ้าฟอร์แมตผิด เพื่อให้ caller ตัดสินใหม่ด้วยเดือนปัจจุบัน
 */
export function monthKeyToPeriodMonth(monthKey: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const month = Number(monthKey.slice(5, 7));
  if (month < 1 || month > 12) return null;
  return `${monthKey}-01`;
}

/** ปี/เดือน → "2026-09" (key ของ URL) */
export function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** เลื่อนเดือน ±n — เดือนเป็น 1-12, ปีตามจริง */
export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(total / 12),
    month: (total % 12) + 1,
  };
}

/** ชื่อแนวหมวด "ตั้งงบแล้ว 0 บาท" กับ "ยังไม่ตั้งงบ" ต้องแยกออกจากกันเสมอ */
export function budgetStateLabel(
  budgetSatang: bigint | null
): "none" | "zero" | "set" {
  if (budgetSatang === null) return "none";
  if (budgetSatang === BigInt(0)) return "zero";
  return "set";
}
