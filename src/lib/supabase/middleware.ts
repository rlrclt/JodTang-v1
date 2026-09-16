import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./config";
import type { NextRequest, NextResponse } from "next/server";

// สร้าง Supabase client สำหรับ middleware — ใช้ request/response cookies
// pattern จาก @supabase/ssr docs สำหรับ Next.js middleware
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(
    url ?? "https://placeholder.supabase.co",
    publishableKey ?? "placeholder-publishable-key",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}
