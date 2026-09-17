"use server";

import { createClient } from "@/lib/supabase/server";

export async function resetUserData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ไม่ได้เข้าสู่ระบบ" };
  }

  // ลบข้อมูลทั้งหมดของผู้ใช้ตามลำดับ FK constraints (transactions -> budgets -> categories -> accounts)
  const { error: txErr } = await supabase
    .from("transactions")
    .delete()
    .eq("user_id", user.id);

  if (txErr) return { error: txErr.message };

  const { error: bgErr } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id);

  if (bgErr) return { error: bgErr.message };

  const { error: catErr } = await supabase
    .from("categories")
    .delete()
    .eq("user_id", user.id);

  if (catErr) return { error: catErr.message };

  const { error: accErr } = await supabase
    .from("accounts")
    .delete()
    .eq("user_id", user.id);

  if (accErr) return { error: accErr.message };

  // ใส่หมวดหมู่เริ่มต้นกลับเข้าไปใหม่
  const defaultCategories = [
    { user_id: user.id, name: "เงินเดือน", kind: "income", icon: "briefcase#teal" },
    { user_id: user.id, name: "รายได้เสริม", kind: "income", icon: "more#teal" },
    { user_id: user.id, name: "โบนัส", kind: "income", icon: "gift#amber" },
    { user_id: user.id, name: "ดอกเบี้ย", kind: "income", icon: "briefcase#sky" },
    { user_id: user.id, name: "อื่น ๆ", kind: "income", icon: "more#graphite" },
    { user_id: user.id, name: "อาหาร", kind: "expense", icon: "utensils#tomato" },
    { user_id: user.id, name: "เดินทาง", kind: "expense", icon: "bus#sky" },
    { user_id: user.id, name: "ช้อปปิ้ง", kind: "expense", icon: "cart#fuchsia" },
    { user_id: user.id, name: "ที่อยู่อาศัย", kind: "expense", icon: "home#amber" },
    { user_id: user.id, name: "สุขภาพ", kind: "expense", icon: "heart#lime" },
    { user_id: user.id, name: "การศึกษา", kind: "expense", icon: "book#indigo" },
    { user_id: user.id, name: "บันเทิง", kind: "expense", icon: "game#fuchsia" },
    { user_id: user.id, name: "ของใช้ส่วนตัว", kind: "expense", icon: "gift#teal" },
    { user_id: user.id, name: "บิลและสาธารณูปโภค", kind: "expense", icon: "more#amber" },
    { user_id: user.id, name: "อื่น ๆ", kind: "expense", icon: "more#graphite" },
  ];

  await supabase.from("categories").insert(defaultCategories);

  return { success: true };
}
