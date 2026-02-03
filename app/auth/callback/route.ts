import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code        = searchParams.get("code");
  const token_hash  = searchParams.get("token_hash");
  const type        = searchParams.get("type");

  const supabase = await createServerSupabaseClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as never,
    });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  } else {
    return NextResponse.redirect(`${origin}/login`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
