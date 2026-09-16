import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/supabase/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const configured = isSupabaseConfigured();

  let isLoggedIn = false;
  if (configured) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    isLoggedIn = !!session;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">JodTang</h1>
      <p className="text-lg text-gray-600 mb-8">
        จดบันทึกรายรับรายจ่าย + AI วิเคราะห์
      </p>

      {configured ? (
        isLoggedIn ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">เข้าสู่ระบบแล้ว</p>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 transition-colors"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        ) : (
          <p className="text-amber-600">
            <a href="/login" className="underline hover:text-amber-800">
              เข้าสู่ระบบ
            </a>
          </p>
        )
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
