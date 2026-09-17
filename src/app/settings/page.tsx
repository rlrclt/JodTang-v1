import { SmoothLink } from "@/components/SmoothLink";
import { signOut } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let avatarUrl: string | null = null;
  let userName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "ผู้ใช้งาน JodTang";
  const userEmail = user?.email || "ผู้ใช้งาน JodTang";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      if (profile.full_name) userName = profile.full_name;
      if (profile.avatar_url) avatarUrl = profile.avatar_url;
    }
    // fallback avatar from Google OAuth metadata
    if (!avatarUrl && user.user_metadata?.avatar_url) {
      avatarUrl = user.user_metadata.avatar_url;
    }
    if (!avatarUrl && user.user_metadata?.picture) {
      avatarUrl = user.user_metadata.picture;
    }
  }
  const sections = [
    {
      title: "การเงินและข้อมูล",
      items: [
        {
          href: "/settings/accounts",
          label: "กระเป๋าเงินและบัญชี",
          sublabel: "จัดการเงินสด บัญชีธนาคาร และบัตร",
          icon: "wallet",
          color: "from-blue-500 to-indigo-600",
        },
        {
          href: "/settings/categories",
          label: "หมวดหมู่รายรับ-รายจ่าย",
          sublabel: "สร้างและปรับแต่งหมวดหมู่ส่วนตัว",
          icon: "tag",
          color: "from-emerald-500 to-teal-600",
        },
        {
          href: "/settings/budgets",
          label: "วางแผนงบประมาณ",
          sublabel: "ตั้งงบรายเดือนและควบคุมการใช้จ่าย",
          icon: "budget",
          color: "from-amber-500 to-orange-600",
        },
      ],
    },
    {
      title: "ระบบและการจัดการ",
      items: [
        {
          href: "/settings/theme",
          label: "ปรับแต่งธีมและสีสัน",
          sublabel: "เลือกธีมสว่าง ธีมมืด หรือพาเลตต์สี",
          icon: "theme",
          color: "from-purple-500 to-pink-600",
        },
        {
          href: "/settings/export",
          label: "ส่งออกและสำรองข้อมูล",
          sublabel: "ดาวน์โหลดไฟล์ CSV หรือ JSON",
          icon: "export",
          color: "from-sky-500 to-cyan-600",
        },
        {
          href: "/settings/trash",
          label: "ถังขยะและกู้คืน",
          sublabel: "กู้คืนรายการหรือลบถาวร",
          icon: "trash",
          color: "from-rose-500 to-red-600",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28 select-none">
      {/* 1. Profile Hero Card (iOS Apple ID Style) */}
      <SmoothLink
        href="/settings/profile"
        direction="forward"
        className="group mb-6 flex items-center gap-3.5 rounded-3xl border border-white/20 bg-surface/95 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl transition-all duration-200 hover:bg-surface-2/60 active:scale-[0.99]"
      >
        {/* User Avatar */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="size-14 shrink-0 rounded-2xl object-cover shadow-md ring-2 ring-white/30 dark:ring-white/10"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-focus via-blue-500 to-sky-400 text-xl font-black text-white shadow-md shadow-focus/25">
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
        {/* User Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-base font-extrabold text-text group-hover:text-focus transition-colors">
              {userName}
            </h2>
            <span className="shrink-0 rounded-full bg-focus/10 px-2 py-0.5 text-[9px] font-bold text-focus">
              บัญชีของฉัน
            </span>
          </div>
          <p className="truncate text-xs font-medium text-text-muted mt-0.5">
            {userEmail}
          </p>
        </div>

        <ChevronRight />
      </SmoothLink>

      {/* 2. Grouped Settings Sections (iOS Inset Grouped Style) */}
      <div className="space-y-6">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-2">
            <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-text-muted">
              {sec.title}
            </h3>

            <div className="overflow-hidden rounded-3xl border border-border/50 bg-surface/90 shadow-sm backdrop-blur-xl divide-y divide-border/40">
              {sec.items.map((item) => (
                <SmoothLink
                  key={item.href}
                  href={item.href}
                  direction="forward"
                  className="group flex min-h-[58px] items-center gap-3.5 px-4 py-3 transition-colors hover:bg-surface-2/70 active:bg-surface-2"
                >
                  {/* Icon Box with Gradient Badge */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${item.color} text-white shadow-xs`}
                  >
                    <ChannelIcon icon={item.icon} />
                  </div>

                  {/* Label & Sublabel */}
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-text group-hover:text-focus transition-colors">
                      {item.label}
                    </span>
                    <span className="block text-[11px] font-medium text-text-muted truncate mt-0.5">
                      {item.sublabel}
                    </span>
                  </div>

                  <ChevronRight />
                </SmoothLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 3. App Version & Sign Out Section */}
      <div className="mt-8 space-y-4 text-center">
        <form action={signOut}>
          <button
            type="submit"
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-expense/20 bg-expense/5 px-4 py-3 text-sm font-bold text-expense shadow-xs transition-all hover:bg-expense/15 active:scale-[0.99]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>ออกจากระบบ</span>
          </button>
        </form>

        <p className="text-[11px] text-text-muted font-medium">
          JodTang (จดตังค์) v1.0 · ออกแบบด้วยความใส่ใจเพื่อการเงินของคุณ
        </p>
      </div>
    </div>
  );
}

function ChannelIcon({ icon }: { icon: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (icon) {
    case "wallet":
      return (
        <svg {...common}>
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.205a2.426 2.426 0 0 0 0-3.42z" />
          <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
        </svg>
      );
    case "budget":
      return (
        <svg {...common}>
          <rect x="2" y="3" width="20" height="4" rx="1" />
          <rect x="2" y="9" width="20" height="4" rx="1" />
          <rect x="2" y="15" width="20" height="4" rx="1" />
        </svg>
      );
    case "theme":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      );
    case "export":
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    default:
      return null;
  }
}

function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-muted shrink-0 opacity-60"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
