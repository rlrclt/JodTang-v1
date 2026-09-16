/**
 * CategoryIcon — แสดงไอคอน 8 หมวดจาก CSS token
 *
 * กติกาจาก task:
 * - ใช้ CSS token (`--color-cat-*`) ไม่ hardcode สีใน component
 * - ไม่มี icon = แสดง ellipsis (อัปเดต ๖)
 * - icon อยู่ใน globals.css @theme ไม่ใช่ inline ใน component
 */

"use client";

// แมป category name → token key (ใช้ CSS var สำหรับสี)
const CATEGORY_ICON_MAP: Record<string, string> = {
  food: "food",
  อาหาร: "food",
  transport: "transport",
  ขนส่ง: "transport",
  shopping: "shopping",
  ชอปปิง: "shopping",
  entertainment: "entertainment",
  บันเทิง: "entertainment",
  health: "health",
  สุขภาพ: "health",
  education: "education",
  การศึกษา: "education",
  bills: "bills",
  ค่าบิล: "bills",
  other: "other",
  ["อื่น"]: "other",
};
const ICON_NAME_MAP: Record<string, string> = {
  utensils: "food",
  cart: "shopping",
  bus: "transport",
  home: "other",
  heart: "health",
  book: "education",
  game: "entertainment",
  gift: "other",
  briefcase: "other",
  more: "other",
};

// SVG path data สำหรับแต่ละ icon (ไม่ใช่สี — สีมาจาก CSS token)
const ICON_PATHS: Record<string, string> = {
  food: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm4 0h-2v-2h2v2zm-4-4h-2v-2h2v2zm4 0h-2v-2h2v2zm-4-4H9V7h2v2zm4 0h-2V7h2v2z",
  transport: "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z",
  shopping: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z",
  entertainment: "M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z",
  health: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  education: "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z",
  bills: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  other: "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
};

function getCategoryKey(name: string, icon: string | null): string {
  const iconName = icon?.split("#", 1)[0];
  return (iconName && ICON_NAME_MAP[iconName]) || CATEGORY_ICON_MAP[name] || "other";
}

export default function CategoryIcon({
  name,
  icon = null,
  size = 20,
}: {
  name: string | null;
  icon?: string | null;
  size?: number;
}) {
  if (!name) {
    // ไม่มีไอคอน — แสดง ellipsis (อัปเดต ๖)
    return (
      <span
        className="inline-flex items-center justify-center"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1" fill="var(--color-text-muted)" />
          <circle cx="19" cy="12" r="1" fill="var(--color-text-muted)" />
          <circle cx="5" cy="12" r="1" fill="var(--color-text-muted)" />
        </svg>
      </span>
    );
  }

  const key = getCategoryKey(name, icon);
  const colorVar = `var(--color-cat-${key})`;
  const pathData = ICON_PATHS[key] ?? ICON_PATHS.other;

  return (
    <span
      className="inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={name}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={colorVar}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={pathData} />
      </svg>
    </span>
  );
}