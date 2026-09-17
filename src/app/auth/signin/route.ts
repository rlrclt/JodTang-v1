import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidOAuthProvider } from "@/lib/middleware-guards";

// route สำหรับเริ่ม OAuth flow — redirect ไป provider authorize endpoint
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const provider = searchParams.get("provider");
  const next = searchParams.get("next") ?? "/";

  if (!provider) {
    return NextResponse.redirect(`${origin}/login?error=missing_provider`);
  }

  // D4 fix: ตรวจ allow-list ก่อนส่งไป GoTrue — กัน bogus / custom provider
  if (!isValidOAuthProvider(provider)) {
    return NextResponse.redirect(`${origin}/login?error=unknown_provider`);
  }

  const supabase = await createClient();
  // callback URL ชี้กลับมาที่ /auth/callback
  const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  // Supabase Custom OIDC provider ต้องส่งในรูปแบบ "custom:identifier" เช่น "custom:line"
  const oauthProvider = provider === "line" ? "custom:line" : provider;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: oauthProvider as any,
    options: {
      redirectTo: callbackUrl,
      scopes: provider === "line" ? "openid profile email" : undefined,
    },
  });

  if (error || !data?.url) {
    console.error("signInWithOAuth error:", error);
    return NextResponse.redirect(`${origin}/login?error=oauth_init_failed`);
  }

  return NextResponse.redirect(data.url);
}
