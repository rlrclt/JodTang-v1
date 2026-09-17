import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// เริ่ม LINE Login OAuth flow — redirect ไปหน้า LINE Login
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data?.user) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://jodtangv1.vercel.app";
    return NextResponse.redirect(`${origin}/login`);
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://jodtangv1.vercel.app";
    return NextResponse.redirect(`${origin}/settings/profile?line_error=missing_line_config`);
  }

  // สร้าง state เพื่อป้องกัน CSRF + เก็บ user id
  // secure ต้องเปิดเฉพาะ production — บน http://localhost cookie แบบ secure จะไม่ถูกส่ง
  // กลับมาจน callback เจอ invalid_state ตลอด
  const isProd = process.env.NODE_ENV === "production";
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("line_connect_state", state, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 300, // 5 นาที
    path: "/",
  });
  // เก็บ user id ไว้ใน cookie เพื่อใช้ตอน callback
  cookieStore.set("line_connect_uid", data.user.id, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://jodtangv1.vercel.app";
  const redirectUri = `${origin}/api/line/connect/callback`;

  const authUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", channelId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "openid profile");
  authUrl.searchParams.set("bot_prompt", "aggressive");

  return NextResponse.redirect(authUrl.toString());
}
