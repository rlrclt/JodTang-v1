/**
 * useSwipeMonth — ลากนิ้วซ้าย/ขวาเพื่อเปลี่ยนเดือน (แบบ native)
 *
 * วิธีใช้: กระจายค่าที่คืนให้ใส่ container ของเนื้อหาเดือนนั้น
 *   const { swipeRef, swipeHandlers, swipeStyle } = useSwipeMonth({
 *     onSwipeLeft: goNext, onSwipeRight: goPrev,
 *   });
 *   <div ref={swipeRef} {...swipeHandlers} style={swipeStyle}>…</div>
 *
 * พฤติกรรม:
 * - เนื้อหาหน่วงตามนิ้ว (peek) จนถึง maxPeek — ปล่อยผ่าน threshold ถึงเปลี่ยนเดือน
 * - ตั้งใจแยกท่า: เอียงแนวนอนชัด (|dx|>|dy|) ถึงยึด gesture — ปัดแนวตั้งเลื่อนหน้าได้ปกติ
 * - ลากแล้วปล่อยไม่ถึง threshold = ดีดกลับ + กลืน click ที่ตามมา (กันแตะโดน item ใต้จุดปล่อยนิ้ว)
 * - ใช้แค่ transform (compositor-only) ตามกติกา motion
 */

"use client";

import { useCallback, useEffect, useRef } from "react";

type SwipeMonthOptions = {
  /** นิ้วปัดซ้าย = ไปเดือนถัดไป */
  onSwipeLeft: () => void;
  /** นิ้วปัดขวา = กลับเดือนก่อน */
  onSwipeRight: () => void;
  /** ระยะ px ที่ต้องลากผ่านถึงเปลี่ยนเดือน (default 70) */
  threshold?: number;
  /** ระยะตามนิ้วสูงสุด (default 140) */
  maxPeek?: number;
};

type Gesture = {
  id: number;
  startX: number;
  startY: number;
  dx: number;
  dragging: boolean;
};

export function useSwipeMonth({
  onSwipeLeft,
  onSwipeRight,
  threshold = 70,
  maxPeek = 140,
}: SwipeMonthOptions) {
  const ref = useRef<HTMLDivElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const timerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  // เก็บ callback/config ล่าสุด — อ่านใน handler ผ่าน ref เพื่อให้ handler identity คงที่
  const latestRef = useRef({ onSwipeLeft, onSwipeRight, threshold, maxPeek });

  // sync ทุก render ต้องอยู่ใน effect (ห้ามแตะ ref ตอน render)
  useEffect(() => {
    latestRef.current = { onSwipeLeft, onSwipeRight, threshold, maxPeek };
  });

  // ล้าง timer ค้างตอน unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const resetTransform = useCallback((animated: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = animated ? "transform 180ms ease-out" : "none";
    el.style.transform = "translateX(0)";
  }, []);

  const finishGesture = useCallback(
    (commit: boolean) => {
      const g = gestureRef.current;
      gestureRef.current = null;
      const el = ref.current;
      if (!g || !el) return;

      if (!g.dragging) return; // แค่แตะ — ปล่อย browser จัดการ click ปกติ

      // ลากจริงแล้ว: กลืน click ที่จะตามมาเสมอ (กันแตะโดน item ใต้จุดปล่อยนิ้ว)
      suppressClickRef.current = true;

      const { threshold: th, onSwipeLeft: goLeft, onSwipeRight: goRight } =
        latestRef.current;
      if (commit && Math.abs(g.dx) >= th) {
        const dir = g.dx < 0 ? -1 : 1;
        // ดันออกต่ออีกนิดแล้วค่อยเปลี่ยนเดือน — หน้าปลายทางสไลด์เข้ามารับช่วงด้วย view transition
        el.style.transition = "transform 140ms ease-out";
        el.style.transform = `translateX(${dir * 180}px)`;
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          el.style.transition = "none";
          el.style.transform = "translateX(0)";
          if (dir < 0) goLeft();
          else goRight();
        }, 130);
      } else {
        resetTransform(true);
      }
    },
    [resetTransform]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      suppressClickRef.current = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (gestureRef.current) return; // นิ้วที่สอง — เมิน
      gestureRef.current = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        dx: 0,
        dragging: false,
      };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      const el = ref.current;
      if (!g || !el || e.pointerId !== g.id) return;

      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;

      if (!g.dragging) {
        // ยังไม่เอียงแนวนอนชัด = ปล่อยให้เลื่อนหน้าแนวตั้งไปก่อน
        if (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
        g.dragging = true;
        el.style.transition = "none";
      }

      g.dx = dx;
      const { maxPeek: peek } = latestRef.current;
      const clamped = Math.max(-peek, Math.min(peek, dx));
      el.style.transform = `translateX(${clamped}px)`;
    },
    []
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gestureRef.current;
      if (!g || e.pointerId !== g.id) return;
      finishGesture(true);
    },
    [finishGesture]
  );

  const onPointerCancel = useCallback(() => {
    // สายหลุด/โดนระบบยึด gesture (เช่น scroll แนวตั้งชนะ) = ดีดกลับ ไม่เปลี่ยนเดือน
    finishGesture(false);
  }, [finishGesture]);

  const onClickCapture = useCallback(
    (e: React.SyntheticEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    []
  );

  return {
    swipeRef: ref,
    swipeHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    },
    // touch-action: pan-y = แนวตั้งให้ browser เลื่อนเอง แนวนอนส่งมาให้เรา
    swipeStyle: { touchAction: "pan-y" } as const,
  };
}
