"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, TrendingUp, TrendingDown } from "lucide-react";

interface Budget {
  id: string;
  budget_name?: string;
  period_start?: string;
  period_end?: string;
  category?: string;
  planned_amount: number;
  actual_amount?: number;
  notes?: string;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ViewBudgetsPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBudgets(); }, []);

  async function fetchBudgets() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("period_start", { ascending: false });

      if (data) setBudgets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] opacity-5">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" className="text-primary"/>
              <path d="M100 40 L100 100 L140 100" stroke="currentColor" strokeWidth="3" className="text-primary"/>
            </svg>
          </div>
        </div>

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Budgets</h1>
          <div className="flex gap-3">
            <Link href="/dashboard/budget/new">
              <Button className="gap-2 bg-primary text-black rounded-xl px-4 h-10 font-bold">
                <Plus className="w-4 h-4" /> Nouveau budget
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-4 h-10">
                <ArrowLeft className="w-4 h-4" /> Retour
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8">

            {loading ? (
              <div className="text-center text-white/40 py-12">Chargement…</div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 mb-4">Aucun budget créé</p>
                <Link href="/dashboard/budget/new">
                  <Button className="bg-primary text-black">Créer un budget</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.map((budget) => {
                  const actual  = budget.actual_amount || 0;
                  const planned = budget.planned_amount || 0;
                  const pct     = planned > 0 ? (actual / planned) * 100 : 0;
                  const over    = actual > planned;
                  const overage = actual - planned;

                  return (
                    <div key={budget.id} className={`card-medical p-6 border-l-4 transition-all ${over ? "border-red-500" : "border-primary"}`}>
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">{budget.budget_name || "—"}</h3>
                            <p className="text-xs text-white/40">
                              {fmtDate(budget.period_start)} — {fmtDate(budget.period_end)} · {budget.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase font-bold text-white/30 mb-1">Réel / Planifié</p>
                            <p className={`text-2xl font-bold ${over ? "text-red-400" : "text-green-400"}`}>
                              ${actual.toFixed(2)}
                            </p>
                            <p className="text-sm text-white/50">/ ${planned.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-white/40">Progression</span>
                            <span className={`font-bold ${over ? "text-red-400" : "text-green-400"}`}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full transition-all ${over ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-green-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          {over && (
                            <p className="text-[10px] text-red-400">
                              Dépassement : ${overage.toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {over ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-red-400" />
                              <span className="text-xs text-red-400 font-medium">Dépassement de budget</span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4 text-green-400" />
                              <span className="text-xs text-green-400 font-medium">Dans les limites</span>
                            </>
                          )}
                        </div>

                        {budget.notes && (
                          <div className="pt-3 border-t border-white/5">
                            <p className="text-xs text-white/40">{budget.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
