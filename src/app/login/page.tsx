import { createClient } from "@/lib/supabase/server";
import { validateSessionResult } from "@/lib/middleware-guards";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ปุ่ม provider ที่รองรับ — LINE ไม่ใช้ OAuth login (HS256 incompatible กับ Supabase)
// เชื่อมต่อ LINE ผ่าน Bot Chat ในหน้า Settings แทน
const PROVIDERS = [
  { id: "google", name: "เข้าสู่ระบบด้วย Google" },
] as const;

// หน้า /login — แสดงปุ่ม Google
// ถ้ามี session อยู่แล้ว redirect ไป /
export default async function LoginPage() {
  const supabase = await createClient();

  // D1 fix: ใช้ getUser() แทน getSession()
  const { data, error } = await supabase.auth.getUser();

  if (validateSessionResult({ data, error })) {
    const { redirect: redir } = await import("next/navigation");
    redir("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">JodTang</h1>
      <p className="text-lg text-text-muted mb-8">จดบันทึกรายรับรายจ่าย</p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {PROVIDERS.map((provider) => (
          <Link
            key={provider.id}
            href={`/auth/signin?provider=${provider.id}`}
            className="flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-surface px-6 py-3.5 text-sm font-bold text-text shadow-sm hover:bg-surface-2 transition-all active:scale-[0.99]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>{provider.name}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
