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
  const [copied, setCopied] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const router = useRouter();

  const isConnected = Boolean(lineUserId);
  const linkCommand = `LINK:${email}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(linkCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

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
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#06C755] text-white font-black text-2xl shadow-sm shadow-[#06C755]/20">
            L
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">LINE Bot บันทึกสลิปอัตโนมัติ</h3>
            <p className="text-[11px] text-text-muted">ส่งรูปสลิปหรือใบเสร็จในแชทเพื่อบันทึกด่วน</p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isConnected
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span>{isConnected ? "เชื่อมต่อสำเร็จ" : "รอเชื่อมต่อ"}</span>
        </span>
      </div>

      {isConnected ? (
        /* State 1: เชื่อมต่อสำเร็จแล้ว */
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                บัญชีผู้ใช้งานที่เชื่อมต่อ
              </span>
              <h4 className="text-sm font-extrabold text-text flex items-center gap-1.5 mt-0.5">
                <span>👤 {name}</span>
                <span className="text-xs font-normal text-text-muted">({email})</span>
              </h4>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              🟢 พร้อมรับสลิป
            </span>
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
        /* State 2: ยังไม่ได้เชื่อมต่อ (แสดงวิธีเชื่อมต่อ + คำสั่ง) */
        <div className="rounded-2xl border border-border/40 bg-surface-2/70 p-4 space-y-3">
          <div>
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              ขั้นตอนการเชื่อมต่อ
            </span>
            <p className="text-xs text-text leading-relaxed mt-1">
              1. เพิ่มเพื่อนกับ <b>LINE Official Account</b> ของคุณ<br />
              2. คัดลอกข้อความด้านล่างนี้ แล้วส่งเข้าไปในห้องแชทของ LINE Bot:
            </p>
          </div>

          {/* Code Copy Box */}
          <div
            onClick={handleCopy}
            className="group flex items-center justify-between rounded-xl border border-border/60 bg-bg p-3 cursor-pointer transition-all hover:border-focus active:scale-[0.99]"
            title="คลิกเพื่อคัดลอกคำสั่ง"
          >
            <div className="font-mono text-xs font-bold text-focus">
              <span>{linkCommand}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-focus">
              {copied ? (
                <>
                  <span>✓</span>
                  <span>คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span className="group-hover:underline">กดคัดลอก</span>
                </>
              )}
            </div>
          </div>

          <p className="text-[10px] text-text-muted leading-normal">
            💡 เมื่อส่งคำสั่งแล้ว บอทจะตอบกลับยืนยันชื่อบัญชีของคุณ และหน้าต่างนี้จะเปลี่ยนสถานะเป็นเชื่อมต่อสำเร็จทันทีครับ
          </p>
        </div>
      )}
    </section>
  );
}
