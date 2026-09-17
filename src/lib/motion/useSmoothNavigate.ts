"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Smooth navigation hook using View Transitions API.
 *
 * Wraps `router.push()` inside `document.startViewTransition()` when available,
 * falling back to plain navigation for browsers without support (Firefox).
 *
 * Modifier keys (Cmd/Ctrl+click) are passed through to browser defaults
 * (new tab) — no transition override.
 */
/**
 * ทิศทางการเปลี่ยนหน้า — CSS ใน globals.css อ่านค่านี้จาก html[data-view-direction]
 * - forward: ดันหน้าใหม่จากขวา (แบบ iOS push)
 * - back: ดันหน้าก่อนจากซ้าย (แบบ iOS pop)
 * - fade: จางนุ่ม (ค่าเริ่มต้น — ใช้กับแถบแท็บที่ไม่มีลำดับชั้น)
 */
export type NavDirection = "forward" | "back" | "fade";

export function useSmoothNavigate() {
  const router = useRouter();

  const navigate = useCallback(
    (href: string, options?: { modifierKey?: boolean; direction?: NavDirection }) => {
      if (options?.modifierKey) {
        // ปล่อยให้ browser จัดการ Cmd/Ctrl+click (เปิด tab ใหม่) ตามปกติ
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      // แตะลิงก์เดิมซ้ำ = ไม่ต้องทำอะไร (กัน transition ว่างที่ทำให้จอดูพรึบ)
      if (
        typeof window !== "undefined" &&
        window.location.pathname === href
      ) {
        return;
      }

      const direction = options?.direction ?? "fade";

      if (typeof document !== "undefined" && document.startViewTransition) {
        // บอก CSS ว่าท่าไหนก่อนเริ่ม transition — อ่านคืนหลังจบเพื่อไม่ให้ค้างข้ามหน้า
        document.documentElement.dataset.viewDirection = direction;
        const cleanup = () => {
          delete document.documentElement.dataset.viewDirection;
        };
        // callback ต้อง sync เท่านั้น — router.push คืน void ไม่ใช่ promise ที่รอข้อมูลได้
        // ถ้าใส่ async/await ตรงนี้ transition จะจบก่อนหน้าปลายทาง render เสร็จ = ภาพตัดแบบพรึบ
        const transition = document.startViewTransition(() => {
          router.push(href);
        });
        // finished reject ได้เมื่อ transition ถูกยกเลิก (เช่น กดถี่) — ล้างค่าในทุกกรณี
        transition.finished.then(cleanup, cleanup);
      } else {
        router.push(href);
      }
    },
    [router],
  );

  return navigate;
}
