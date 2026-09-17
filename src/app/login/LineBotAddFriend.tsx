"use client";

import { useState } from "react";

const BOT_BASIC_ID = "@650dszjd";
const BOT_QR_CODE_URL = "https://qr-official.line.me/sid/L/650dszjd.png";
const BOT_ADD_FRIEND_URL = "https://line.me/R/ti/p/@650dszjd";

export default function LineBotAddFriend() {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="rounded-2xl border border-[#06C755]/25 bg-[#06C755]/5 p-3.5 text-center space-y-2.5 transition-all">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2 text-left">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#06C755] text-white">
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.01 3.44 7.36 8.11 8.48.32.07.75.21.86.48.1.24.06.61.03.85l-.14.83c-.04.26-.21 1.01.88.55.5-.21 7.73-4.54 10.59-7.78C22.27 10.36 22 7.58 22 7c0-2.76-2.24-5-5-5H12zM8.5 13c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10s1.5.67 1.5 1.5S9.33 13 8.5 13zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-text">LINE Bot ({BOT_BASIC_ID})</p>
            <p className="text-[10px] text-text-muted">ส่งสลิปผ่านแชท บันทึกให้อัตโนมัติ</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowQR(!showQR)}
          className="rounded-lg border border-border/60 bg-surface px-2 py-1 text-[11px] font-semibold text-text hover:bg-surface-2 active:scale-95 transition-all"
        >
          {showQR ? "ซ่อน QR" : "QR Code"}
        </button>
      </div>

      {/* ปุ่มกดเพิ่มเพื่อนสำหรับมือถือ */}
      <a
        href={BOT_ADD_FRIEND_URL}
        className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#05b34c] active:scale-[0.99] transition-all"
      >
        <span>➕</span>
        <span>เพิ่มเพื่อนกับบอทใน LINE</span>
      </a>

      {/* กล่องแสดง QR Code สำหรับคนเปิดบน PC */}
      {showQR && (
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-border/40 text-center animate-in fade-in zoom-in-95 duration-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BOT_QR_CODE_URL}
            alt="LINE Bot QR Code"
            className="size-32 object-contain rounded-md"
          />
          <p className="mt-1.5 text-[10px] font-bold text-zinc-700">
            สแกนเพื่อเพิ่มเพื่อน {BOT_BASIC_ID}
          </p>
        </div>
      )}
    </div>
  );
}
