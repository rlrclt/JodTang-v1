"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { authenticateWithLine } from "../auth";

const DEFAULT_LIFF_ID = "2011649062-neOljV8x";

function LineMark() {
  return (
    <div className="flex size-20 items-center justify-center rounded-[28px] bg-[#06C755] shadow-lg shadow-[#06C755]/30">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="#fff">
        <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.01 3.44 7.36 8.11 8.48.32.07.75.21.86.48.1.24.06.61.03.85l-.14.83c-.04.26-.21 1.01.88.55.5-.21 7.73-4.54 10.59-7.78C22.27 10.36 22 7.58 22 7c0-2.76-2.24-5-5-5H12zM8.5 13c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10s1.5.67 1.5 1.5S9.33 13 8.5 13zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
      </svg>
    </div>
  );
}

function Spinner() {
  return (
    <div
      aria-hidden="true"
      className="size-10 animate-spin rounded-full border-4 border-[#06C755]/20 border-t-[#06C755]"
    />
  );
}

export default function LiffAuthPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function initAuth() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID || DEFAULT_LIFF_ID;
      try {
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        const result = await authenticateWithLine(profile.userId, profile.displayName);

        if (result.error) {
          setStatus("error");
          setErrorMsg(result.error);
          return;
        }

        if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
        }
      } catch (err: any) {
        console.error("LIFF Auth error:", err);
        setStatus("error");
        setErrorMsg(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ LINE");
      }
    }

    initAuth();
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-[#06C755]/10 via-bg to-bg p-6 text-center select-none">
      <LineMark />

      <div className="mt-6 space-y-2">
        <h1 className="text-xl font-bold text-text">เข้าสู่ระบบด้วย LINE</h1>
        {status === "loading" && (
          <p className="text-xs text-text-muted">กำลังตรวจสอบบัญชีและเข้าสู่ระบบ...</p>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        {status === "loading" && <Spinner />}
      </div>

      {status === "error" && (
        <div className="mt-6 max-w-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-medium text-amber-600 dark:text-amber-400 leading-relaxed">
          <p className="font-bold mb-1">⚠️ ไม่สามารถเข้าสู่ระบบได้</p>
          <p>{errorMsg}</p>
          <a
            href="/login"
            className="mt-4 inline-block rounded-xl bg-surface px-4 py-2 text-xs font-bold text-text shadow-sm border border-border/60 hover:bg-surface-2 transition-all active:scale-95"
          >
            กลับหน้าเข้าสู่ระบบ
          </a>
        </div>
      )}
    </main>
  );
}
