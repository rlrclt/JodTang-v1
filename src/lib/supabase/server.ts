import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./config";

// สร้าง Supabase client สำหรับฝั่ง server (Server Component / Route Handler)
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(
    url ?? "https://placeholder.supabase.co",
    publishableKey ?? "placeholder-publishable-key",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll ถูกเรียกจาก Server Component — ไม่เป็นไร ปล่อยผ่าน
          }
        },
      },
    }
  );
}
