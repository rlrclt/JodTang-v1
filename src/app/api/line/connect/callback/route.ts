import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://jodtangv1.vercel.app";
  const settingsUrl = `${origin}/settings/profile`;

  // LINE ส่ง error กลับมา (ผู้ใช้กด cancel)
  if (error) {
    return NextResponse.redirect(`${settingsUrl}?line_error=cancelled`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}?line_error=missing_params`);
  }

  // ตรวจ CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("line_connect_state")?.value;
  const userId = cookieStore.get("line_connect_uid")?.value;

  // ลบ cookies ทันที
  cookieStore.delete("line_connect_state");
  cookieStore.delete("line_connect_uid");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${settingsUrl}?line_error=invalid_state`);
  }

  if (!userId) {
    return NextResponse.redirect(`${settingsUrl}?line_error=no_session`);
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID!;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET!;
  const redirectUri = `${origin}/api/line/connect/callback`;

  // 1. แลก code เป็น access_token
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("LINE token exchange failed:", err);
    return NextResponse.redirect(`${settingsUrl}?line_error=token_failed`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.redirect(`${settingsUrl}?line_error=no_access_token`);
  }

  // 2. ดึง LINE Profile ด้วย access_token (ไม่ต้อง verify ID token เอง)
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    console.error("LINE profile fetch failed:", await profileRes.text());
    return NextResponse.redirect(`${settingsUrl}?line_error=profile_failed`);
  }

  const profile = await profileRes.json();
  const lineUserId: string = profile.userId;
  const displayName: string = profile.displayName || "ผู้ใช้งาน";

  if (!lineUserId) {
    return NextResponse.redirect(`${settingsUrl}?line_error=no_line_user_id`);
  }

  // 3. บันทึก line_user_id ลง profiles
  const supabase = getSupabaseAdmin();
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ line_user_id: lineUserId })
    .eq("id", userId);

  if (updateErr) {
    console.error("Failed to update line_user_id:", updateErr);
    return NextResponse.redirect(`${settingsUrl}?line_error=update_failed`);
  }

  // 4. ส่งข้อความยืนยันผ่าน LINE Bot (Push Message)
  const botToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (botToken) {
    try {
      // ดึงชื่อจาก profiles
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      const name = prof?.full_name || displayName;

      await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${botToken}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [
            {
              type: "text",
              text: `🎉 เชื่อมต่อบัญชีสำเร็จเรียบร้อยแล้วครับ!\n\n👤 บัญชี: คุณ ${name}\n📧 อีเมล: ${prof?.email || ""}\n🟢 สถานะ: พร้อมบันทึกสลิปอัตโนมัติ\n\n📸 ส่งรูปสลิปโอนเงิน หรือใบเสร็จเข้ามาในแชทนี้ได้ทันที AI จะช่วยลงบัญชีให้คุณอัตโนมัติครับ ✨`,
            },
          ],
        }),
      });
    } catch (err) {
      console.error("Failed to push LINE connected message:", err);
    }
  }

  // 5. redirect กลับหน้า settings/profile พร้อม success flag
  return NextResponse.redirect(`${settingsUrl}?line_connected=1`);
}
