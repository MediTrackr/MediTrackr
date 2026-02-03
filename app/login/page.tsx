"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, LogIn } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputCls = "w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors";

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setError(signInError.message); return; }
      router.refresh();
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) { setError(oauthError.message); setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <Image src="/images/meditrackr logo.png" alt="MediTrackr" width={64} height={64} className="relative drop-shadow-[0_0_12px_rgba(255,165,0,0.4)]" />
          </div>
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">MediTrackr</h1>
          <p className="text-xs text-white/30 mt-1">Connexion à votre espace</p>
        </div>

        {/* Card */}
        <div className="bg-[#050505] rounded-[2rem] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-6 sm:p-8 flex flex-col gap-5">

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-40"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[10px] uppercase font-bold text-white/20 tracking-widest">ou</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-white/35 tracking-wide">Courriel</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={inputCls}
                placeholder="vous@exemple.com"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase font-bold text-white/35 tracking-wide">Mot de passe</label>
                <Link href="/forgot-password" className="text-[10px] text-primary/60 hover:text-primary transition-colors">
                  Mot de passe oublié?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className={inputCls + " pr-11"}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-black font-black h-12 rounded-xl uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(255,165,0,0.25)] transition-all active:scale-95 disabled:opacity-40 gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Connexion...
                </span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Se connecter
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-white/30">
            Pas encore de compte?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80 font-bold transition-colors">
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] text-white/15 mt-6">
          MediTrackr · Gestion médicale canadienne
        </p>
      </div>
    </main>
  );
}
