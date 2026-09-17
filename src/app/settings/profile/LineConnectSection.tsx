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
  const lineOAuthUrl = `/auth/signin?provider=line`;

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
                <span>👤 คุณ{name}</span>
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
        /* State 2: ยังไม่ได้เชื่อมต่อ */
        <div className="rounded-2xl border border-border/40 bg-surface-2/70 p-4 space-y-3">
          <div>
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              เชื่อมต่อง่าย ๆ ใน 1 คลิก
            </span>
            <p className="text-xs text-text leading-relaxed mt-1">
              กดปุ่มด้านล่างเพื่อเปิดแอป LINE และส่งคำสั่งเชื่อมต่อบัญชีเข้าแชทบอทได้ทันทีครับ:
            </p>
          </div>

          {/* ปุ่มกดเชื่อมต่อเข้าหน้า LINE Login OAuth โดยตรง */}
          <div className="pt-1">
            <a
              href={lineOAuthUrl}
              className="flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#06C755] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#06C755]/25 hover:bg-[#05b34c] active:scale-[0.99] transition-all text-center"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.01 3.44 7.36 8.11 8.48.32.07.75.21.86.48.1.24.06.61.03.85l-.14.83c-.04.26-.21 1.01.88.55.5-.21 7.73-4.54 10.59-7.78C22.27 10.36 22 7.58 22 7c0-2.76-2.24-5-5-5H12zM8.5 13c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10s1.5.67 1.5 1.5S9.33 13 8.5 13zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
              <span>กดเพื่อเชื่อมต่อด้วยบัญชี LINE (LINE Login)</span>
            </a>
          </div>

          {/* หรือคัดลอกคำสั่งด้วยตนเอง */}
          <div className="pt-2 border-t border-border/30">
            <span className="text-[10px] text-text-muted">หรือคัดลอกคำสั่งไปส่งในแชทด้วยตนเอง:</span>
            <div
              onClick={handleCopy}
              className="group mt-1 flex items-center justify-between rounded-xl border border-border/60 bg-bg p-3 cursor-pointer transition-all hover:border-focus active:scale-[0.99]"
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
          </div>

          <p className="text-[10px] text-text-muted leading-normal">
            💡 เมื่อเชื่อมต่อแล้ว บอทจะแจ้งยืนยันชื่อบัญชีของคุณ และหน้าเว็บจะแสดงสถานะเชื่อมต่อสำเร็จทันทีครับ
          </p>
        </div>
      )}
    </section>
  );
}
