"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileName(
  newName: string
): Promise<{ success?: boolean; error?: string }> {
  const trimmed = newName.trim();
  if (!trimmed) {
    return { error: "ชื่อต้องไม่ว่างเปล่า" };
  }
  if (trimmed.length > 50) {
    return { error: "ชื่อต้องมีความยาวไม่เกิน 50 ตัวอักษร" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "ไม่ได้เข้าสู่ระบบ" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/settings/profile");
  return { success: true };
}
