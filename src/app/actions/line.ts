"use server";

import { createClient } from "@/lib/supabase/server";

export async function unlinkLineAccount(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  const { error } = await supabase
    .from("profiles")
    .update({ line_user_id: null })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
