"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const inputCls = "w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40 transition-colors";

  // Supabase sends the recovery token in the URL hash — the client handles it automatically
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    setLoading(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
      setTimeout(() => router.replace("/login"), 2500);
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
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <div>
                <p className="text-white font-bold mb-1">Mot de passe mis à jour</p>
                <p className="text-sm text-white/40">Redirection vers la connexion...</p>
              </div>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <p className="text-sm text-white/40">Vérification du lien de réinitialisation...</p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-bold text-white mb-1">Nouveau mot de passe</h2>
                <p className="text-sm text-white/40">Choisissez un mot de passe sécurisé d&apos;au moins 8 caractères.</p>
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Nouveau mot de passe"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className={inputCls + " pr-10"}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Confirmer le mot de passe"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className={inputCls}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-black font-bold rounded-xl h-11 disabled:opacity-50"
                >
                  {loading ? "Mise à jour..." : "Confirmer le nouveau mot de passe"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
