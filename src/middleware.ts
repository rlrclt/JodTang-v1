import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import {
  isPublicPath,
  isSupabaseConfigured,
  validateSessionResult,
} from "@/lib/middleware-guards";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // ปล่อยผ่าน Webhook, Public paths และ Next.js prefetch request ทันที
  if (
    pathname.startsWith("/api/line/webhook") ||
    pathname.startsWith("/api/line/connect") ||
    isPublicPath(pathname)
  ) {
    return NextResponse.next();
  }

  // ถ้า Supabase ยังไม่ตั้งค่า ปล่อยผ่าน (ไม่ block ตอน dev ยังไม่มี env)
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  // ตรวจหา Supabase Auth Cookie อย่างรวดเร็ว (Fast Path: Zero Network Overhead)
  // ถ้าไม่มี Cookie ยืนยันตัวตนเลย ให้ redirect ไป /login ทันทีโดยไม่ต้องยิงไป Supabase
  const allCookies = request.cookies.getAll();
  const hasAuthToken = allCookies.some((c) =>
    c.name.includes("-auth-token") || c.name.startsWith("sb-")
  );

  if (!hasAuthToken) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // สำหรับ Next.js Prefetch requests (headers มี purpose = prefetch หรือ x-nextjs-data)
  // ให้ผ่านได้ทันทีโดยไม่ต้องบล็อกรอ getUser() คุยข้ามทวีป ช่วยให้แท็บและปุ่ม prefetch ได้ใน 0ms
  const isPrefetch =
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("x-purpose") === "prefetch" ||
    request.headers.get("sec-purpose") === "prefetch";

  if (isPrefetch) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, supabaseResponse);

  // Validate session ด้วย getUser()
  const { data, error } = await supabase.auth.getUser();

  // ไม่มี user หรือมี error → redirect ไป /login
  if (!validateSessionResult({ data, error })) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
