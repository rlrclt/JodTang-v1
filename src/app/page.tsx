import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function Home() {
  const configured = isSupabaseConfigured();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">JodTang</h1>
      <p className="text-lg text-gray-600 mb-8">
        จดบันทึกรายรับรายจ่าย + AI วิเคราะห์
      </p>

      {configured ? (
        <p className="text-green-600">เชื่อมต่อ Supabase แล้ว</p>
      ) : (
        <div className="text-center">
          <p className="text-amber-600 mb-4">
            ยังไม่ได้ตั้งค่า Supabase — กรุณาคัดลอก .env.example เป็น .env.local แล้วใส่ค่า
          </p>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm">
            cp .env.example .env.local
          </code>
        </div>
      )}
    </main>
  );
}
