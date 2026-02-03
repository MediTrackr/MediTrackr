import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Supabase sends the OAuth code to the site root when the redirect URL
  // isn't whitelisted. Catch it here and forward to the real callback handler.
  if (pathname === "/" && (search.includes("code=") || search.includes("token_hash="))) {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.search = search;
    return NextResponse.redirect(callbackUrl);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
