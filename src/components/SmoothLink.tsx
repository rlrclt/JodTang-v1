"use client";

import Link from "next/link";
import { useSmoothNavigate } from "@/lib/motion/useSmoothNavigate";

/**
 * Drop-in replacement for <Link> with View Transition support.
 *
 * - Clicking triggers a smooth cross-fade via `useSmoothNavigate()`
 * - Cmd/Ctrl+click opens a new tab (no transition, browser default)
 * - All other Link props are forwarded unchanged
 */
export function SmoothLink({
  href,
  children,
  className,
  onClick,
  ...rest
}: React.ComponentProps<typeof Link>) {
  const navigate = useSmoothNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const modifierKey = e.metaKey || e.ctrlKey;

    // ป้องกัน Link internal handler ทำ navigation ก่อน — จัดการเองทั้งหมด
    e.preventDefault();

    if (modifierKey) {
      // ปล่อยให้ browser จัดการ Cmd/Ctrl+click (เปิด tab ใหม่) ตามปกติ
      const url = typeof href === "string" ? href : (href.pathname ?? "/");
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    // แปลง href เป็น string สำหรับ navigate
    const path = typeof href === "string" ? href : (href.pathname ?? "/");
    navigate(path);

    // เรียก onClick ของผู้ใช้ถ้ามี
    onClick?.(e);
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      prefetch={rest.prefetch}
      {...rest}
    >
      {children}
    </Link>
  );
}
