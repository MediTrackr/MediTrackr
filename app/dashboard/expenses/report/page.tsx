"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";

interface ExpenseRow { amount?: number; category?: string; [key: string]: unknown; }
interface ClaimRow   { total_claimed?: number; amount_received?: number; service_date?: string; status?: string; }
interface BudgetRow  { id?: string; name?: string; budget_name?: string; category?: string; planned_amount?: number; actual_amount?: number; }

function localDateString(d: Date): string {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

export default function ExpenseReportPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [period, setPeriod]   = useState({ start: "", end: "" });
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [budgets,  setBudgets]  = useState<BudgetRow[]>([]);
  const [claims,   setClaims]   = useState<ClaimRow[]>([]);

  useEffect(() => {
    const now      = new Date();
    const y        = now.getFullYear();
    const m        = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay  = new Date(y, now.getMonth() + 1, 0).getDate();
    const start    = `${y}-${m}-01`;
    const end      = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
    setPeriod({ start, end });
    fetchData(start, end);
  }, []);

  async function fetchData(start: string, end: string) {
    // Clear stale data immediately so the loading state is the only thing visible
    setExpenses([]);
    setClaims([]);
    setBudgets([]);
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Use full-day timestamps to avoid UTC/local timezone shift
      const startTs = `${start}T00:00:00`;
      const endTs   = `${end}T23:59:59`;

      const [expenseRes, budgetRes, claimRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("user_id", user.id)
          .gte("expense_date", startTs).lte("expense_date", endTs),
        supabase.from("budgets").select("*").eq("user_id", user.id),
        supabase.from("ramq_claims").select("total_claimed, amount_received, service_date, status")
          .eq("user_id", user.id).gte("service_date", startTs).lte("service_date", endTs),
      ]);

      setExpenses(expenseRes.data || []);
      setBudgets(budgetRes.data  || []);
      setClaims(claimRes.data    || []);
    } catch (err) {
      setError("Échec du chargement. Vérifiez votre connexion et réessayez.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // All monetary math in cents to avoid floating-point drift
  const totalExpensesCents  = expenses.reduce((s, e) => s + Math.round((e.amount || 0) * 100), 0);
  const totalRevenueCents   = claims.reduce((s, c) => s + Math.round((c.total_claimed  || 0) * 100), 0);
  const totalReceivedCents  = claims.reduce((s, c) => s + Math.round((c.amount_received || 0) * 100), 0);
  const netIncomeCents      = totalReceivedCents - totalExpensesCents;

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
    const cat = (e.category as string) || "Autre";
    acc[cat] = (acc[cat] || 0) + Math.round((e.amount || 0) * 100);
    return acc;
  }, {});

  // Calculate actual spend dynamically from fetched expenses per budget category
  const budgetsWithActual = budgets.map(b => {
    const budgetCategory = (b.category || "").toLowerCase();
    const actual = expenses
      .filter(e => (e.category as string || "").toLowerCase() === budgetCategory)
      .reduce((s, e) => s + Math.round((e.amount || 0) * 100), 0);
    return { ...b, computedActual: actual };
  });

  const handleApply = () => {
    if (period.start && period.end) fetchData(period.start, period.end);
  };

  return (
    <div className="min-h-screen bg-black flex justify-center items-center p-4">
      <div className="w-full max-w-7xl min-h-[95vh] bg-[#050505] rounded-[2.5rem] relative
                      border-[3px] border-black outline outline-2 outline-white/10
                      shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col">

        <div className="relative z-10 m-6 p-6 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl flex justify-between items-center">
          <h1 className="text-2xl font-black text-primary uppercase italic tracking-tighter">Rapport de dépenses</h1>
          <div className="flex gap-3">
            <Button variant="ghost" className="gap-2 text-primary border border-primary/20 bg-black/40 rounded-xl px-4 h-10">
              <Download className="w-4 h-4" /> Exporter PDF
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2 text-white/40 border border-white/10 bg-black/40 rounded-xl px-4 h-10">
                <ArrowLeft className="w-4 h-4" /> Retour
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex-1 mx-6 mb-6 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar p-8 space-y-6">

            {/* Period selector */}
            <div className="card-medical p-4 flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold opacity-40">Du</label>
                <input type="date" value={period.start}
                  onChange={(e) => setPeriod(p => ({ ...p, start: e.target.value }))}
                  className="bg-black/40 border border-white/10 p-2 rounded-xl text-sm text-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-bold opacity-40">Au</label>
                <input type="date" value={period.end}
                  onChange={(e) => setPeriod(p => ({ ...p, end: e.target.value }))}
                  className="bg-black/40 border border-white/10 p-2 rounded-xl text-sm text-white" />
              </div>
              <Button onClick={handleApply} className="bg-primary text-black font-bold rounded-xl h-10 px-4">
                Appliquer
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-sm text-red-400">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center text-white/40 py-12">Chargement du rapport…</div>
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="card-medical p-5 border-l-4 border-primary">
                    <p className="text-[9px] uppercase font-bold text-primary/60 mb-2">Chiffre d&apos;affaires</p>
                    <p className="text-3xl font-bold text-primary">{fmt(totalRevenueCents)}</p>
                  </div>
                  <div className="card-medical p-5 border-l-4 border-green-400">
                    <p className="text-[9px] uppercase font-bold text-green-400/60 mb-2">Revenu perçu</p>
                    <p className="text-3xl font-bold text-green-400">{fmt(totalReceivedCents)}</p>
                  </div>
                  <div className="card-medical p-5 border-l-4 border-blue-400">
                    <p className="text-[9px] uppercase font-bold text-blue-400/60 mb-2">Total dépenses</p>
                    <p className="text-3xl font-bold text-blue-400">{fmt(totalExpensesCents)}</p>
                  </div>
                  <div className={`card-medical p-5 border-l-4 ${netIncomeCents >= 0 ? "border-green-400" : "border-red-400"}`}>
                    <p className="text-[9px] uppercase font-bold opacity-60 mb-2">Revenu net</p>
                    <p className={`text-3xl font-bold ${netIncomeCents >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {fmt(netIncomeCents)}
                    </p>
                  </div>
                </div>

                {/* Expenses by category */}
                {Object.keys(byCategory).length > 0 && (
                  <div className="card-medical p-6 border-l-4 border-primary">
                    <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Dépenses par catégorie</h2>
                    <div className="space-y-3">
                      {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, cents]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="text-sm text-white/80">{cat}</span>
                          <span className="text-sm font-bold text-primary">{fmt(cents)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget vs Actual — computed dynamically from period expenses */}
                {budgetsWithActual.length > 0 && (
                  <div className="card-medical p-6 border-l-4 border-primary">
                    <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Budget vs Réel (période)</h2>
                    <div className="space-y-4">
                      {budgetsWithActual.map((b) => {
                        const plannedCents = Math.round((b.planned_amount || 0) * 100);
                        const actualCents  = b.computedActual;
                        const pct  = plannedCents > 0 ? (actualCents / plannedCents) * 100 : 0;
                        const over = actualCents > plannedCents;
                        return (
                          <div key={b.id} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white/80">{b.budget_name || b.name}</span>
                              <span className={over ? "text-red-400 font-bold" : "text-green-400 font-bold"}>
                                {fmt(actualCents)} / {fmt(plannedCents)}
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
                                Dépassement : {fmt(actualCents - plannedCents)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {expenses.length === 0 && claims.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    Aucune donnée pour cette période.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
