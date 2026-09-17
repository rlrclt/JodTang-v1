/**
 * useTransactionsLive — เติมข้อมูลให้สดเมื่อผู้ใช้กลับมา (focus/visible/online)
 *
 * ขอบเขต v1 ตาม PLAN §6: refetch on focus + revalidate หลัง mutation
 * (mutation จัดการด้วย router.refresh() ที่จุดบันทึกแล้ว — hook นี้ดูแลแค่ "กลับมา")
 * ยังไม่ใช่ WebSocket realtime — ข้อมูลแยกต่อบัญชี ไม่มีอะไรให้ broadcast ใน v1
 *
 * กติกา:
 * - ยิง revalidate ต่อเมื่อข้อมูลเก่าเกิน staleMs (กันยิงถี่ตอนสลับแอปไปมา)
 * - นับ "สด" จาก markFresh() ที่ consumer เรียกหลัง fetch สำเร็จทุกครั้ง
 */

"use client";

import { useCallback, useEffect, useRef } from "react";

export function useTransactionsLive(
  revalidate: () => void,
  staleMs = 60_000
): () => void {
  // last = 0 หมายถึง "ยังไม่เคยนับ" — ตั้งเวลาจริงใน effect ด้านล่าง (ห้าม Date.now ตอน render)
  const stateRef = useRef<{ last: number; revalidate: () => void }>({
    last: 0,
    revalidate: () => {},
  });

  // บอกว่าข้อมูลสดแล้ว (เรียกหลัง fetch สำเร็จ — รวมครั้งแรกตอน mount)
  const markFresh = useCallback(() => {
    stateRef.current.last = Date.now();
  }, []);

  useEffect(() => {
    // ผูก revalidate ตัวล่าสุด + ตั้งเวลาตั้งต้น — ทำใน effect ทั้งหมด ห้ามแตะ ref ตอน render
    const s = stateRef.current;
    s.revalidate = revalidate;
    if (s.last === 0) s.last = Date.now();

    const maybeRevalidate = () => {
      if (Date.now() - s.last >= staleMs) {
        // ตั้งเวลาก่อนยิง — กัน event ซ้อน (focus+visible มาพร้อมกัน) ยิงเบิ้ล
        s.last = Date.now();
        s.revalidate();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") maybeRevalidate();
    };

    window.addEventListener("focus", maybeRevalidate);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", maybeRevalidate);
    return () => {
      window.removeEventListener("focus", maybeRevalidate);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", maybeRevalidate);
    };
  }, [revalidate, staleMs]);

  return markFresh;
}
