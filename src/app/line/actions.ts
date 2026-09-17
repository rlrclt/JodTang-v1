"use server";

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

/**
 * Server Actions สำหรับ LINE LIFF link flow (พอร์ตจาก ANT-Elibary)
 * - createLineLinkToken: LIFF (/line/link) เรียกหลัง liff.getProfile()
 * - claimLineLinkToken: ผู้ใช้ที่ล็อกอินเว็บแล้วเอา token มาแลก line_user_id
 *
 * ใช้ service_role (bypass RLS) เพราะตาราง line_link_tokens ไม่มี public policy
 * ไม่ใช้ LINE Login OAuth — จึงไม่ต้องมี LINE_LOGIN_CHANNEL_ID/SECRET
 */

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const MISSING_CONFIG_ERROR =
  "เซิร์ฟเวอร์ยังไม่ตั้งค่า Supabase ฝั่ง server (SUPABASE_SECRET_KEY) ติดต่อแอดมินครับ";

/** สร้าง token ใช้ครั้งเดียว อายุ 10 นาที — เก็บ line_user_id จาก LIFF */
export async function createLineLinkToken(
  lineUserId: string,
  lineDisplayName?: string
): Promise<{ token?: string; error?: string }> {
  if (!lineUserId) return { error: "ไม่พบ LINE userId" };

  const admin = getAdmin();
  if (!admin) return { error: MISSING_CONFIG_ERROR };

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  try {
    const { error } = await admin.from("line_link_tokens").insert({
      token,
      line_user_id: lineUserId,
      line_display_name: lineDisplayName ?? null,
      expires_at: expiresAt,
    });

    if (error) return { error: error.message };
    return { token };
  } catch (err: any) {
    return { error: err?.message ?? "สร้าง token ไม่สำเร็จ" };
  }
}

/** ผู้ใช้ที่ล็อกอินเว็บแล้ว เอา token มาแลกเพื่อผูก line_user_id เข้าบัญชีตัวเอง */
export async function claimLineLinkToken(
  token: string
): Promise<{ error?: string; lineDisplayName?: string }> {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบก่อน" };

  const clean = token.trim();
  if (!clean) return { error: "ไม่พบ token" };

  const admin = getAdmin();
  if (!admin) return { error: MISSING_CONFIG_ERROR };

  try {
    const { data: linkRow, error: findErr } = await admin
      .from("line_link_tokens")
      .select("id, line_user_id, line_display_name, expires_at, used_at")
      .eq("token", clean)
      .is("used_at", null)
      .maybeSingle();

    if (findErr || !linkRow) {
      return { error: "token ไม่ถูกต้องหรือถูกใช้แล้ว" };
    }

    if (new Date(linkRow.expires_at).getTime() < Date.now()) {
      return { error: "token หมดอายุแล้ว กรุณาเริ่มใหม่ผ่าน LINE" };
    }

    // กัน LINE นี้ถูกผูกกับบัญชีอื่นแล้ว
    const { data: existing } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("line_user_id", linkRow.line_user_id)
      .maybeSingle();

    if (existing && existing.id !== user.id) {
      return {
        error: `LINE นี้ถูกเชื่อมกับบัญชี "${existing.full_name ?? "อื่น"}" แล้ว`,
      };
    }

    const { error: updateErr } = await admin
      .from("profiles")
      .update({ line_user_id: linkRow.line_user_id })
      .eq("id", user.id);

    if (updateErr) return { error: updateErr.message };

    await admin
      .from("line_link_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", linkRow.id);

    // ส่งข้อความยืนยันเข้าแชท LINE (best-effort — push พังต้องไม่ทำให้ claim ล้ม)
    // แนบข้อมูลบัญชี Google ที่ผูกไว้ให้ผู้ใช้ตรวจว่าถูกบัญชีจริง
    const displayName = linkRow.line_display_name ?? "ผู้ใช้งาน";
    const botToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (botToken) {
      try {
        const { data: prof } = await admin
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        const accountLine = prof?.email
          ? `📧 บัญชีที่เชื่อม: ${prof.email}${prof.full_name ? `\n👤 ชื่อในระบบ: ${prof.full_name}` : ""}`
          : null;

        await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${botToken}`,
          },
          body: JSON.stringify({
            to: linkRow.line_user_id,
            messages: [
              {
                type: "text",
                text: `🎉 เชื่อมต่อบัญชีสำเร็จเรียบร้อยแล้วครับ!\n\n💬 LINE: คุณ ${displayName}\n${accountLine ? `${accountLine}\n` : ""}🟢 สถานะ: พร้อมบันทึกสลิปอัตโนมัติ\n\n✅ กรุณาตรวจว่าอีเมลข้างบนเป็นบัญชีของคุณ ถ้าไม่ใช่ กดยกเลิกในหน้าโปรไฟล์แล้วเชื่อมใหม่ครับ\n\n📸 ส่งรูปสลิปโอนเงิน หรือใบเสร็จเข้ามาในแชทนี้ได้ทันที AI จะช่วยลงบัญชีให้คุณอัตโนมัติครับ ✨`,
              },
            ],
          }),
        });
      } catch (err) {
        console.error("Failed to push LINE connected message:", err);
      }
    }

    return { lineDisplayName: linkRow.line_display_name ?? undefined };
  } catch (err: any) {
    return { error: err?.message ?? "เชื่อมต่อไม่สำเร็จ" };
  }
}
