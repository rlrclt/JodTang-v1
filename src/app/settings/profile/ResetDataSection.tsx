"use client";

import { useState } from "react";
import { resetUserData } from "@/app/actions/reset";
import { useRouter } from "next/navigation";

export default function ResetDataSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleReset = async () => {
    setIsResetting(true);
    setError(null);
    try {
      const res = await resetUserData();
      if (res && "error" in res && res.error) {
        setError(res.error);
        setIsResetting(false);
        setShowConfirm(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาด");
      setIsResetting(false);
      setShowConfirm(false);
    }
  };

  return (
    <section className="mt-4 rounded-card border border-expense/30 bg-surface p-5">
      <h3 className="mb-1 text-base font-semibold text-expense">ล้างข้อมูลทั้งหมด (Reset Data)</h3>
      <p className="mb-4 text-xs text-text-muted">
        ลบรายการธุรกรรม กระเป๋าเงิน งบประมาณ และหมวดหมู่ทั้งหมด เพื่อเริ่มต้นจดใหม่ตั้งแต่ต้น (ไม่สามารถกู้คืนได้)
      </p>

      {error && (
        <div className="mb-3 rounded-xl bg-expense/10 p-3 text-xs text-expense">
          {error}
        </div>
      )}

      {showConfirm ? (
        <div className="rounded-xl border border-expense/30 bg-expense/10 p-3.5 space-y-3 text-center">
          <p className="text-sm font-bold text-expense">
            ⚠️ ยืนยันล้างข้อมูลทั้งหมดจริง ๆ หรือไม่?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isResetting}
              onClick={() => setShowConfirm(false)}
              className="flex-1 rounded-xl border border-border bg-surface py-2 text-xs font-medium text-text"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isResetting}
              onClick={handleReset}
              className="flex-1 rounded-xl bg-expense py-2 text-xs font-semibold text-white shadow-sm hover:bg-expense/90"
            >
              {isResetting ? "กำลังล้างข้อมูล..." : "ยืนยันล้างข้อมูล"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-xl border border-expense/30 bg-expense/10 px-4 py-2.5 text-xs font-semibold text-expense hover:bg-expense/20 transition-colors"
        >
          ล้างข้อมูลและเริ่มต้นใหม่...
        </button>
      )}
    </section>
  );
}
