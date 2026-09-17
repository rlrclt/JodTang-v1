"use client";

import { useEffect, useState } from "react";
import { SmoothLink } from "@/components/SmoothLink";
import {
  getStoredTheme,
  setTheme,
  applyTheme,
  type ThemeMode,
} from "@/lib/theme";

const OPTIONS: {
  id: ThemeMode;
  label: string;
  desc: string;
  previewBg: string;
  previewCard: string;
  previewText: string;
}[] = [
  {
    id: "light",
    label: "ธีมสว่าง (Light)",
    desc: "พื้นหลังสะอาด สบายตา เหมาะสำหรับใช้งานตอนกลางวัน",
    previewBg: "bg-[#F8F9FA] border-[#E9ECEF]",
    previewCard: "bg-white border-black/10 shadow-sm",
    previewText: "text-zinc-800",
  },
  {
    id: "dark",
    label: "ธีมมืด (Dark)",
    desc: "โทนสีดำสนิท ลดแสงสะท้อนและถนอมสายตาในที่มืด",
    previewBg: "bg-[#09090B] border-zinc-800",
    previewCard: "bg-zinc-900 border-white/10 shadow-sm",
    previewText: "text-zinc-100",
  },
  {
    id: "system",
    label: "ตามระบบ (System)",
    desc: "ปรับสลับสว่าง-มืดอัตโนมัติตามการตั้งค่าของตัวเครื่อง",
    previewBg: "bg-gradient-to-r from-[#F8F9FA] to-[#09090B] border-zinc-500/30",
    previewCard: "bg-surface border-border shadow-sm",
    previewText: "text-text",
  },
];

export default function ThemePage() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(getStoredTheme());

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg px-4 pt-6 pb-28 select-none">
      {/* Header */}
      <header className="flex items-center gap-3 mb-6">
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
          <h1 className="text-2xl font-extrabold tracking-tight text-text">ธีมและสีสัน</h1>
          <p className="text-xs text-text-muted">เลือกโหมดการแสดงผลที่ต้องการ</p>
        </div>
      </header>

      {/* Theme Cards Group */}
      <main className="space-y-3.5">
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
              className={`group relative flex w-full flex-col overflow-hidden rounded-3xl border p-4 text-left backdrop-blur-xl transition-all active:scale-[0.99] ${
                selected
                  ? "border-focus/60 bg-surface/90 shadow-md ring-2 ring-focus/20"
                  : "border-white/20 dark:border-white/10 bg-surface/70 hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`flex size-10 items-center justify-center rounded-2xl ${
                    selected ? "bg-focus text-white shadow-sm shadow-focus/30" : "bg-surface-2 text-text-muted"
                  } transition-all`}>
                    <ThemeIcon mode={opt.id} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text tracking-tight">{opt.label}</h3>
                    <p className="text-xs text-text-muted">{opt.desc}</p>
                  </div>
                </div>

                {/* Radio selection circle */}
                <div
                  aria-hidden="true"
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                    selected ? "border-focus bg-focus" : "border-border/80 bg-transparent"
                  }`}
                >
                  {selected && <div className="size-2 rounded-full bg-white" />}
                </div>
              </div>

              {/* Visual Mini Mockup Preview */}
              <div className={`h-14 w-full rounded-2xl border p-2 flex items-center justify-between gap-2 overflow-hidden ${opt.previewBg}`}>
                <div className={`h-8 w-24 rounded-xl border flex items-center px-2 gap-1.5 ${opt.previewCard}`}>
                  <div className="size-2 rounded-full bg-focus" />
                  <div className="h-1.5 w-10 rounded-full bg-current opacity-30" />
                </div>
                <div className="flex gap-1.5">
                  <div className={`h-7 w-12 rounded-xl border ${opt.previewCard}`} />
                  <div className={`h-7 w-7 rounded-xl border flex items-center justify-center text-[10px] ${opt.previewCard}`}>
                    ★
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </main>
    </div>
  );
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "dark") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  if (mode === "system") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
