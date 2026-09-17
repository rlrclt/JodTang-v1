"use client";

import { useState } from "react";
import { unlinkLineAccount } from "@/app/actions/line";
import { useRouter } from "next/navigation";

type Props = {
  email: string;
  name: string;
  lineUserId: string | null;
};

const DEFAULT_LIFF_ID = "2011649062-neOljV8x";
const BOT_BASIC_ID = "@650dszjd";
const BOT_QR_CODE_URL = "https://qr-official.line.me/sid/L/650dszjd.png";
const BOT_ADD_FRIEND_URL = "https://line.me/R/ti/p/@650dszjd";

export default function LineConnectSection({ email, name, lineUserId }: Props) {
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const router = useRouter();

  const isConnected = Boolean(lineUserId);

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || DEFAULT_LIFF_ID;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : null;

  const handleUnlink = async () => {
    if (!confirm("ต้องการยกเลิกการเชื่อมต่อกับ LINE Bot ใช่หรือไม่?")) return;
    setUnlinking(true);
    setUnlinkError(null);
    try {
      const res = await unlinkLineAccount();
      if (res.error) {
        setUnlinkError(res.error);
        return;
      }
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
            <h3 className="text-sm font-bold text-text">LINE Bot ({BOT_BASIC_ID})</h3>
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

          {/* ปุ่มเปิดแชท LINE Bot */}
          <div className="pt-1 flex flex-wrap gap-2">
            <a
              href={`https://line.me/R/oaMessage/${BOT_BASIC_ID}/`}
              className="flex-1 flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#05b34c] active:scale-95 transition-all"
            >
              <span>💬</span>
              <span>เปิดแชทกับบอท</span>
            </a>
            <button
              type="button"
              onClick={() => setShowQR(!showQR)}
              className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-surface px-3 py-2 text-xs font-bold text-text hover:bg-surface-2 active:scale-95 transition-all"
            >
              <span>📷</span>
              <span>{showQR ? "ซ่อน QR" : "ดู QR Code"}</span>
            </button>
          </div>

          {showQR && (
            <div className="mt-2 flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-border/40 text-center animate-in fade-in zoom-in-95 duration-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BOT_QR_CODE_URL}
                alt="LINE Bot QR Code"
                className="size-36 object-contain rounded-lg"
              />
              <p className="mt-2 text-[11px] font-bold text-zinc-700">สแกนเพื่อเพิ่มเพื่อน {BOT_BASIC_ID}</p>
            </div>
          )}

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
          {unlinkError && (
            <p role="alert" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-bold text-amber-700">
              ⚠️ {unlinkError}
            </p>
          )}
        </div>
      ) : (
        /* State 2: ยังไม่ได้เชื่อมต่อ */
        <div className="rounded-2xl border border-border/40 bg-surface-2/70 p-4 space-y-3.5">
          <div>
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              เชื่อมต่อบอทใน 2 ขั้นตอน
            </span>
            <p className="text-xs text-text leading-relaxed mt-1">
              เพิ่มเพื่อนบอทและเชื่อมต่อบัญชีเพื่อส่งสลิปผ่านแชท LINE
            </p>
          </div>

          {/* ขั้นตอนที่ 1: เพิ่มเพื่อนบอท (LINE Bot Friend) */}
          <div className="rounded-2xl border border-[#06C755]/30 bg-[#06C755]/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#06C755] text-white text-[11px] font-bold">
                  1
                </span>
                <span className="text-xs font-bold text-text">เพิ่มเพื่อนกับ LINE Bot ก่อน</span>
              </div>
              <span className="text-[10px] font-bold text-[#06C755] bg-[#06C755]/10 px-2 py-0.5 rounded-full">
                {BOT_BASIC_ID}
              </span>
            </div>

            <div className="flex gap-2">
              <a
                href={BOT_ADD_FRIEND_URL}
                className="flex-1 flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#06C755] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#05b34c] active:scale-95 transition-all text-center"
              >
                <span>➕</span>
                <span>กดเพิ่มเพื่อนในแอป LINE</span>
              </a>
              <button
                type="button"
                onClick={() => setShowQR(!showQR)}
                className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-surface px-3 py-2 text-xs font-bold text-text hover:bg-surface-2 active:scale-95 transition-all"
              >
                <span>📷</span>
                <span>{showQR ? "ซ่อน QR" : "QR Code"}</span>
              </button>
            </div>

            {/* ส่วนแสดง QR Code สำหรับสแกนบนคอม/iPad */}
            {showQR && (
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-border/40 text-center animate-in fade-in zoom-in-95 duration-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={BOT_QR_CODE_URL}
                  alt="LINE Bot QR Code"
                  className="size-36 object-contain rounded-lg shadow-inner"
                />
                <p className="mt-2 text-[11px] font-bold text-zinc-800">
                  สแกนด้วยกล้อง LINE เพื่อเพิ่มเพื่อน
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">ID: {BOT_BASIC_ID}</p>
              </div>
            )}
          </div>

          {/* ขั้นตอนที่ 2: กดเชื่อมต่อบัญชี */}
          <div className="rounded-2xl border border-border/50 bg-surface p-3.5 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-focus text-white text-[11px] font-bold">
                2
              </span>
              <span className="text-xs font-bold text-text">เชื่อมต่อบัญชี JodTang</span>
            </div>

            {liffUrl ? (
              <a
                href={liffUrl}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-focus px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all text-center"
              >
                <span>🔗</span>
                <span>กดเชื่อมต่อบัญชีด้วย LINE</span>
              </a>
            ) : (
              <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-bold text-amber-700">
                ⚠️ ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID ติดต่อแอดมินครับ
              </p>
            )}
          </div>

          <p className="text-[10px] text-text-muted leading-relaxed px-1">
            💡 <strong>สำคัญ:</strong> ต้องเป็นเพื่อนกับบอทก่อน เพื่อให้บอทสามารถส่งข้อความตอบกลับและแจ้งเตือนสลิปได้ครับ
          </p>
        </div>
      )}
    </section>
  );
}
