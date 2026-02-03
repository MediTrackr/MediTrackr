"use client";
import Image from "next/image";
import Link from "next/link";
import { Bell, Settings, LogOut, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface Props {
  lang: "fr" | "en";
  onLangChange: (l: "fr" | "en") => void;
}

export default function DashboardHeader({ lang, onLangChange }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [signingOut, setSigningOut] = useState(false);

  function toggleLang() {
    const next = lang === "fr" ? "en" : "fr";
    document.cookie = `lang=${next}; path=/; max-age=31536000`;
    onLangChange(next);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex justify-between items-center border-b border-primary/10 pb-6">
      <div className="flex items-center gap-3">
        <Image
          src="/images/meditrackr logo.png"
          alt="MediTrackr Logo"
          width={40}
          height={40}
          className="object-contain drop-shadow-[0_0_8px_rgba(0,217,255,0.4)]"
        />
        <span className="text-xl font-bold tracking-tight text-glow text-primary">MediTrackr</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 bg-white/5 text-white/50 hover:text-white/90 hover:border-white/20 transition-all"
          title={lang === "fr" ? "Switch to English" : "Passer en français"}
        >
          <Globe className="w-3.5 h-3.5" />
          {lang.toUpperCase()}
        </button>
        <Bell className="w-5 h-5 text-primary cursor-pointer" />
        <Link href="/settings">
          <Settings className="w-5 h-5 text-primary/70 cursor-pointer hover:text-primary transition-colors" />
        </Link>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/20 bg-red-500/5 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all disabled:opacity-40"
        >
          <LogOut className="w-3.5 h-3.5" />
          {signingOut ? "…" : (lang === "fr" ? "Déconnexion" : "Sign out")}
        </button>
      </div>
    </div>
  );
}
