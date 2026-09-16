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

// D1 — providers ที่อนุญาตให้ใช้ OAuth sign-in (sync กับ PROVIDERS ใน login/page.tsx)
export const ALLOWED_OAUTH_PROVIDERS = ["google"] as const;

export function isValidOAuthProvider(provider: string): boolean {
  return (ALLOWED_OAUTH_PROVIDERS as readonly string[]).includes(provider);
}

// D1 — ตรวจสอบ getUser() result: ต้องมี user และไม่มี error
// ใช้ getUser() แทน getSession() เพื่อ validate JWT server-side
export function validateSessionResult(result: {
  data: { user: unknown };
  error: unknown;
}): boolean {
  return !result.error && Boolean(result.data?.user);
}

// middleware config สำหรับ Next.js — export แยกเพื่อทดสอบได้
export const middlewareConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
