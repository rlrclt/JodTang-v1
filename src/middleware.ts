import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { isPublicPath, isSupabaseConfigured } from "@/lib/middleware-guards";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ข้าม public paths เลย — ไม่ต้องตรวจ session
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ถ้า Supabase ยังไม่ตั้งค่า ปล่อยผ่าน (ไม่ block ตอน dev ยังไม่มี env)
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, supabaseResponse);

  // refresh session — สำคัญมาก: ถ้า session หมดอายุ จะได้ token ใหม่
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // ไม่มี session → redirect ไป /login
  if (!session) {
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
