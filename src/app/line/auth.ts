"use server";

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * ดำเนินการล็อกอินผ่าน LINE LIFF
 * 1. ตรวจสอบว่า lineUserId นี้ผูกกับบัญชีผู้ใช้คนไหนใน profiles
 * 2. ถ้าผูกไว้แล้ว ➔ สร้าง Magic Link เพื่อให้เบราว์เซอร์รับ Session ของบัญชีเดิมทันที
 * 3. ถ้ายังไม่เคยผูก ➔ แจ้งเตือนว่าต้องเข้าสู่ระบบด้วย Google ก่อนเพื่อเชื่อมต่อในครั้งแรก (หรือสร้างบัญชีใหม่)
 */
export async function authenticateWithLine(lineUserId: string, lineDisplayName?: string): Promise<{
  redirectUrl?: string;
  error?: string;
  needsLink?: boolean;
}> {
  if (!lineUserId) {
    return { error: "ไม่พบรหัสประจำตัว LINE (LINE User ID)" };
  }

  const admin = getAdmin();
  if (!admin) {
    return { error: "เซิร์ฟเวอร์ยังไม่ได้ตั้งค่าสิทธิ์ Admin" };
  }

  try {
    // 1. ค้นหาในตาราง profiles ว่า line_user_id นี้ตรงกับบัญชีไหน
    const { data: profile, error: findErr } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("line_user_id", lineUserId)
      .maybeSingle();

    if (findErr) {
      return { error: findErr.message };
    }

    // กรณีที่ 1: พบบัญชีที่เคยเชื่อมต่อ LINE ไว้แล้ว ➔ ออก Login Session ให้บัญชีนั้นทันที
    if (profile && profile.email) {
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100";
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: profile.email,
        options: {
          redirectTo: `${origin}/`,
        },
      });

      if (linkErr || !linkData?.properties?.action_link) {
        return { error: linkErr?.message || "สร้างการเชื่อมต่อเซสชันไม่สำเร็จ" };
      }

      return { redirectUrl: linkData.properties.action_link };
    }

    // กรณีที่ 2: เป็น LINE ที่ยังไม่เคยผูกกับบัญชีใดเลย
    return {
      needsLink: true,
      error: "บัญชี LINE นี้ยังไม่ได้เชื่อมต่อกับระบบ กรุณาเข้าสู่ระบบด้วย Google แล้วไปที่หน้าตั้งค่า เพื่อกดเชื่อมต่อ LINE ในครั้งแรกครับ",
    };
  } catch (err: any) {
    return { error: err?.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE" };
  }
}
