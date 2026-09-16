/**
 * ชั้นจัดการไฟล์ส่งออก (CSV + JSON backup)
 *
 * การตัดสินใจเรื่องเงินในไฟล์ส่งออก (ตามสเปกการ์ด):
 * ใส่ **ทั้งสองคอลัมน์** — "สตางค์" ค่าจำนวนเต็มดิบจาก DB (big int,
 * ใช้ตรวจสอบ/ประมวลผลต่อได้ไม่สูญเสียความแม่น) และ "บาท" จัดรูปแบบด้วย
 * formatSatang() สำหรับมนุษย์อ่าน/เปิดในชีต เหตุผลที่ไม่ใส่คอลัมน์เดียว:
 * ถ้ามีแต่บาทที่ format แล้ว จะเป็นข้อความ (มี ฿/,) ไม่ดีต่อการ sum ในชีต
 * ถ้ามีแต่สตางค์ดิบ ผู้ใช้ทั่วไปอ่านไม่เข้าใจ — สองคอลัมน์ครอบคลุมทั้งสองกรณี
 * ห้ามแสดงสตางค์เป็นทศนิยม (บังคับจาก .hermes.md)
 *
 * หลักการ: helper เหล่านี้เป็น pure function — เทสต์ด้วย node --test โดยไม่ต้องมี DB
 */

export type ExportTransaction = {
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: number | string; // สตางค์ (bigint จาก DB)
  note: string | null;
  occurred_at: string;
  account_name: string | null;
  to_account_name: string | null;
  category_name: string | null;
};

export const CSV_HEADERS = [
  "วันที่",
  "ประเภท",
  "สตางค์",
  "บาท",
  "หมวดหมู่",
  "กระเป๋า",
  "ไปยังกระเป๋า",
  "โน้ต",
] as const;

/** formatSatang มี ฿/comma — ต้อง quote เพราะ format ไทยใส่ comma คั่นหลัก */
export const MONEY_FORMAT_NOTE =
  "คอลัมน์สตางค์เป็นจำนวนเต็ม (ไม่มีทศนิยม) คอลัมน์บาทเป็นข้อความที่จัดรูปแบบแล้ว";

function escapeCsvField(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * แปลงรายการเป็น CSV string (มี BOM เพื่อให้ Excel เปิด UTF-8 ได้)
 * หัวคอลัมน์เป็นภาษาไทย — ระบุใน .hermes.md: ไทยกับเอกสาร/ผู้ใช้
 */
export function transactionsToCsv(rows: ExportTransaction[]): string {
  // แทนจาก formatSatang เพื่อกัน import cycle (format ยังไม่ถูกเรียกใน util อื่น)
  const kindLabel: Record<ExportTransaction["kind"], string> = {
    income: "รายรับ",
    expense: "รายจ่าย",
    transfer: "โอน",
  };

  const moneyFormatter = new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const body = rows.map((r) => {
    const satang = Number(r.amount);
    return [
      r.occurred_at,
      kindLabel[r.kind],
      satang, // จำนวนเต็มสตางค์ — ไม่หาร 100 กระจายในโค้ด
      moneyFormatter.format(satang / 100),
      r.category_name ?? "",
      r.account_name ?? "",
      r.to_account_name ?? "",
      r.note ?? "",
    ]
      .map(escapeCsvField)
      .join(",");
  });

  return "\uFEFF" + [CSV_HEADERS.join(","), ...body].join("\r\n") + "\r\n";
}

/**
 * โครง JSON backup — รวมข้อมูลที่เป็น "ข้อมูล" ไม่รวมรายการที่ลบ soft delete
 * (สเปกการ์ด: export ต้องไม่รวมรายการที่ลบเลย)
 */
export type BackupPayload = {
  exported_at: string;
  version: 1;
  transactions: ExportTransaction[];
  accounts: { id: string; name: string; currency: string; archived_at: string | null }[];
  categories: { id: string; name: string; icon: string | null; kind: string; archived_at: string | null }[];
  budgets: { id: string; period_month: string; amount_satang: number | string; category_id: string }[];
};

export const EXPORT_ROW_LIMIT = 20000;

/**
 * ตอบ row เกินลิมิต — สเปกการ์ด: ถ้าเกิน 20,000 บอกผู้ใช้ให้กรอง/เลือกช่วงเดือนให้แคบลง
 * ทำงานบนจำนวน "รวมทั้งหมด" ของ user คนนั้น (ไม่ตัดเงียบเด็ดขาด)
 */
export function isOverExportLimit(totalCount: number): boolean {
  return totalCount > EXPORT_ROW_LIMIT;
}
