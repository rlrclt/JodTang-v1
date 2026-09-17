import { SmoothLink } from "@/components/SmoothLink";
import { createClient } from "@/lib/supabase/server";
import ResetDataSection from "./ResetDataSection";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center p-8 text-center">
          <p className="text-text-muted">ไม่พบข้อมูลบัญชี</p>
        </main>
      </div>
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url, line_user_id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex-1 px-4 pb-4">
        {error ? (
          <p className="rounded-card border border-border bg-surface p-4 text-warn">
            โหลดข้อมูลบัญชีไม่สำเร็จ: {error.message}
          </p>
        ) : (
          <section className="rounded-card border border-border bg-surface p-5">
            <div className="mb-5 flex items-center gap-4">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-balance text-2xl font-bold text-white"
                >
                  {(profile?.full_name ?? user.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold">
                  {profile?.full_name ?? "ยังไม่ได้ตั้งชื่อ"}
                </h2>
                <p className="text-sm text-text-muted">บัญชีของฉัน</p>
              </div>
            </div>
            <dl className="divide-y divide-border text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-text-muted">อีเมล</dt>
                <dd className="text-right">{profile?.email ?? user.email ?? "ไม่มีอีเมล"}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-text-muted">ผู้ให้บริการ</dt>
                <dd className="text-right">{user.app_metadata.provider ?? "ไม่ระบุ"}</dd>
              </div>
            </dl>
          </section>
        )}

        {/* LINE Bot Integration Card */}
        <section className="mt-4 rounded-3xl border border-emerald-500/20 bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#06C755] text-white font-black text-xl shadow-sm">
              L
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">เชื่อมต่อ LINE Bot จดบันทึกด่วน</h3>
              <p className="text-[11px] text-text-muted">ส่งรูปสลิป/ใบเสร็จใน LINE เพื่อบันทึกอัตโนมัติ</p>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-2/80 p-3 text-xs text-text space-y-2 border border-border/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-muted">สถานะการเชื่อมต่อ:</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${profile?.line_user_id ? "bg-income/10 text-income" : "bg-warn/10 text-warn"}`}>
                {profile?.line_user_id ? "✓ เชื่อมต่อแล้ว" : "ยังไม่ได้เชื่อมต่อ"}
              </span>
            </div>

            <p className="text-[11px] text-text-muted leading-relaxed">
              วิธีเชื่อมต่อ: เพิ่มเพื่อนกับ LINE Bot ของคุณ แล้วพิมพ์คำสั่งนี้ส่งไปในแชท:
            </p>
            <div className="flex items-center justify-between rounded-xl bg-bg px-3 py-2 font-mono text-xs font-bold text-focus border border-border/50">
              <span>LINK:{user.email}</span>
              <span className="text-[10px] font-sans text-text-muted font-normal">คัดลอกส่งใน LINE</span>
            </div>
          </div>
        </section>
        <ResetDataSection />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-2 p-4 pb-2">
      <SmoothLink href="/settings" direction="back" className="-m-2 p-2" aria-label="กลับไปหน้าตั้งค่า">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </SmoothLink>
      <h1 className="text-2xl font-bold">บัญชีของฉัน</h1>
    </header>
  );
}
