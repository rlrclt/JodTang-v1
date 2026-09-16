import { BalanceCard } from "@/components/BalanceCard";
import { SmoothLink } from "@/components/SmoothLink";

/**
 * หน้าแรก (in-app) — v1 แสดง demo motion layer
 *
 * BalanceCard ที่นี่เป็น "ลูก" ของหน้า\ navigation ครั้งถัดไป
 * แสดง demo motion layer แบบ nested (หน้าแรก in-app) — BalanceCard ถูก target เป็น element ธรรมดา
 * เพราะ goto /login สร้าง document เปล่า (snapshot ไม่มี balance-card คู่ขัดแย้ง)
 */
export default function HomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="mb-2 text-3xl font-bold">JodTang</h1>
      <p className="text-text-muted">จดบันทึกรายรับรายจ่าย + AI วิเคราะห์</p>

      <BalanceCard />

      <SmoothLink
        href="/login"
        className="mt-4 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
      >
        ไปหน้าเข้าสู่ระบบ (cross-fade)
      </SmoothLink>
      <SmoothLink
        href="/settings"
        className="mt-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        ไปหน้าตั้งค่า (cross-fade)
      </SmoothLink>
    </div>
  );
}
