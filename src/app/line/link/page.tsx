"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import liff from "@line/liff";
import { createLineLinkToken } from "../actions";

/**
 * LIFF Link Page — เปิดในแอป LINE เท่านั้น
 * URL: https://liff.line.me/{LIFF_ID}
 *
 * flow: liff.init() → liff.login() (ถ้ายัง) → getProfile()
 * → สร้าง link-token → redirect ไป /line/claim?token=xxx ในเบราว์เซอร์
 */
export default function LiffLinkPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    async function initLiff() {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
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

        // LIFF รันบน origin เดียวกับแอป (Endpoint URL) → ใช้ relative path ได้
        setRedirecting(true);
        router.push(`/line/claim?token=${token}`);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err?.message ?? "LIFF init ล้มเหลว");
      }
    }

    initLiff();
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">JodTang</h1>
      <p className="text-lg text-text-muted mb-8">เชื่อมต่อบัญชี LINE</p>

      {status === "loading" && (
        <p className="text-sm text-text-muted">
          {redirecting ? "กำลังเปลี่ยนหน้า..." : "กำลังเชื่อมต่อ LINE..."}
        </p>
      )}

      {status === "error" && (
        <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700">
          ❌ {errorMsg}
        </p>
      )}
    </main>
  );
}
