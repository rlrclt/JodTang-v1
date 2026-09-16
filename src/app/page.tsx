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
    <div className="flex min-h-[100dvh] flex-col items-center justify-center p-8">
      <h1 className="mb-4 text-4xl font-bold">JodTang</h1>
      <p className="mb-8 text-lg text-text-muted">
        จดบันทึกรายรับรายจ่าย + AI วิเคราะห์
      </p>

      {configured ? (
        isLoggedIn ? (
          <div className="text-center">
            <p className="mb-4 text-income">เข้าสู่ระบบแล้ว</p>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text transition-colors hover:bg-surface-2"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        ) : (
          <p className="text-warn">
            <a href="/login" className="underline">
              เข้าสู่ระบบ
            </a>
          </p>
        )
      ) : (
        <div className="text-center">
          <p className="mb-4 text-warn">
            ยังไม่ได้ตั้งค่า Supabase — กรุณาคัดลอก .env.example เป็น .env.local
            แล้วใส่ค่า
          </p>
          <code className="rounded-lg bg-surface px-3 py-1 text-sm">
            cp .env.example .env.local
          </code>
        </div>
      )}
    </div>
  );
}
