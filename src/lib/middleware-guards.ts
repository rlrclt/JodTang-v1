// middleware logic ที่แยกออกจาก Next.js runtime — ทดสอบได้ด้วย node --test

// PWA paths ต้องเข้าถึงได้ offline — ไม่ต้องมี session
export const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/signin",
  "/offline",
  "/manifest.webmanifest",
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

// middleware config สำหรับ Next.js — export แยกเพื่อทดสอบได้
export const middlewareConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
