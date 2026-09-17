"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { createLineLinkToken } from "../actions";

/**
 * LIFF Link Page — เปิดในแอป LINE เท่านั้น
 * URL: https://liff.line.me/{LIFF_ID}
 *
 * LIFF ID เป็นค่า public (อยู่ใน URL) — ใช้ env ถ้ามี ไม่งั้นใช้ค่าดีฟอลต์ของโปรเจกต์
 * flow: liff.init() → liff.login() (ถ้ายัง) → getProfile()
 * → สร้าง link-token → redirect ไป /line/claim?token=xxx ในเบราว์เซอร์
 *
 * หน้านี้อยู่นอก AppShell (EXCLUDED_ROUTES) — ไม่มีแถบแท็บ/FAB/AI ทับ
 */
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

export default function LiffLinkPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    async function initLiff() {
      const liffId =
        process.env.NEXT_PUBLIC_LIFF_ID || DEFAULT_LIFF_ID;
      if (!liffId) {
        setStatus("error");
        setErrorMsg("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID ติดต่อแอดมินครับ");
        return;
      }

      try {
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return; // รอ redirect กลับหลัง login
        }

        const profile = await liff.getProfile();
        const { token, error } = await createLineLinkToken(
          profile.userId,
          profile.displayName
        );

        if (error || !token) {
          setStatus("error");
          setErrorMsg(error ?? "สร้าง token ไม่สำเร็จ");
          return;
        }

        // ต้องใช้ absolute URL + full navigation เพื่อหลุดออกจาก LIFF webview
        // กลับไปเบราว์เซอร์ปกติ (router.push แบบ relative จะค้างอยู่ใน liff.line.me)
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://jodtangv1.vercel.app";
        setRedirecting(true);
        window.location.href = `${appUrl}/line/claim?token=${token}`;
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err?.message ?? "LIFF init ล้มเหลว");
      }
    }

    initLiff();
  }, []);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-[#06C755]/10 via-[#F7F8FA] to-[#F7F8FA] p-6">
      <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-8 text-center shadow-xl shadow-black/5">
        <div className="mb-5 flex justify-center">
          <LineMark />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-[#101828]">
          JodTang
        </h1>
        <p className="mt-1 text-sm font-medium text-[#616B7A]">
          เชื่อมต่อบัญชี LINE
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          {status === "loading" && (
            <>
              <Spinner />
              <p className="text-sm text-[#616B7A]">
                {redirecting
                  ? "เชื่อมสำเร็จ กำลังพากลับไปยืนยัน..."
                  : "กำลังเชื่อมต่อ LINE..."}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#98A2B3]">
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-[#06C755]" />
                อย่าปิดหน้านี้จนกว่าจะเปลี่ยนหน้า
              </div>
            </>
          )}

          {status === "error" && (
            <div
              role="alert"
              className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-4"
            >
              <p className="text-sm font-bold text-red-700">
                เกิดข้อผิดพลาด
              </p>
              <p className="mt-1 text-xs leading-relaxed text-red-700/80">
                {errorMsg}
              </p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-[#98A2B3]">
        ส่งรูปสลิปในแชทบอท แล้ว AI จะลงบัญชีให้อัตโนมัติ
      </p>
    </main>
  );
}
