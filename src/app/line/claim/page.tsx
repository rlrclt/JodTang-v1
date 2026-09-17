"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { claimLineLinkToken } from "../actions";

/**
 * Claim Page — หน้าเว็บบนเบราว์เซอร์ปกติ หลัง LIFF redirect กลับมา
 * URL: /line/claim?token=xxx
 *
 * - ยังไม่ล็อกอินเว็บ → ปุ่มไป /auth/signin พร้อม next กลับมาหน้านี้
 * - ล็อกอินแล้ว → auto-claim token → ผูก line_user_id
 */
function ClaimContent() {
  const searchParams = useSearchParams();
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
          "เชื่อมต่อบัญชี LINE สำเร็จ! ส่งรูปสลิปเข้าแชทบอทได้ทันทีครับ",
        displayName: res.lineDisplayName,
      });
    });
  }, [token]);

  const signinHref = `/auth/signin?provider=google&next=${encodeURIComponent(
    `/line/claim?token=${token}`
  )}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-2">JodTang</h1>
      <p className="text-lg text-text-muted mb-8">เชื่อมต่อบัญชี LINE</p>

      {result.status === "idle" || pending ? (
        <p className="text-sm text-text-muted">กำลังเชื่อมต่อ...</p>
      ) : null}

      {result.status === "need-login" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-text-muted">{result.message}</p>
          <Link
            href={signinHref}
            className="rounded-2xl bg-focus px-6 py-3 text-sm font-bold text-white"
          >
            เข้าสู่ระบบด้วย Google
          </Link>
        </div>
      )}

      {result.status === "success" && (
        <div className="flex flex-col items-center gap-3">
          <p role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-700">
            🎉 {result.message}
          </p>
          {result.displayName && (
            <p className="text-xs text-text-muted">LINE: {result.displayName}</p>
          )}
          <Link
            href="/settings/profile"
            className="text-sm font-bold text-focus hover:underline"
          >
            กลับไปหน้าบัญชี
          </Link>
        </div>
      )}

      {result.status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700">
            ❌ {result.message}
          </p>
          <Link
            href="/settings/profile"
            className="text-sm font-bold text-focus hover:underline"
          >
            กลับไปหน้าบัญชี
          </Link>
        </div>
      )}
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-8">
          <p className="text-sm text-text-muted">กำลังโหลด...</p>
        </main>
      }
    >
      <ClaimContent />
    </Suspense>
  );
}
