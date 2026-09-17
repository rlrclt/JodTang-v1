"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { claimLineLinkToken } from "../actions";

/**
 * Claim Page — หน้าเว็บบนเบราว์เซอร์ปกติ หลัง LIFF redirect กลับมา
 * URL: /line/claim?token=xxx
 *
 * - ยังไม่ล็อกอินเว็บ → ปุ่มไป /auth/signin พร้อม next กลับมาหน้านี้
 * - ล็อกอินแล้ว → auto-claim token → ผูก line_user_id
 * - สำเร็จ → แสดงผล + พากลับ /settings/profile อัตโนมัติ
 *
 * หน้านี้อยู่นอก AppShell (EXCLUDED_ROUTES) — ไม่มีแถบแท็บ/FAB/AI ทับ
 */
function ClaimContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    status: "idle" | "success" | "error" | "need-login";
    message: string;
    displayName?: string;
  }>(() =>
    token
      ? { status: "idle", message: "" }
      : {
          status: "error",
          message: "ไม่พบ token ใน URL — กรุณาเริ่มเชื่อมต่อใหม่ผ่าน LINE ครับ",
        }
  );

  useEffect(() => {
    if (!token) return;

    startTransition(async () => {
      const res = await claimLineLinkToken(token);

      if (res.error === "กรุณาเข้าสู่ระบบก่อน") {
        setResult({
          status: "need-login",
          message: "กรุณาเข้าสู่ระบบเพื่อเชื่อมต่อบัญชี LINE",
        });
        return;
      }

      if (res.error) {
        setResult({ status: "error", message: res.error });
        return;
      }

      setResult({
        status: "success",
        message:
          "เชื่อมต่อบัญชี LINE สำเร็จ! กำลังพากลับไปหน้าบัญชี...",
        displayName: res.lineDisplayName,
      });
    });
  }, [token]);

  // สำเร็จแล้ว → พากลับหน้าโปรไฟล์อัตโนมัติ
  useEffect(() => {
    if (result.status !== "success") return;
    const t = setTimeout(() => {
      router.push("/settings/profile");
    }, 2500);
    return () => clearTimeout(t);
  }, [result.status, router]);

  const signinHref = `/auth/signin?provider=google&next=${encodeURIComponent(
    `/line/claim?token=${token}`
  )}`;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-[#06C755]/10 via-[#F7F8FA] to-[#F7F8FA] p-6">
      <div className="w-full max-w-sm rounded-3xl border border-black/5 bg-white p-8 text-center shadow-xl shadow-black/5">
        <div className="mb-5 flex justify-center">
          <div className="flex size-20 items-center justify-center rounded-[28px] bg-[#06C755] shadow-lg shadow-[#06C755]/30">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.01 3.44 7.36 8.11 8.48.32.07.75.21.86.48.1.24.06.61.03.85l-.14.83c-.04.26-.21 1.01.88.55.5-.21 7.73-4.54 10.59-7.78C22.27 10.36 22 7.58 22 7c0-2.76-2.24-5-5-5H12zM8.5 13c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10s1.5.67 1.5 1.5S9.33 13 8.5 13zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-[#101828]">
          JodTang
        </h1>
        <p className="mt-1 text-sm font-medium text-[#616B7A]">
          เชื่อมต่อบัญชี LINE
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          {result.status === "idle" || pending ? (
            <>
              <div
                aria-hidden="true"
                className="size-10 animate-spin rounded-full border-4 border-[#06C755]/20 border-t-[#06C755]"
              />
              <p className="text-sm text-[#616B7A]">กำลังเชื่อมต่อ...</p>
            </>
          ) : null}

          {result.status === "need-login" && (
            <>
              <p className="text-sm text-[#616B7A]">{result.message}</p>
              <Link
                href={signinHref}
                className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-[#101828] px-4 py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.99]"
              >
                เข้าสู่ระบบด้วย Google
              </Link>
            </>
          )}

          {result.status === "success" && (
            <>
              <div className="flex size-14 items-center justify-center rounded-full bg-[#06C755]/10">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#06C755" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p role="status" className="text-sm font-bold text-[#101828]">
                {result.message}
              </p>
              {result.displayName && (
                <p className="text-xs text-[#616B7A]">
                  LINE: {result.displayName}
                </p>
              )}
              <p className="text-[11px] text-[#98A2B3]">
                บอทส่งข้อความยืนยันในแชท LINE แล้วครับ
              </p>
              <Link
                href="/settings/profile"
                className="mt-1 text-sm font-bold text-[#06C755] hover:underline"
              >
                ไปหน้าบัญชีทันที →
              </Link>
            </>
          )}

          {result.status === "error" && (
            <>
              <div className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm font-bold text-red-700">
                  เกิดข้อผิดพลาด
                </p>
                <p role="alert" className="mt-1 text-xs leading-relaxed text-red-700/80">
                  {result.message}
                </p>
              </div>
              <Link
                href="/settings/profile"
                className="text-sm font-bold text-[#06C755] hover:underline"
              >
                กลับไปหน้าบัญชี
              </Link>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-[#98A2B3]">
        ส่งรูปสลิปในแชทบอท แล้ว AI จะลงบัญชีให้อัตโนมัติ
      </p>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-[#F7F8FA] p-6">
          <div
            aria-hidden="true"
            className="size-10 animate-spin rounded-full border-4 border-[#06C755]/20 border-t-[#06C755]"
          />
        </main>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}
