"use server";

import { createClient } from "@/lib/supabase/server";

export async function unlinkLineAccount(): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "ไม่ได้เข้าสู่ระบบ" };

  // กันล็อกตัวเอง: ถ้า LINE เป็นช่องทางเข้าใช้เดียว (ไม่มี Google/อีเมลผูกไว้)
  // ห้ามยกเลิก เพราะจะกลับเข้าระบบไม่ได้อีก
  const { data: identitiesData } = await supabase.auth.getUserIdentities();
  const identities = identitiesData?.identities ?? [];
  const hasNonLineIdentity = identities.some((i) => {
    const provider = (i as { provider?: string }).provider ?? "";
    return !provider.includes("line");
  });
  if (!hasNonLineIdentity) {
    return {
      error:
        "ไม่สามารถยกเลิกได้ เพราะ LINE เป็นช่องทางเข้าใช้เดียวของคุณ — ผูก Google ก่อนแล้วค่อยยกเลิกครับ",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ line_user_id: null })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
