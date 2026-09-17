import { SmoothLink } from "@/components/SmoothLink";
import { createClient } from "@/lib/supabase/server";
import ResetDataSection from "./ResetDataSection";
import LineConnectSection from "./LineConnectSection";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const lineConnected = params["line_connected"] === "1";
  const lineErrorRaw = params["line_error"];
  const lineError = Array.isArray(lineErrorRaw) ? lineErrorRaw[0] : lineErrorRaw;
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
        <LineConnectSection
          email={user.email || ""}
          name={profile?.full_name || user.email?.split("@")[0] || "ผู้ใช้งาน"}
          lineUserId={profile?.line_user_id || null}
          lineConnected={lineConnected}
          lineError={lineError ?? null}
        />
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
