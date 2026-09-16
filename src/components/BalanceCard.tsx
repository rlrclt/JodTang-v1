import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Balance card — แสดงยอดเดือนนี้ (รับ/จ่าย/คงเหลือ).
 *
 * มี `view-transition-name: balance-card` เพื่อให้เบราว์เซอร์ morph
 * การ์ดนี้ระหว่างหน้า (home ↔ offline) โดยไม่ซ้ำกับ element อื่น
 * ใน snapshot เดียวกัน (กติกา: ห้ามซ้ำ = เบราว์เซอร์ข้าม transition ทั้งหน้า)
 *
 * v1: static, ไม่ดึง DB, ไม่เชื่อม Supabase
 */
export function BalanceCard() {
  const configured = isSupabaseConfigured();

  return (
    <div
      className="balance-card rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      style={{ viewTransitionName: "balance-card" }}
    >
      <h2 className="mb-4 text-sm font-medium text-gray-500">ยอดเดือนนี้</h2>

      {configured ? (
        <p className="text-green-600">เชื่อมต่อ Supabase แล้ว</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-500">รายรับ</span>
            <span className="font-semibold text-green-600">฿0.00</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-500">รายจ่าย</span>
            <span className="font-semibold text-red-600">฿0.00</span>
          </div>
          <div className="border-t border-gray-100 pt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-gray-700">คงเหลือ</span>
              <span className="font-bold text-gray-900">฿0.00</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
