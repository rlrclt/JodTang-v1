import { SmoothLink } from "@/components/SmoothLink";
import { signOut } from "@/lib/supabase/actions";

// หน้าตั้งค่า (hub) — จุดเข้าถึงการตั้งค่าทั้งหมด + ปุ่มออกจากระบบ
// ลิงก์ 6 หน้า + ปุ่มออกจากระบบ · ไม่มีปุ่มสลับธีม (โหมดมืดเป็นเฟสหลัง)
// ไม่ใช้ AppShell ตรงนี้ เพราะ shell ครอบด้วย layout ของ root แล้ว
export default function SettingsPage() {
  const items = [
    { href: "/settings/accounts", label: "กระเป๋าเงิน", icon: "wallet" },
    { href: "/settings/categories", label: "หมวดหมู่", icon: "tag" },
    { href: "/settings/budgets", label: "งบประมาณ", icon: "budget" },
    { href: "/settings/trash", label: "ถังขยะ", icon: "trash" },
    { href: "/settings/export", label: "ส่งออกข้อมูล", icon: "export" },
    { href: "/settings/profile", label: "บัญชีของฉัน", icon: "profile" },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="p-4 pb-2">
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
      </header>

      <main className="flex-1 px-4 pb-4">
        <section aria-label="การตั้งค่าทั้งหมด" className="grid gap-2">
          {items.map((item) => (
            <SmoothLink
              key={item.href}
              href={item.href}
              className="flex min-h-[56px] items-center gap-3 rounded-btn border border-border bg-surface px-4 py-3 text-text transition-colors hover:bg-surface-2"
            >
              <ChannelIcon icon={item.icon} />
              <span className="flex-1">{item.label}</span>
              <ChevronRight />
            </SmoothLink>
          ))}
        </section>
      </main>

      <footer className="p-4">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full min-h-[44px] rounded-btn border border-border bg-surface px-4 py-3 text-base text-text transition-colors hover:bg-surface-2"
          >
            ออกจากระบบ
          </button>
        </form>
      </footer>
    </div>
  );
}

function ChannelIcon({ icon }: { icon: string }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
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
    case "trash":
      return (
        <svg {...common}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
    case "export":
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

function ChevronRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-muted"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
