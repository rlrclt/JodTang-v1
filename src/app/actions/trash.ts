"use server";

/**
 * server actions ของถังขยะ — ไฟล์นี้เท่านั้น (one writer per file)
 *
 * หน้าที่: กู้คืน (deleted_at = null) + ลบถาวร (DELETE จริง)
 * การ list รายการแยกไป trash-list.ts เพื่อลดขนาดไฟล์และแยกหน้าที่ชัด
 *
 * กติกา (จาก .hermes.md และสเปกการ์ด):
 * - ใช้ session client (@supabase/ssr) — ไม่ bypass RLS เด็ดขาด
 *   (ข้อมูลเป็นของใคร RLS ตัดสิน ไม่ใช่โค้ดหน้า action)
 * - ลบถาวร = DELETE จริง แต่ทำได้เฉพาะแถวของตัวเอง (RLS transactions_delete_own)
 * - ห้ามรับ user_id จาก caller — ใช้ auth.uid() จาก session เท่านั้น
 *   (พิสูจน์ด้วยเทสต์เชิงลบ: user B ลบ/กู้คืนของ user A ไม่ได้)
 */

import { createClient } from "@/lib/supabase/server";

type ActionError = { error: string };
type ActionSuccess<T> = { data: T };
type ActionResult<T> = ActionError | ActionSuccess<T>;

/**
 * กู้คืน — ตั้ง deleted_at = null เฉพาะแถวของผู้ใช้เอง
 * RLS กัน update ของคนอื่น (พิสูจน์ด้วยเทสต์ negative)
 */
export async function restoreFromTrash(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("transactions")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .not("deleted_at", "is", null) // กู้คืนได้เฉพาะที่อยู่ในถังขยะจริง
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { data: data as { id: string } };
}

/**
 * ลบถาวร — DELETE จริง เฉพาะแถวของผู้ใช้เอง
 * RLS ของ_transactions_delete_own ทำงานเป็นด่านที่สอง
 * (ถึงแม้ caller จะผ่าน id ของคนอื่นมา ก็ลบได้ 0 แถว)
 */
export async function deleteForever(
  id: string
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { data: data as { id: string } };
}
