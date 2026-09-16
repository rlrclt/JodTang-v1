import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// route สำหรับเริ่ม OAuth flow — redirect ไป providerauthorize endpoint
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider) {
    return NextResponse.redirect(`${origin}/login?error=missing_provider`);
  }

  const supabase = await createClient();

  // callback URL ชี้กลับมาที่ /auth/callback
  const callbackUrl = `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as any,
    options: {
      redirectTo: callbackUrl,
    },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth_init_failed`);
  }

  return NextResponse.redirect(data.url);
}
