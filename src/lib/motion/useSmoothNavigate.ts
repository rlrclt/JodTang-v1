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
export function useSmoothNavigate() {
  const router = useRouter();

  const navigate = useCallback(
    (href: string, options?: { modifierKey?: boolean }) => {
      if (options?.modifierKey) {
        // ปล่อยให้ browser จัดการ Cmd/Ctrl+click (เปิด tab ใหม่) ตามปกติ
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      if (typeof document !== "undefined" && document.startViewTransition) {
        document.startViewTransition(async () => {
          await router.push(href);
        });
      } else {
        router.push(href);
      }
    },
    [router],
  );

  return navigate;
}
