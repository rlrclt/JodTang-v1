/**
 * Route handler ส่งออกรายการเป็น CSV/JSON
 *
 * กติกา:
 * - ไม่มี session → 401 JSON (ไม่ redirect — เพราะผู้เรียกอาจเป็น curl/external)
 * - ไม่รวมรายการที่ soft delete แล้ว (deleted_at IS NULL)
 * - จำกัด 20,000 แถว เกิน = คืน 413 + ข้อความให้กรองให้แคบลง (ไม่ตัดเงียบ)
 * - เงินใน output: คอลัมน์ "สตางค์" = จำนวนเต็ม และ "บาท" = format แล้ว (ดูที่ src/lib/export.ts)
 * - RLS ตัดสิน user_id — session client อ่านได้แค่ของตัวเอง ผู้เรียกจะหลอก id ไม่ได้
 */
import { NextRequest, NextResponse } from "next/server";
import { getExportData, EXPORT_ROW_LIMIT } from "@/lib/export-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { data, area } = await getExportData();
  if (!data) {
    if (area === "auth") {
      return NextResponse.json(
        { error: "ไม่ได้เข้าสู่ระบบ" },
        { status: 401 }
      );
    }
    if (area === "limit") {
      return NextResponse.json(
        {
          error: `ข้อมูลเกิน ${EXPORT_ROW_LIMIT} แถว — กรุณากรองช่วงเวลา/หมวดให้แคบลง`,
        },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }

  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (format === "json") {
    return new NextResponse(JSON.stringify(data.backup), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="jodtang-transaction-${date}.json"`,
      },
    });
  }

  // CSV ที่มี BOM — กัน Excel/ชีตอ่าน UTF-8 เพี้ยน และหัวคอลัมน์ภาษาไทยถูกต้อง
  return new NextResponse(data.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jodtang-transactions-${date}.csv"`,
    },
  });
}
