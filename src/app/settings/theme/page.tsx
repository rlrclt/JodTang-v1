"use client";

import { useEffect, useState } from "react";
import { SmoothLink } from "@/components/SmoothLink";
import {
  getStoredTheme,
  setTheme,
  applyTheme,
  type ThemeMode,
} from "@/lib/theme";

const OPTIONS: { id: ThemeMode; label: string; desc: string }[] = [
  { id: "light", label: "สว่าง", desc: "พื้นขาว อ่านง่ายกลางวัน" },
  { id: "dark", label: "มืด", desc: "พื้นเข้ม ถนอมตากลางคืน" },
  { id: "system", label: "ตามระบบ", desc: "ตามที่ตั้งไว้ในเครื่อง" },
];

// หน้าตั้งค่าธีม — แตะแล้วเห็นผลทันทีทั้งหน้า (ไม่ต้องกดบันทึก)
export default function ThemePage() {
  // อ่านค่าตั้งแต่ render แรก (กันกระพริบ + ไม่ต้อง setState ใน effect)
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(getStoredTheme());

    // โหมดตามระบบ: OS เปลี่ยนตอนเปิดหน้านี้อยู่ก็ตามให้
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center gap-2 p-4 pb-2">
        <SmoothLink
          href="/settings"
          direction="back"
          className="p-2 -m-2"
          aria-label="กลับไปหน้าตั้งค่า"
        >
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
        <h1 className="text-2xl font-bold">ธีม</h1>
      </header>

      <main className="flex-1 px-4">
        <section aria-label="เลือกธีม" className="grid gap-2">
          {OPTIONS.map((opt) => {
            const selected = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setMode(opt.id);
                  setTheme(opt.id);
                }}
                className={`flex min-h-[56px] items-center gap-3 rounded-btn border px-4 py-3 text-left transition-colors active:bg-surface-2 ${
                  selected
                    ? "border-focus bg-surface"
                    : "border-border bg-surface"
                }`}
              >
                <ThemeIcon mode={opt.id} />
                <span className="flex-1">
                  <span className="block text-base font-medium text-text">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-text-muted">
                    {opt.desc}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selected ? "border-focus" : "border-border"
                  }`}
                >
                  {selected && (
                    <span className="h-3 w-3 rounded-full bg-focus" />
                  )}
                </span>
              </button>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
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
  if (mode === "dark") {
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  if (mode === "system") {
    return (
      <svg {...common}>
        <rect x="2" y="4" width="20" height="14" rx="2" />
        <line x1="8" y1="22" x2="16" y2="22" />
        <line x1="12" y1="18" x2="12" y2="22" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
