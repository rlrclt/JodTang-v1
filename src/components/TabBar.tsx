"use client";

import { SmoothLink } from "./SmoothLink";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "หน้าแรก", href: "/", icon: "home" },
  { label: "รายการ", href: "/transactions", icon: "list" },
  { label: "สรุป", href: "/summary", icon: "chart" },
  { label: "ตั้งค่า", href: "/settings", icon: "settings" },
] as const;

export default function TabBar({ visible = true }: { visible?: boolean }) {
  const pathname = usePathname();

  if (!visible) return null;

  return (
    <nav
      role="tablist"
      aria-label="แถบนำทางหลัก"
      className="fixed bottom-0 left-4 right-4 z-50 mx-auto max-w-md rounded-full border border-white/25 dark:border-white/10 bg-white/15 dark:bg-black/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-2xl saturate-180"
      style={{
        height: "60px",
        bottom: "calc(env(safe-area-inset-bottom) + 12px)",
      }}
    >
      <ul className="flex h-full items-center justify-around list-none m-0 p-0">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <li key={tab.href} className="flex-1">
              <SmoothLink
                href={tab.href}
                prefetch={true}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  // แตะแท็บที่อยู่แล้ว = เลื่อนขึ้นบนสุด (ธรรมเนียม iOS)
                  if (isActive) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    return;
                  }
                  // สั่นเบาๆ ตอนเปลี่ยนแท็บ (Android เท่านั้น — iOS ไม่มี API ให้)
                  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                    navigator.vibrate(8);
                  }
                }}
                className={`flex flex-col items-center justify-center h-full text-xs gap-0.5 transition-colors duration-120 active:scale-95 ${
                  isActive ? "text-focus font-semibold" : "text-text-muted"
                }`}
              >
                <span
                  key={`${tab.href}${isActive ? "-on" : ""}`}
                  // iOS แท้ไม่มีป้ายรองหลัง — ใช้สี tint + เด้งอย่างเดียว
                  className={isActive ? "tab-icon-active" : undefined}
                >
                  <TabIcon icon={tab.icon} active={isActive} />
                </span>
                <span>{tab.label}</span>
              </SmoothLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  const strokeWidth = active ? 2.5 : 1.5;

  switch (icon) {
    case "home":
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "list":
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case "chart":
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "settings":
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return null;
  }
}
