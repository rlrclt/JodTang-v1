import type { ReactNode } from "react";

/**
 * ชุดไอคอน SVG inline สำหรับหมวดหมู่ — วาดเองตามกติกา "ห้ามเพิ่มไลบรารีไอคอน"
 * แต่ละชื่อแมปกับ path SVG ของ Lucide (ISC license) — เรียบง่าย อ่านออกใน 16px
 * ทุกไอคอนแสดงผลผ่าน <CategoryIcon> จึงมี aria-label ภาษาไทยเสมอ
 */

export const CATEGORY_ICONS = [
  "utensils",
  "cart",
  "bus",
  "home",
  "heart",
  "book",
  "game",
  "gift",
  "briefcase",
  "more",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

const ICON_LABELS: Record<CategoryIconName, string> = {
  utensils: "อาหาร",
  cart: "ช้อปปิ้ง",
  bus: "เดินทาง",
  home: "ที่อยู่อาศัย",
  heart: "สุขภาพ",
  book: "การศึกษา",
  game: "ความบันเทิง",
  gift: "ของขวัญ",
  briefcase: "งาน",
  more: "อื่น ๆ",
};

// แต่ละชื่อ = path SVG (stroke) + จุด/กรอบที่จำเป็น — เก็บเป็นข้อมูล ไม่ใช่ JSX ต่อเคส
const ICON_PATHS: Record<CategoryIconName, ReactNode> = {
  utensils: (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  cart: (
    <>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </>
  ),
  bus: (
    <>
      <path d="M8 6v6" />
      <path d="M15 6v6" />
      <path d="M2 12h19.6" />
      <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3" />
      <circle cx="7" cy="18" r="2" />
      <path d="M9 18h5" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  heart: (
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  ),
  book: (
    <>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </>
  ),
  game: (
    <>
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </>
  ),
  briefcase: (
    <>
      <rect width="20" height="14" x="2" y="7" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
};

export function isCategoryIconName(value: string): value is CategoryIconName {
  return (CATEGORY_ICONS as readonly string[]).includes(value);
}

export function categoryIconLabel(name: string): string {
  return ICON_LABELS[name as CategoryIconName] ?? "ไอคอน";
}

/**
 * ไอคอนหมวดหมู่ — <svg aria-label ภาษาไทย> เสมอ (กติกาการ์ด)
 */
export default function CategoryIcon({
  icon,
  className,
}: {
  icon: string | null;
  className?: string;
}) {
  const name = icon && isCategoryIconName(icon) ? icon : "more";
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={categoryIconLabel(name)}
      className={className}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
