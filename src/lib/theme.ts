/**
 * ธีมสว่าง/มืด — เก็บระดับเครื่อง (localStorage) ไม่ผูกบัญชี
 *
 * ใช้ class .dark ที่ <html> สลับชุดโทเคนใน globals.css
 * หน้า settings/theme เป็นคนเรียก setTheme() — layout มีสคริปต์ตั้งต้นกันจอกระพริบ
 */

"use client";

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "jodtang-theme";

function systemIsDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const v = window.localStorage.getItem(THEME_KEY);
  return v === "dark" || v === "system" ? v : "light";
}

// คำนวณ + แปะ class ทันที (เรียกตอน init และตอนเปลี่ยน)
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const dark = mode === "dark" || (mode === "system" && systemIsDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}
