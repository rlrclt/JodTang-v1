"use server";

import { redirect } from "next/navigation";

export async function signOut() {
  const { createClient } = await import("@/lib/supabase/server");
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // signOut อาจ fail ถ้า session หมดอายุ/ไม่มี → ไม่ต้อง throw 500
    // ปล่อยผ่านแล้ว redirect ไป /login เหมือนเดิม
  }
  redirect("/login");
}
