import { SmoothLink } from "@/components/SmoothLink";
import { createClient } from "@/lib/supabase/server";
import ResetDataSection from "./ResetDataSection";
import LineConnectSection from "./LineConnectSection";
import ProfileNameEditor from "./ProfileNameEditor";
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return (
      <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28">
        <Header />
        <main className="mt-8 flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-border/40 bg-surface/70 backdrop-blur-xl">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-2xl mb-3 shadow-inner">
            👤
          </div>
          <p className="font-semibold text-text">ไม่พบข้อมูลบัญชี</p>
          <p className="text-xs text-text-muted mt-1">กรุณาเข้าสู่ระบบใหม่อีกครั้ง</p>
        </main>
      </div>
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url, line_user_id")
    .eq("id", user.id)
    .maybeSingle();

  const initial = (profile?.full_name ?? user.email ?? "?").slice(0, 1).toUpperCase();
  const provider = user.app_metadata?.provider ?? "google";

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28 select-none">
      <Header />

      <main className="mt-4 space-y-4">
        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-500 backdrop-blur-xl">
            โหลดข้อมูลบัญชีไม่สำเร็จ: {error.message}
          </div>
        ) : (
          /* Profile Hero Card */
          <section className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-surface/80 p-6 shadow-sm backdrop-blur-xl">
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-gradient-to-br from-focus/20 to-teal-500/10 blur-2xl" />

            <div className="relative flex flex-col items-center text-center">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="size-20 rounded-full object-cover shadow-lg ring-4 ring-white/30 dark:ring-white/10"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex size-20 items-center justify-center rounded-full bg-gradient-to-tr from-focus to-teal-400 text-3xl font-extrabold text-white shadow-lg ring-4 ring-white/30 dark:ring-white/10"
                >
                  {initial}
                </div>
              )}
              <ProfileNameEditor
                currentName={profile?.full_name ?? user.user_metadata?.name ?? "ยังไม่ได้ตั้งชื่อ"}
              />
              <p className="text-xs text-text-muted mt-0.5">
                {profile?.email ?? user.email ?? "ไม่มีอีเมล"}
              </p>

              {/* Status Badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                เข้าสู่ระบบด้วย {provider === "google" ? "Google Account" : provider}
              </div>
            </div>

            {/* Account Metadata Inset Group */}
            <div className="mt-6 rounded-2xl border border-border/40 bg-surface-2/60 p-4 backdrop-blur-sm divide-y divide-border/40 text-xs">
              <div className="flex items-center justify-between py-2">
                <span className="text-text-muted">อีเมลหลัก</span>
                <span className="font-semibold text-text">{profile?.email ?? user.email ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-text-muted">ระบบยืนยันตัวตน</span>
                <span className="font-semibold text-text capitalize">{provider}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-text-muted">สถานะ LINE Bot</span>
                <span className="font-semibold text-text">
                  {profile?.line_user_id ? (
                    <span className="text-emerald-500 font-bold">🟢 เชื่อมต่อแล้ว</span>
                  ) : (
                    <span className="text-amber-500 font-bold">🟡 ยังไม่เชื่อมต่อ</span>
                  )}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* LINE Bot Integration Card */}
        <LineConnectSection
          email={user.email || ""}
          name={profile?.full_name || user.email?.split("@")[0] || "ผู้ใช้งาน"}
          lineUserId={profile?.line_user_id || null}
        />

        {/* Danger Zone */}
        <ResetDataSection />
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center gap-3">
      <SmoothLink
        href="/settings"
        direction="back"
        className="flex size-10 items-center justify-center rounded-full border border-white/20 dark:border-white/10 bg-surface/80 text-text shadow-sm backdrop-blur-xl transition-all active:scale-95 hover:bg-surface-2"
        aria-label="กลับไปหน้าตั้งค่า"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </SmoothLink>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-text">บัญชีของฉัน</h1>
        <p className="text-xs text-text-muted">โปรไฟล์และระบบการเชื่อมต่อ</p>
      </div>
    </header>
  );
}
