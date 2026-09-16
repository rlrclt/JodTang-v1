// ค่า Supabase — อ่านจาก env ณ เวลาเรียกใช้ (ไม่ cache ที่ module load)
// ถ้าไม่มีให้เป็น null (ห้าม throw)
function getSupabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

function getSupabasePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? null;
}

// ตรวจสอบว่า Supabase ตั้งค่าแล้วหรือยัง — ใช้ในหน้า/คอมโพเนนต์ต่างๆ
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

// ค่า env สำหรับใช้สร้าง client (อ่านตอนเรียกใช้)
export function getSupabaseEnv() {
  return {
    url: getSupabaseUrl(),
    publishableKey: getSupabasePublishableKey(),
  };
}
