/**
 * Route handler JSON backup — ยกโครงจาก /export/transactions ทั้งหมด
 * ต่างกันแค่ output เดียว: JSON backup (ไม่มี CSV)
 * ตรวจ 401 / 413 ที่ getExportData ทำแล้ว
 */
import { NextResponse } from "next/server";
import { getExportData, EXPORT_ROW_LIMIT } from "@/lib/export-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, area } = await getExportData();
  if (!data) {
    if (area === "auth") {
      return NextResponse.json({ error: "ไม่ได้เข้าสู่ระบบ" }, { status: 401 });
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

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data.backup), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jodtang-backup-${date}.json"`,
    },
  });
}
