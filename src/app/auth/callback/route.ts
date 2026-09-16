import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// callback จาก OAuth provider (Google/LINE) — exchange code for session
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // redirect ไปหน้าที่ต้องการ (ค่าเริ่มต้น = /)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // code หมดอายุ หรือ error → กลับ /login พร้อม error message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
