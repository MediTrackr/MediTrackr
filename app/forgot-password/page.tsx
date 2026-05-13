"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

const T = {
  fr: {
    title: "Mot de passe oublié",
    desc: "Entrez votre courriel pour recevoir un lien de réinitialisation.",
    emailPh: "votre@courriel.com",
    send: "Envoyer le lien",
    sending: "Envoi en cours...",
    backToLogin: "Retour à la connexion",
    sentTitle: "Lien envoyé",
    sentDesc: "Vérifiez votre courriel pour le lien de réinitialisation.",
  },
  en: {
    title: "Forgot password",
    desc: "Enter your email to receive a reset link.",
    emailPh: "your@email.com",
    send: "Send link",
    sending: "Sending...",
    backToLogin: "Back to login",
    sentTitle: "Link sent",
    sentDesc: "Check your email for the reset link.",
  },
} as const;

export default function ForgotPassword() {
  const supabase = createClient();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = document.cookie.split("; ").find(r => r.startsWith("lang="))?.split("=")[1];
    if (stored === "en") setLang("en");
  }, []);

  const t = T[lang];
  const inputCls = "w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors";

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <Image src="/images/meditrackr logo.png" alt="MediTrackr" width={64} height={64} className="relative drop-shadow-[0_0_12px_rgba(255,165,0,0.4)]" />
          </div>
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">MediTrackr</h1>
        </div>

        <div className="bg-[#050505] rounded-[2rem] border border-white/8 shadow-[0_0_60px_rgba(0,0,0,0.8)] p-6 sm:p-8 flex flex-col gap-5">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <div>
                <p className="text-white font-bold mb-1">{t.sentTitle}</p>
                <p className="text-sm text-white/40">{t.sentDesc}</p>
              </div>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full border-white/10 text-white/60 hover:text-white rounded-xl">
                  {t.backToLogin}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">{t.title}</h2>
                <p className="text-sm text-white/40">{t.desc}</p>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
              )}

              <form onSubmit={handleReset} className="flex flex-col gap-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="email"
                    placeholder={t.emailPh}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={inputCls + " pl-10"}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-black font-bold rounded-xl h-11 disabled:opacity-50"
                >
                  {loading ? t.sending : t.send}
                </Button>
              </form>

              <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors">
                <ArrowLeft className="w-4 h-4" /> {t.backToLogin}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
