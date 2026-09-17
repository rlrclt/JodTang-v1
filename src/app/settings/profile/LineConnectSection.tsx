"use client";

import { useState } from "react";
import { unlinkLineAccount } from "@/app/actions/line";
import { useRouter } from "next/navigation";

type Props = {
  email: string;
  name: string;
  lineUserId: string | null;
};

export default function LineConnectSection({ email, name, lineUserId }: Props) {
  const [unlinking, setUnlinking] = useState(false);
  const router = useRouter();

  const isConnected = Boolean(lineUserId);

  // LIFF URL (public ID — ไม่ใช่ secret) ถ้ายังไม่ตั้งให้ชวนแอดมินตั้งค่า
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : null;

  const handleUnlink = async () => {
    if (!confirm("ต้องการยกเลิกการเชื่อมต่อกับ LINE Bot ใช่หรือไม่?")) return;
    setUnlinking(true);
    try {
      await unlinkLineAccount();
      router.refresh();
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <section className="mt-4 rounded-3xl border border-emerald-500/20 bg-surface/95 p-5 shadow-sm backdrop-blur-xl transition-all select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-[#06C755]/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#06C755">
              <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.01 3.44 7.36 8.11 8.48.32.07.75.21.86.48.1.24.06.61.03.85l-.14.83c-.04.26-.21 1.01.88.55.5-.21 7.73-4.54 10.59-7.78C22.27 10.36 22 7.58 22 7c0-2.76-2.24-5-5-5H12zM8.5 13c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10s1.5.67 1.5 1.5S9.33 13 8.5 13zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">LINE Bot</h3>
            <p className="text-[10px] text-text-muted mt-0.5">ส่งสลิปทาง LINE · AI ลงบัญชีอัตโนมัติ</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            isConnected
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-amber-500/10 text-amber-600"
          }`}
        >
          <div className={`size-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
          {isConnected ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"}
        </div>
      </div>

      {isConnected ? (
        /* State 1: เชื่อมต่อสำเร็จแล้ว */
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🟢</span>
            <div>
              <p className="text-sm font-bold text-text">พร้อมรับสลิป</p>
              <p className="text-xs text-text-muted mt-0.5">
                ส่งรูปสลิปโอนเงินเข้าแชท LINE Bot ได้ทันที
              </p>
            </div>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            คุณสามารถเปิดแอป LINE และส่งรูปสลิปโอนเงิน หรือใบเสร็จเข้ามาในแชทบอทได้ทันที AI จะวิเคราะห์และลงบัญชีให้คุณอัตโนมัติ
          </p>

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              disabled={unlinking}
              onClick={handleUnlink}
              className="text-xs font-semibold text-text-muted hover:text-expense active:scale-95 transition-all"
            >
              {unlinking ? "กำลังยกเลิก..." : "ยกเลิกการเชื่อมต่อ"}
            </button>
          </div>
        </div>
      ) : (
        /* State 2: ยังไม่ได้เชื่อมต่อ — กดปุ่มเดียว */
        <div className="rounded-2xl border border-border/40 bg-surface-2/70 p-4 space-y-3">
          <div>
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              เชื่อมต่อง่าย ๆ ใน 1 คลิก
            </span>
            <p className="text-xs text-text leading-relaxed mt-1">
              กดปุ่มด้านล่างเพื่อล็อกอินด้วยบัญชี LINE ระบบจะเชื่อมต่อให้อัตโนมัติ
            </p>
          </div>

          {/* ปุ่มเชื่อมต่อ LINE — เปิด LIFF ในแอป LINE (ไม่ใช้ OAuth) */}
          <div className="pt-1">
            {liffUrl ? (
              <a
                href={liffUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#06C755] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#06C755]/25 hover:bg-[#05b34c] active:scale-[0.99] transition-all text-center"
              >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.01 3.44 7.36 8.11 8.48.32.07.75.21.86.48.1.24.06.61.03.85l-.14.83c-.04.26-.21 1.01.88.55.5-.21 7.73-4.54 10.59-7.78C22.27 10.36 22 7.58 22 7c0-2.76-2.24-5-5-5H12zM8.5 13c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10s1.5.67 1.5 1.5S9.33 13 8.5 13zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
              <span>เชื่อมต่อบัญชี LINE</span>
              </a>
            ) : (
              <p role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-700">
                ⚠️ ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID บนเซิร์ฟเวอร์ ติดต่อแอดมินครับ
              </p>
            )}
          </div>

          <p className="text-[10px] text-text-muted leading-normal">
            💡 กดปุ่ม → เปิดในแอป LINE → กลับมาหน้าเว็บกดยืนยัน 1 คลิก บอทจะส่งข้อความยืนยันในแชททันทีครับ
          </p>
        </div>
      )}
    </section>
  );
}
