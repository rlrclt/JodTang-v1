import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./config";

// สร้าง Supabase client สำหรับฝั่ง browser (Client Component)
// ถ้า env ยังไม่ตั้งค่า จะ return client ที่ไม่เชื่อมต่อ (ไม่ throw)
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(
    url ?? "https://placeholder.supabase.co",
    publishableKey ?? "placeholder-publishable-key"
  );
}
