/**
 * หน้าส่งออกข้อมูล (/settings/export) — server component
 *
 * ปุ่มส่งออก CSV/JSON ชี้ไปที่ route handler (/export/transactions, /export/backup)
 * ถ้าไม่มี session จะโดน 401 — แต่หน้านี้อยู่หลังล็อกอินอยู่แล้วจึงยังโชว์ปุ่มเป็นปกติ
 * ส่วนเรื่องเกิน 20,000 แถว route handler จะตอบ 413 พร้อมข้อความให้กรองแคบลง
 * (ข้อความเตือนนี้ใส่บนหน้าด้วยเพื่อให้ผู้ใช้รู้ล่วงหน้า)
 */
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ExportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-bold">ส่งออกข้อมูล</h1>
      <p className="mb-6 text-sm text-text-muted">
        ดาวน์โหลดข้อมูลทั้งหมดของคุณ ไฟล์ส่งออกจะ
        <strong>ไม่รวมรายการที่อยู่ในถังขยะ</strong>
      </p>

      <div className="flex flex-col gap-3">
        <a
          href="/export/transactions?format=csv"
          className="min-h-11 flex items-center justify-between rounded-card border border-border bg-surface p-4 hover:bg-surface-2"
        >
          <div>
            <p className="font-semibold">รายการทั้งหมด (CSV)</p>
            <p className="text-sm text-text-muted">
              เปิดในชีตได้ · UTF-8 มี BOM · หัวคอลัมน์ภาษาไทย · จำกัด 20,000 แถว
            </p>
          </div>
          <span aria-hidden className="text-text-muted">↓</span>
        </a>

        <a
          href="/export/transactions?format=json"
          className="min-h-11 flex items-center justify-between rounded-card border border-border bg-surface p-4 hover:bg-surface-2"
        >
          <div>
            <p className="font-semibold">รายการทั้งหมด (JSON)</p>
            <p className="text-sm text-text-muted">
              ข้อมูลดิบทั้งเดียว เหมาะกับการสำรอง
            </p>
          </div>
          <span aria-hidden className="text-text-muted">↓</span>
        </a>

        <a
          href="/export/backup"
          className="min-h-11 flex items-center justify-between rounded-card border border-border bg-surface p-4 hover:bg-surface-2"
        >
          <div>
            <p className="font-semibold">สำรองข้อมูลทั้งหมด (JSON)</p>
            <p className="text-sm text-text-muted">
              รายการ + กระเป๋า + หมวด + งบ ในไฟล์เดียว
            </p>
          </div>
          <span aria-hidden className="text-text-muted">↓</span>
        </a>
      </div>

      <div className="mt-6 rounded-card border border-border bg-surface p-4 text-sm text-text-muted">
        <p className="mb-2">หมายเหตุเรื่องตัวเลขเงินในไฟล์:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            คอลัมน์ <strong>สตางค์</strong> = จำนวนเต็ม (ไม่มีทศนิยม) — เหมาะกับ
            การนำไปประมวลผลต่อ
          </li>
          <li>
            คอลัมน์ <strong>บาท</strong> = จัดรูปแบบแล้ว (มี ฿) — เหมาะกับการ
            อ่าน/ยืนยันด้วยตา
          </li>
        </ul>
        <p className="mt-2">
          ถ้าข้อมูลเกิน 20,000 แถว ระบบจะแจ้งให้กรองช่วงเวลาให้แคบลง จะ
          ไม่ตัดข้อมูลเงียบ ๆ
        </p>
      </div>

      <div className="mt-6">
        <Link href="/settings" className="text-sm text-focus underline">
          ← กลับไปหน้าตั้งค่า
        </Link>
      </div>
    </div>
  );
}
