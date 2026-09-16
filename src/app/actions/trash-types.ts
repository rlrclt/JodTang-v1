/**
 * Types ที่แชร์ระหว่าง server actions กับ client component ของถังขยะ
 * แยกออกจาก trash.ts เพราะไฟล์ "use server" import เข้า client แล้ว
 * Turbopack จะดึง next/headers ตามไป (ผิดและ build พัง)
 */

export type TrashRow = {
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: number; // สตางค์
  note: string | null;
  occurred_at: string;
  deleted_at: string;
  account_name: string | null;
  category_name: string | null;
};

export type TrashCursor = { deleted_at: string; id: string };
