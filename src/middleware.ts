import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import {
  isPublicPath,
  isSupabaseConfigured,
  validateSessionResult,
} from "@/lib/middleware-guards";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ปล่อยผ่าน Webhook และ Public paths ทันที — ห้ามติด Redirect เด็ดขาด
  if (pathname.startsWith("/api/line/webhook") || pathname.startsWith("/api/line/connect") || isPublicPath(pathname)) {
    return NextResponse.next();
  }
  // ถ้า Supabase ยังไม่ตั้งค่า ปล่อยผ่าน (ไม่ block ตอน dev ยังไม่มี env)
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, supabaseResponse);

  // D1 fix: ใช้ getUser() แทน getSession()
  // getUser() validate JWT server-side (กัน session หมดอายุ / JWT ถูกดัดแปลง)
  // getSession() อ่านจาก cookie เฉยๆ — ไม่ validate อะไรเลย
  const { data, error } = await supabase.auth.getUser();

  // ไม่มี user หรือมี error → redirect ไป /login
  if (!validateSessionResult({ data, error })) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
