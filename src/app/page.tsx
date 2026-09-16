import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function Home() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">JodTang</h1>
      <p className="text-lg text-text-muted mb-8">
        จดบันทึกรายรับรายจ่าย + AI วิเคราะห์
      </p>

      {configured ? (
        <p className="text-income">เชื่อมต่อ Supabase แล้ว</p>
      ) : (
        <div className="text-center">
          <p className="text-warn mb-4">
            ยังไม่ได้ตั้งค่า Supabase — กรุณาคัดลอก .env.example เป็น
            .env.local แล้วใส่ค่า
          </p>
          <code className="bg-surface px-3 py-1 rounded-lg text-sm">
            cp .env.example .env.local
          </code>
        </div>
      )}
    </div>
  );
}
