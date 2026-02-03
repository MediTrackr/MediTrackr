"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react";

export default function SignUp() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const inputCls = "w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors";

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpError) { setError(signUpError.message); return; }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setLoading(true);
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) { setError(oauthError.message); setLoading(false); }
  }

  if (sent) return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#050505] rounded-[2rem] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-8 flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
          <CheckCircle2 className="relative w-16 h-16 text-primary drop-shadow-[0_0_12px_rgba(255,165,0,0.5)]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">Vérifiez vos courriels</h2>
          <p className="text-sm text-white/40 leading-relaxed">
            Un lien de confirmation a été envoyé à <span className="text-white/70 font-medium">{email}</span>. Cliquez dessus pour activer votre compte.
          </p>
        </div>
        <Link href="/login" className="text-xs text-primary hover:text-primary/80 transition-colors font-bold">
          Retour à la connexion
        </Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">

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
          <p className="text-xs text-white/30 mt-1">Créer votre espace clinique</p>
        </div>

        {/* Card */}
        <div className="bg-[#050505] rounded-[2rem] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-6 sm:p-8 flex flex-col gap-5">

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleSignup}
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
          <form onSubmit={handleEmailSignup} className="flex flex-col gap-4">
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
              <label className="text-[10px] uppercase font-bold text-white/35 tracking-wide">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className={inputCls + " pr-11"}
                  placeholder="8 caractères minimum"
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
                  Création...
                </span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Créer mon compte
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-white/30">
            Déjà un compte?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-bold transition-colors">
              Se connecter
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
