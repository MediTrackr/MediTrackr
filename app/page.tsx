import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HomeClient from "./_home";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; token_hash?: string; type?: string }>;
}) {
  const params = await searchParams;

  // Auth params must be handled by the Route Handler (/auth/callback) which
  // can write session cookies. Server Components are read-only for cookies.
  if (params.code || params.token_hash) {
    const sp = new URLSearchParams();
    if (params.code)        sp.set("code", params.code);
    if (params.token_hash)  sp.set("token_hash", params.token_hash);
    if (params.type)        sp.set("type", params.type);
    redirect(`/auth/callback?${sp.toString()}`);
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value === "en" ? "en" : "fr";
  return <HomeClient initialLang={lang} />;
}
