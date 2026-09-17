import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { replyLineMessage } from "@/lib/line/line-messaging";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createAdminClient(url, key);
}

// callback จาก OAuth provider (Google/LINE) — exchange code for session
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData?.user) {
      const user = sessionData.user;
      const provider = user.app_metadata?.provider || "";
      const userMeta = user.user_metadata || {};

      // ถ้าเป็นการล็อกอิน/เชื่อมต่อผ่าน LINE (custom:line หรือ line)
      if (provider.includes("line")) {
        const lineUserId = userMeta.sub || userMeta.provider_id;
        const displayName = userMeta.full_name || userMeta.name || user.email?.split("@")[0] || "ผู้ใช้งาน";

        if (lineUserId) {
          const admin = getAdmin();
          // อัปเดต line_user_id ลงในตาราง profiles อัตโนมัติทันที
          await admin
            .from("profiles")
            .update({ line_user_id: lineUserId })
            .eq("id", user.id);

          // ส่งข้อความแจ้งเตือนหาผู้ใช้ใน LINE ทันที (ถ้าตั้งค่า Token ไว้)
          const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
          if (token) {
            try {
              await fetch("https://api.line.me/v2/bot/message/push", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  to: lineUserId,
                  messages: [
                    {
                      type: "text",
                      text: `🎉 เชื่อมต่อบัญชีสำเร็จเรียบร้อยแล้วครับ!\n\n👤 บัญชี: คุณ ${displayName}\n🟢 สถานะ: เชื่อมต่อกับ JodTang แล้ว\n\n📸 ส่งรูปสลิปหรือใบเสร็จเข้ามาในแชทนี้ได้ทันที AI จะช่วยบันทึกรายรับ-รายจ่ายให้คุณอัตโนมัติครับ ✨`,
                    },
                  ],
                }),
              });
            } catch (err) {
              console.error("Failed to push LINE connected message:", err);
            }
          }
        }
      }

      // redirect ไปหน้าที่ต้องการ (ถ้ามาจากหน้า profile ให้กลับไปที่ profile)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // code หมดอายุ หรือ error → กลับ /login พร้อม error message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
